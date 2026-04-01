const express = require('express');
const http = require('http');
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

    subscriptions.forEach((sub) => {
      webpush.sendNotification(sub, payload).catch((err) => {
        console.error('Push error:', err.message || err);
      });
    });
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

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен на https://localhost:${PORT}`);
});
