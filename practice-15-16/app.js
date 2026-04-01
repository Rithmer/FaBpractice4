const STORAGE_KEY = 'practice15-notes';
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
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
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

function showRealtimeNotification(text) {
  const notification = document.createElement('div');
  notification.textContent = `Новая задача: ${text}`;
  notification.style.cssText = [
    'position: fixed',
    'top: 10px',
    'right: 10px',
    'background: #1f6feb',
    'color: #fff',
    'padding: 0.9rem 1rem',
    'border-radius: 8px',
    'z-index: 1000',
    'box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22)'
  ].join(';');

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
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

function addNote(text) {
  const notes = getNotes();
  notes.unshift(text);
  saveNotes(notes);

  if (socket) {
    socket.emit('newTask', { text, timestamp: Date.now() });
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
      (note, index) => `
        <li class="note-item">
          <span class="note-item-text">${escapeHtml(note)}</span>
          <button type="button" data-remove-index="${index}">Удалить</button>
        </li>
      `
    )
    .join('');
}

function initNotes() {
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  const list = document.getElementById('notes-list');

  if (!form || !input || !list) {
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

  list.addEventListener('click', (event) => {
    const removeButton = event.target.closest('button[data-remove-index]');
    if (!removeButton) {
      return;
    }

    const index = Number(removeButton.dataset.removeIndex);
    if (Number.isNaN(index)) {
      return;
    }

    const notes = getNotes();
    notes.splice(index, 1);
    saveNotes(notes);
    renderNotes(list);
  });

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
  socket.on('taskAdded', (task) => {
    console.log('Задача в реальном времени:', task);
    if (task && task.text) {
      showRealtimeNotification(task.text);
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);

      const enableBtn = document.getElementById('enable-push');
      const disableBtn = document.getElementById('disable-push');
      if (enableBtn && disableBtn) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
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
