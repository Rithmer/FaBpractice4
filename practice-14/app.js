const STORAGE_KEY = 'practice14-notes';

const form = document.getElementById('note-form');
const input = document.getElementById('note-input');
const list = document.getElementById('notes-list');
const clearButton = document.getElementById('clear-btn');
const emptyState = document.getElementById('empty-state');
const networkStatus = document.getElementById('network-status');

function getNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function updateEmptyState() {
  emptyState.hidden = getNotes().length > 0;
}

function removeNote(index) {
  const notes = getNotes();
  notes.splice(index, 1);
  saveNotes(notes);
  renderNotes();
}

function renderNotes() {
  const notes = getNotes();

  if (notes.length === 0) {
    list.innerHTML = '';
    updateEmptyState();
    return;
  }

  list.innerHTML = notes
    .map(
      (note, index) => `
        <li class="note-row">
          <span class="note-text">${note}</span>
          <span class="note-actions">
            <button type="button" data-remove-index="${index}">Удалить</button>
          </span>
        </li>
      `
    )
    .join('');

  updateEmptyState();
}

function updateNetworkStatus() {
  networkStatus.textContent = navigator.onLine
    ? 'Сеть доступна: работа в обычном режиме.'
    : 'Оффлайн-режим: страница и заметки доступны локально.';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    return;
  }

  const notes = getNotes();
  notes.unshift(text);
  saveNotes(notes);
  renderNotes();
  input.value = '';
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-remove-index]');
  if (!button) {
    return;
  }

  const index = Number(button.dataset.removeIndex);
  if (!Number.isNaN(index)) {
    removeNote(index);
  }
});

clearButton.addEventListener('click', () => {
  saveNotes([]);
  renderNotes();
});

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('Service Worker зарегистрирован');
    } catch (error) {
      console.error('Ошибка регистрации Service Worker:', error);
    }
  });
}

updateNetworkStatus();
renderNotes();
