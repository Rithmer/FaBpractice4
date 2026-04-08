const express = require('express');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const vapidKeys = {
  publicKey: 'BNSzB_cYrPRpiwP67-Q4nyu81mZHlq-acMcO0oo5m-yve3maWH0NlkN7Ht9YpNXwFk-tZB2B5UhfYNWW3YQyG_c',
  privateKey: 'LrW4c3ShUQytys1hWfolBYPeASRX1Cyxh99VNI0yKWA'
};
webpush.setVapidDetails(
  'mailto:student@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));
let subscriptions = [];
const reminders = new Map();
function sendPushToAll(payload) {
  subscriptions.forEach((sub) => {
    webpush.sendNotification(sub, payload).catch((err) => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log('Удалена неактивная подписка:', sub.endpoint);
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
      } else {
        console.error('Push error:', err.statusCode, err.message || err);
      }
    });
  });
}
function scheduleReminder({ id, text, reminderTime }) {
  const delay = reminderTime - Date.now();
  if (delay <= 0) {
    console.warn('Reminder skipped because reminderTime is not in the future', { id, reminderTime });
    return false;
  }
  if (reminders.has(id)) {
    clearTimeout(reminders.get(id).timeoutId);
  }
  const timeoutId = setTimeout(() => {
    const notificationData = {
      title: '!!! Напоминание',
      body: text,
      reminderId: id
    };
    const payload = JSON.stringify(notificationData);
    io.emit('reminderDue', notificationData);
    sendPushToAll(payload);
    setTimeout(() => {
      reminders.delete(id);
    }, 2 * 60 * 1000);
  }, delay);
  reminders.set(id, { timeoutId, text, reminderTime });
  return true;
}
function resolveCertFiles(baseDir) {
  const variants = [
    { cert: 'localhost.pem', key: 'localhost-key.pem' },
    { cert: 'localhost+2.pem', key: 'localhost+2-key.pem' }
  ];
  for (const variant of variants) {
    const certPath = path.join(baseDir, variant.cert);
    const keyPath = path.join(baseDir, variant.key);
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return { certPath, keyPath };
    }
  }
  return null;
}
const certFiles = resolveCertFiles(__dirname);
if (!certFiles) {
  console.error('Не найдены SSL сертификат и ключ.');
  console.error('Ожидались файлы localhost.pem + localhost-key.pem или localhost+2.pem + localhost+2-key.pem.');
  process.exit(1);
}
const server = https.createServer(
  {
    cert: fs.readFileSync(certFiles.certPath),
    key: fs.readFileSync(certFiles.keyPath)
  },
  app
);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
io.on('connection', (socket) => {
  console.log('Клиент подключен:', socket.id);
  socket.on('newTask', (task) => {
    io.emit('taskAdded', task);
    const payload = JSON.stringify({
      title: 'Новая задача',
      body: task.text
    });
    sendPushToAll(payload);
  });
  socket.on('newReminder', (reminder) => {
    const id = Number(reminder && reminder.id);
    const text = reminder && reminder.text;
    const reminderTime = Number(reminder && reminder.reminderTime);
    if (!id || !text || !reminderTime) {
      return;
    }
    scheduleReminder({ id, text, reminderTime });
  });
  socket.on('disconnect', () => {
    console.log('Клиент отключен:', socket.id);
  });
});
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: 'Некорректная подписка' });
  }
  const exists = subscriptions.some((sub) => sub.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
  }
  return res.status(201).json({ message: 'Подписка сохранена' });
});
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ message: 'Endpoint обязателен' });
  }
  subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  return res.status(200).json({ message: 'Подписка удалена' });
});
app.post('/dismiss', (req, res) => {
  const reminderId = Number.parseInt(req.query.reminderId || req.body.reminderId, 10);
  if (reminderId && reminders.has(reminderId)) {
    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);
    reminders.delete(reminderId);
  }
  io.emit('reminderDismissed', { id: reminderId });
  res.status(200).json({ message: 'Dismissed' });
});
app.post('/snooze', (req, res) => {
  const reminderId = Number.parseInt(req.query.reminderId, 10);
  if (!reminderId || !reminders.has(reminderId)) {
    return res.status(404).json({ error: 'Reminder not found' });
  }
  const reminder = reminders.get(reminderId);
  clearTimeout(reminder.timeoutId);
  const newDelay = 5 * 60 * 1000;
  const newReminderTime = reminder.reminderTime + newDelay;
  const timeoutDelay = newReminderTime - Date.now();
  const newTimeoutId = setTimeout(() => {
    const notificationData = {
      title: 'Напоминание отложено',
      body: reminder.text,
      reminderId
    };
    const payload = JSON.stringify(notificationData);
    io.emit('reminderDue', notificationData);
    sendPushToAll(payload);
    setTimeout(() => {
      reminders.delete(reminderId);
    }, 2 * 60 * 1000);
  }, timeoutDelay > 0 ? timeoutDelay : 0);
  reminders.set(reminderId, {
    timeoutId: newTimeoutId,
    text: reminder.text,
    reminderTime: newReminderTime
  });
  console.log(`[SNOOZE] reminderId=${reminderId}, newTime=${newReminderTime}`);
  io.emit('reminderSnoozed', { id: reminderId, newReminderTime });
  return res.status(200).json({ message: 'Reminder snoozed for 5 minutes', newReminderTime });
});
app.get('/api/reminders', (req, res) => {
  const activeReminders = Array.from(reminders.entries()).map(([id, data]) => ({
    id,
    reminderTime: data.reminderTime
  }));
  res.json({ reminders: activeReminders });
});
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен на https://localhost:${PORT}`);
});