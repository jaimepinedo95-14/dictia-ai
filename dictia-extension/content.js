// Dictia AI — Content Script
// Injects a floating button and handles text field insertion

let lastFocusedField = null;
let dictiaButton = null;

// Track the last focused text field
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text') || el.contentEditable === 'true')) {
    lastFocusedField = el;
  }
});

// Create and inject floating button
function injectDictiaButton() {
  if (document.getElementById('dictia-float-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'dictia-float-btn';
  btn.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      border-radius: 50%;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: system-ui, sans-serif;
    " id="dictia-btn-inner" title="Dictia AI — Insertar última nota">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="white"/>
      </svg>
    </div>
    <div id="dictia-tooltip" style="
      display: none;
      position: fixed;
      bottom: 86px;
      right: 24px;
      z-index: 999999;
      background: #1e1b4b;
      color: white;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      padding: 8px 12px;
      border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">Dictia AI — Insertar última nota</div>
  `;

  document.body.appendChild(btn);
  dictiaButton = btn;

  const inner = document.getElementById('dictia-btn-inner');
  const tooltip = document.getElementById('dictia-tooltip');

  inner.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.1)';
    inner.style.boxShadow = '0 6px 24px rgba(79, 70, 229, 0.6)';
    tooltip.style.display = 'block';
  });

  inner.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)';
    inner.style.boxShadow = '0 4px 20px rgba(79, 70, 229, 0.4)';
    tooltip.style.display = 'none';
  });

  inner.addEventListener('click', handleInsertNote);
}

async function handleInsertNote() {
  const { lastNote } = await chrome.storage.local.get('lastNote');

  if (!lastNote) {
    showNotification('Primero aprueba una nota en dictia.health', 'error');
    return;
  }

  if (!lastFocusedField) {
    showNotification('Haz clic en el campo donde quieres insertar la nota', 'info');
    return;
  }

  try {
    if (lastFocusedField.contentEditable === 'true') {
      lastFocusedField.focus();
      document.execCommand('insertText', false, lastNote);
    } else {
      const start = lastFocusedField.selectionStart || 0;
      const end = lastFocusedField.selectionEnd || 0;
      const current = lastFocusedField.value || '';
      lastFocusedField.value = current.slice(0, start) + lastNote + current.slice(end);
      lastFocusedField.selectionStart = lastFocusedField.selectionEnd = start + lastNote.length;
      lastFocusedField.dispatchEvent(new Event('input', { bubbles: true }));
      lastFocusedField.dispatchEvent(new Event('change', { bubbles: true }));
    }
    showNotification('✓ Nota insertada correctamente', 'success');
  } catch (err) {
    showNotification('Error al insertar nota. Intenta de nuevo.', 'error');
  }
}

function showNotification(message, type) {
  const notif = document.createElement('div');
  const colors = { success: '#059669', error: '#dc2626', info: '#4f46e5' };
  notif.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 24px;
    z-index: 9999999;
    background: ${colors[type] || '#4f46e5'};
    color: white;
    font-size: 13px;
    font-family: system-ui, sans-serif;
    font-weight: 600;
    padding: 10px 16px;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: dictia-slide-in 0.3s ease;
  `;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// Sync last note from dictia.health localStorage to extension storage
if (window.location.hostname === 'dictia.health' || window.location.hostname === 'localhost') {
  const syncNote = () => {
    try {
      const keys = Object.keys(localStorage);
      const noteKey = keys.find(k => k.includes('last_approved_note'));
      if (noteKey) {
        const note = localStorage.getItem(noteKey);
        if (note) chrome.storage.local.set({ lastNote: note });
      }
      // Also sync auth token
      const authKey = keys.find(k => k.includes('auth-token') || k.includes('supabase'));
      if (authKey) {
        const token = localStorage.getItem(authKey);
        if (token) chrome.storage.local.set({ authToken: token });
      }
    } catch {}
  };
  syncNote();
  window.addEventListener('storage', syncNote);
} else {
  // Inject button on all other sites
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDictiaButton);
  } else {
    injectDictiaButton();
  }
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'INSERT_NOTE') {
    handleInsertNote();
  }
});
