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
    try {
      chrome.runtime.sendMessage({ type: 'ersense-capture', error: data.payload })
    } catch {
      /* extension context may be gone during reload; ignore */
    }
  })
})()
