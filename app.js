const STORAGE_KEY = 'practice17-notes';
const VAPID_PUBLIC_KEY = 'BNSzB_cYrPRpiwP67-Q4nyu81mZHlq-acMcO0oo5m-yve3maWH0NlkN7Ht9YpNXwFk-tZB2B5UhfYNWW3YQyG_c';
const socket = typeof io !== 'undefined' ? io() : null;
const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function getNotes() {
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (notes.some((note) => typeof note === 'string')) {
    const migrated = notes.map((note, index) => {
      if (typeof note === 'string') {
        return {
          id: Date.now() + index,
          text: note,
          reminder: null
        };
      }
      return note;
    });
    saveNotes(migrated);
    return migrated;
  }
  return notes;
}
function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
function showRealtimeNotification(text, type = 'info', durationMs = 3000) {
  const background = type === 'reminder' ? '#d64545' : '#1f6feb';
  const notification = document.createElement('div');
  notification.textContent = text;
  notification.style.cssText = [
    'position: fixed',
    'top: 10px',
    'right: 10px',
    `background: ${background}`,
    'color: #fff',
    'padding: 0.9rem 1rem',
    'border-radius: 8px',
    'z-index: 1000',
    'box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22)'
  ].join(';');
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), durationMs);
}
function showReminderFallback(reminder) {
  if (!reminder || !reminder.body) {
    return;
  }
  const background = '#d64545';
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="margin-bottom: 12px; font-weight: bold;">!!! Напоминание: ${escapeHtml(reminder.body)}</div>
    <div style="display: flex; gap: 8px;">
      <button id="snooze-btn" style="background: white; color: ${background}; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Отложить на 5 минут</button>
      <button id="close-btn" style="background: transparent; color: white; border: 1px solid white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">ОК / Закрыть</button>
    </div>
  `;
  notification.style.cssText = [
    'position: fixed',
    'top: 20px',
    'right: 20px',
    `background: ${background}`,
    'color: #fff',
    'padding: 1rem',
    'border-radius: 8px',
    'z-index: 1000',
    'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25)'
  ].join(';');
  document.body.appendChild(notification);
  let isSnoozed = false;
  const removeNoteLocal = () => {
    if (isSnoozed || !reminder.reminderId) return;
    const currentId = String(reminder.reminderId);
    const notes = getNotes().filter((n) => String(n.id) !== currentId);
    saveNotes(notes);
    const list = document.getElementById('notes-list');
    if (list) renderNotes(list);
    fetch(`/dismiss?reminderId=${currentId}`, { method: 'POST' }).catch(() => {});
  };
  const timeoutId = setTimeout(() => {
    notification.remove();
    removeNoteLocal();
  }, 12000);
  const snoozeBtn = notification.querySelector('#snooze-btn');
  if (snoozeBtn && reminder.reminderId) {
    snoozeBtn.addEventListener('click', async () => {
      isSnoozed = true;
      snoozeBtn.disabled = true;
      snoozeBtn.textContent = '...';
      try {
        console.log('[SNOOZE BTN CLICKED]', reminder.reminderId);
        const res = await fetch(`/snooze?reminderId=${reminder.reminderId}`, { method: 'POST' });
        const data = await res.json();
        console.log('[SNOOZE RES]', data);
        clearTimeout(timeoutId);
        notification.remove();
        showRealtimeNotification('Напоминание отложено на 5 минут', 'info', 3000);
        const notes = getNotes();
        const noteToUpdate = notes.find((n) => n.id === Number(reminder.reminderId));
        if (noteToUpdate && data.newReminderTime) {
          noteToUpdate.reminder = data.newReminderTime;
          saveNotes(notes);
          const list = document.getElementById('notes-list');
          if (list) renderNotes(list);
        }
      } catch (error) {
        console.error('Ошибка snooze:', error);
        snoozeBtn.textContent = 'Ошибка';
      }
    });
  }
  const closeBtn = notification.querySelector('#close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      clearTimeout(timeoutId);
      notification.remove();
      removeNoteLocal();
    });
  }
}
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription = existingSubscription || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await fetch('/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
    console.log('Подписка на push отправлена');
  } catch (error) {
    console.error('Ошибка подписки на push:', error);
  }
}
async function syncSubscriptionWithServer(subscription) {
  if (!subscription) {
    return;
  }
  await fetch('/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
}
async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }
  await fetch('/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint })
  });
  await subscription.unsubscribe();
  console.log('Отписка выполнена');
}
function addNote(text, reminderTimestamp = null) {
  const notes = getNotes();
  const newNote = {
    id: Date.now(),
    text,
    reminder: reminderTimestamp
  };
  notes.unshift(newNote);
  saveNotes(notes);
  if (reminderTimestamp) {
    showRealtimeNotification('Напоминание запланировано', 'reminder', 3000);
  }
  if (socket) {
    if (reminderTimestamp) {
      socket.emit('newReminder', {
        id: newNote.id,
        text: newNote.text,
        reminderTime: reminderTimestamp
      });
    } else {
      socket.emit('newTask', { text, timestamp: Date.now() });
    }
  }
}
function renderNotes(list) {
  const notes = getNotes();
  if (notes.length === 0) {
    list.innerHTML = '<li class="is-center" style="opacity: 0.7;">Пока заметок нет.</li>';
    return;
  }
  list.innerHTML = notes
    .map(
      (note) => {
        const reminderInfo = note.reminder
          ? `<small class="note-reminder">!!! Напоминание: ${new Date(note.reminder).toLocaleString()}</small>`
          : '';
        return `
        <li class="note-item">
          <div class="note-item-text-wrap">
            <span class="note-item-text">${escapeHtml(note.text)}</span>
            ${reminderInfo}
          </div>
          <button type="button" data-remove-id="${note.id}">Удалить</button>
        </li>
      `;
      }
    )
    .join('');
}
function initNotes() {
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  const reminderForm = document.getElementById('reminder-form');
  const reminderText = document.getElementById('reminder-text');
  const reminderTime = document.getElementById('reminder-time');
  const list = document.getElementById('notes-list');
  if (!form || !input || !list || !reminderForm || !reminderText || !reminderTime) {
    return;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      return;
    }
    addNote(text);
    renderNotes(list);
    input.value = '';
  });
  reminderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = reminderText.value.trim();
    const dateTimeValue = reminderTime.value;
    if (!text || !dateTimeValue) {
      return;
    }
    const reminderTimestamp = new Date(dateTimeValue).getTime();
    if (Number.isNaN(reminderTimestamp) || reminderTimestamp <= Date.now()) {
      alert('Дата напоминания должна быть в будущем');
      return;
    }
    addNote(text, reminderTimestamp);
    renderNotes(list);
    reminderText.value = '';
    reminderTime.value = '';
  });
  list.addEventListener('click', (event) => {
    const removeButton = event.target.closest('button[data-remove-id]');
    if (!removeButton) {
      return;
    }
    const noteId = Number(removeButton.dataset.removeId);
    if (Number.isNaN(noteId)) {
      return;
    }
    const updated = getNotes().filter((note) => note.id !== noteId);
    saveNotes(updated);
    renderNotes(list);
  });
  const doCleanup = () => {
    const notes = getNotes();
    const now = Date.now();
    let changed = false;
    const activeNotes = notes.filter((n) => {
      if (n.reminder && n.reminder < now - 60000) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      saveNotes(activeNotes);
      renderNotes(list);
    }
  };
  doCleanup();
  setInterval(doCleanup, 10000);
  renderNotes(list);
}
function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach((btn) => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}
async function loadContent(page) {
  try {
    const response = await fetch(`/content/${page}.html`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    contentDiv.innerHTML = html;
    if (page === 'home') {
      initNotes();
    }
  } catch (error) {
    contentDiv.innerHTML = '<p class="is-center text-error">Ошибка загрузки страницы.</p>';
    console.error('Load content error:', error);
  }
}
homeBtn.addEventListener('click', () => {
  setActiveButton('home-btn');
  loadContent('home');
});
aboutBtn.addEventListener('click', () => {
  setActiveButton('about-btn');
  loadContent('about');
});
loadContent('home');
if (socket) {
  socket.on('connect', async () => {
    console.log('Socket connected:', socket.id);
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        const notes = getNotes();
        let changed = false;
        data.reminders.forEach((r) => {
          const noteToUpdate = notes.find((n) => n.id === r.id);
          if (noteToUpdate && noteToUpdate.reminder !== r.reminderTime) {
            noteToUpdate.reminder = r.reminderTime;
            changed = true;
          }
        });
        if (changed) {
          saveNotes(notes);
          const list = document.getElementById('notes-list');
          if (list) renderNotes(list);
        }
      }
    } catch (e) {
      console.error('Ошибка синхронизации напоминаний:', e);
    }
  });
  window.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && socket && socket.connected) {
      try {
        const res = await fetch('/api/reminders');
        if (res.ok) {
          const data = await res.json();
          const notes = getNotes();
          let changed = false;
          data.reminders.forEach((r) => {
            const noteToUpdate = notes.find((n) => n.id === r.id);
            if (noteToUpdate && noteToUpdate.reminder !== r.reminderTime) {
              noteToUpdate.reminder = r.reminderTime;
              changed = true;
            }
          });
          if (changed) {
            saveNotes(notes);
            const list = document.getElementById('notes-list');
            if (list) {
              renderNotes(list);
            }
          }
        }
      } catch (e) {
        console.error('Ошибка синхронизации:', e);
      }
    }
  });
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showRealtimeNotification('Нет соединения с сервером уведомлений', 'reminder', 5000);
  });
  socket.on('taskAdded', (task) => {
    console.log('Задача в реальном времени:', task);
    if (task && task.text) {
      showRealtimeNotification(`Новая задача: ${task.text}`);
    }
  });
  socket.on('reminderDue', (reminder) => {
    console.log('Напоминание наступило:', reminder);
    showReminderFallback(reminder);
  });
  socket.on('reminderSnoozed', ({ id, newReminderTime }) => {
    console.log('[SNOOZED EVENT]', id, newReminderTime);
    const notes = getNotes();
    const noteToUpdate = notes.find((n) => String(n.id) === String(id));
    if (noteToUpdate) {
      noteToUpdate.reminder = newReminderTime;
      saveNotes(notes);
      const list = document.getElementById('notes-list');
      if (list) renderNotes(list);
    } else {
      console.warn('[SNOOZED] note not found', id);
    }
  });
  socket.on('reminderDismissed', ({ id }) => {
    console.log('[DISMISSED EVENT]', id);
    const notes = getNotes().filter((n) => String(n.id) !== String(id));
    saveNotes(notes);
    const list = document.getElementById('notes-list');
    if (list) renderNotes(list);
  });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SNOOZE_UPDATED') {
      const { reminderId, newReminderTime } = event.data;
      const notes = getNotes();
      const noteToUpdate = notes.find((n) => String(n.id) === String(reminderId));
      if (noteToUpdate && noteToUpdate.reminder !== newReminderTime) {
        noteToUpdate.reminder = newReminderTime;
        saveNotes(notes);
        const list = document.getElementById('notes-list');
        if (list) renderNotes(list);
      }
    } else if (event.data && event.data.type === 'DISMISS_REMINDER') {
      const { reminderId } = event.data;
      const notes = getNotes().filter((n) => String(n.id) !== String(reminderId));
      saveNotes(notes);
      const list = document.getElementById('notes-list');
      if (list) renderNotes(list);
    }
  });
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
      const enableBtn = document.getElementById('enable-push');
      const disableBtn = document.getElementById('disable-push');
      if (enableBtn && disableBtn) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await syncSubscriptionWithServer(subscription);
          enableBtn.style.display = 'none';
          disableBtn.style.display = 'inline-block';
        }
        enableBtn.addEventListener('click', async () => {
          if (Notification.permission === 'denied') {
            alert('Уведомления запрещены. Разрешите их в настройках браузера.');
            return;
          }
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              alert('Необходимо разрешить уведомления.');
              return;
            }
          }
          await subscribeToPush();
          enableBtn.style.display = 'none';
          disableBtn.style.display = 'inline-block';
        });
        disableBtn.addEventListener('click', async () => {
          await unsubscribeFromPush();
          disableBtn.style.display = 'none';
          enableBtn.style.display = 'inline-block';
        });
      }
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}