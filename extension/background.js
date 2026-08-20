/**
 * background.js  (MV3 service worker)
 *
 * - Stores captured errors per tab (in session storage) and shows a badge.
 * - Resets a tab's errors on navigation.
 * - Adds a "Explain with ER Sense" context menu for selected text.
 */
const MAX_PER_TAB = 25

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
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ersense-explain',
    title: 'Explain with ER Sense',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'ersense-explain' && info.selectionText) {
    chrome.storage.session.set({ pending: info.selectionText }).then(() => {
      if (chrome.action.openPopup) {
        chrome.action.openPopup().catch(() => {
          /* not allowed outside a user gesture on some Chrome versions */
        })
      }
    })
  }
})
