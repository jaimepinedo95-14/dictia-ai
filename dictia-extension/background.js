// Dictia AI — Background Service Worker
// Handles session sync between dictia.health and extension storage

chrome.runtime.onInstalled.addListener(() => {
  console.log('Dictia AI extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SYNC_NOTE') {
    chrome.storage.local.set({ lastNote: msg.note, authToken: msg.token });
    sendResponse({ ok: true });
  }
  return true;
});
