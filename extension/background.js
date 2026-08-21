/**
 * background.js  (MV3 service worker)
 *
 * - Stores captured errors per tab (in session storage) and shows a badge.
 * - Resets a tab's errors on navigation.
 * - Adds a "Explain with ER Sense" context menu for selected text.
 */
const MAX_PER_TAB = 25

// Clicking the toolbar icon opens the side panel (instead of a popup).
try {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {})
} catch {
  /* sidePanel unsupported on very old Chrome */
}

// Notify any open side panel so it can refresh live.
function notifyUI(type) {
  try {
    chrome.runtime.sendMessage({ type }, () => void chrome.runtime.lastError)
  } catch {
    /* no receiver open; ignore */
  }
}

async function getMap() {
  const o = await chrome.storage.session.get('captured')
  return o.captured || {}
}
async function setMap(map) {
  await chrome.storage.session.set({ captured: map })
}

async function setBadge(tabId, count) {
  try {
    await chrome.action.setBadgeText({ tabId, text: count ? (count > 99 ? '99+' : String(count)) : '' })
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#FF6A3D' })
  } catch {
    /* tab may be gone */
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'ersense-capture' && sender.tab) {
    const tabId = sender.tab.id
    getMap().then((map) => {
      const list = map[tabId] || []
      const last = list[list.length - 1]
      if (!last || last.text !== msg.error.text) {
        list.push({ ...msg.error, url: sender.tab.url })
      }
      map[tabId] = list.slice(-MAX_PER_TAB)
      setMap(map)
      setBadge(tabId, map[tabId].length)
      notifyUI('ersense-refresh-captured')
    })
    return
  }

  if (msg && msg.type === 'ersense-get-captured') {
    getMap().then((map) => sendResponse({ errors: map[msg.tabId] || [] }))
    return true // keep the channel open for async sendResponse
  }

  if (msg && msg.type === 'ersense-clear-captured') {
    getMap().then((map) => {
      delete map[msg.tabId]
      setMap(map)
      setBadge(msg.tabId, 0)
    })
    return
  }

  if (msg && msg.type === 'ersense-get-pending') {
    chrome.storage.session.get('pending').then((o) => {
      sendResponse({ pending: o.pending || '' })
      chrome.storage.session.remove('pending')
    })
    return true
  }

  // A failed run/submit verdict was detected on the page (Wrong Answer, etc.).
  if (msg && msg.type === 'ersense-verdict' && sender.tab) {
    const verdict = { text: msg.text || '', auto: !!msg.auto, url: sender.tab.url, tabId: sender.tab.id }
    chrome.storage.session.set({ verdict }).then(() => {
      setBadge(sender.tab.id, 0) // clear count badge
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: '!' }).catch(() => {})
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#f2b04a' }).catch(() => {})
      notifyUI('ersense-verdict')
    })
    return
  }

  if (msg && msg.type === 'ersense-get-verdict') {
    chrome.storage.session.get('verdict').then((o) => {
      sendResponse({ verdict: o.verdict || null })
      chrome.storage.session.remove('verdict')
    })
    return true
  }
})

// Reset a tab's captured errors when it starts navigating.
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') {
    getMap().then((map) => {
      if (map[tabId]) {
        delete map[tabId]
        setMap(map)
        setBadge(tabId, 0)
      }
    })
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  getMap().then((map) => {
    if (map[tabId]) {
      delete map[tabId]
      setMap(map)
    }
  })
})

// Right-click "Explain with ER Sense" on selected text.
// removeAll() first so a reload/update can't throw a duplicate-id error.
function setupMenu() {
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError
    chrome.contextMenus.create({
      id: 'ersense-explain',
      title: 'Explain with ER Sense',
      contexts: ['selection'],
    })
  })
}
chrome.runtime.onInstalled.addListener(setupMenu)
chrome.runtime.onStartup.addListener(setupMenu)

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ersense-explain' && info.selectionText) {
    chrome.storage.session.set({ pending: info.selectionText }).then(() => {
      notifyUI('ersense-refresh-pending')
      if (tab && chrome.sidePanel && chrome.sidePanel.open) {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {})
      }
    })
  }
})
