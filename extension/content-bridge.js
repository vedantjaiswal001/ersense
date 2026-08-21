/**
 * content-bridge.js  (runs in the isolated content-script world)
 *
 * Listens for the MAIN-world capture messages and forwards them to the
 * service worker, which can't be reached directly from the page world.
 */
;(function () {
  const MARK = '__ERSENSE_CAPTURE__'
  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    const data = event.data
    if (!data || data[MARK] !== true || !data.payload) return
    // Bail if the extension was reloaded and this content script is orphaned.
    if (!chrome.runtime || !chrome.runtime.id) return
    try {
      // Provide a callback that reads lastError, so a failed delivery (e.g. the
      // service worker restarting, or the frame being torn down) is swallowed
      // instead of surfacing as an "Unchecked runtime.lastError" console error.
      chrome.runtime.sendMessage({ type: 'ersense-capture', error: data.payload }, () => {
        void chrome.runtime.lastError
      })
    } catch {
      /* extension context invalidated during reload; ignore */
    }
  })
})()
