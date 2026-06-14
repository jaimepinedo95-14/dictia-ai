// Dictia AI — Popup Script

async function init() {
  const { lastNote, authToken } = await chrome.storage.local.get(['lastNote', 'authToken']);
  const isConnected = Boolean(authToken);

  // Status
  const statusEl = document.getElementById('status-container');
  statusEl.innerHTML = `
    <div class="status-badge ${isConnected ? 'status-connected' : 'status-disconnected'}">
      <div class="dot ${isConnected ? 'dot-green' : 'dot-red'}"></div>
      ${isConnected ? '✓ Conectado a Dictia' : 'No conectado — inicia sesión en dictia.health'}
    </div>
  `;

  // Note preview
  const noteEl = document.getElementById('note-container');
  if (lastNote) {
    const preview = lastNote.slice(0, 300) + (lastNote.length > 300 ? '...' : '');
    noteEl.innerHTML = `
      <div class="note-label">Última nota aprobada</div>
      <div class="note-preview">${preview}</div>
    `;
  } else {
    noteEl.innerHTML = `
      <div class="no-note">
        <p>No hay notas guardadas.</p>
        <p style="margin-top:4px">Aprueba una consulta en dictia.health primero.</p>
      </div>
    `;
  }

  // Actions
  const actionsEl = document.getElementById('actions-container');
  if (lastNote) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary" id="insert-btn">
        📋 Insertar nota en campo activo
      </button>
      <button class="btn btn-secondary" id="copy-btn">
        📋 Copiar al portapapeles
      </button>
    `;

    document.getElementById('insert-btn').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'INSERT_NOTE' });
      window.close();
    });

    document.getElementById('copy-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(lastNote);
        const btn = document.getElementById('copy-btn');
        btn.textContent = '✓ ¡Copiado!';
        btn.style.background = '#f0fdf4';
        btn.style.color = '#15803d';
        setTimeout(() => window.close(), 1000);
      } catch {}
    });
  } else if (!isConnected) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary" id="login-btn">
        Abrir Dictia para iniciar sesión
      </button>
    `;
    document.getElementById('login-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://dictia.health/login' });
      window.close();
    });
  }
}

init();
