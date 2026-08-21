/**
 * content-main.js  (runs in the page's MAIN world)
 *
 * Captures genuine uncaught runtime errors and unhandled promise rejections,
 * then posts them to the isolated bridge via window.postMessage.
 * MAIN-world scripts can't use chrome.* APIs, hence the postMessage relay.
 *
 * Note: we deliberately do NOT override console.error. Doing so re-attributes
 * every page's console.error() call to this content script (polluting the
 * extension's error log) and captures non-errors (warnings, third-party
 * logging like Google Identity Services). Uncaught errors + rejections are
 * the real signal.
 */
;(function () {
  const MARK = '__ERSENSE_CAPTURE__'

  function send(payload) {
    try {
      window.postMessage({ [MARK]: true, payload }, '*')
    } catch {
      /* ignore */
    }
  }

  // Uncaught errors
  window.addEventListener(
    'error',
    (e) => {
      // Ignore resource-load errors (img/script 404s) which have no message.
      if (!e || (!e.message && !e.error)) return
      const stack = e.error && e.error.stack ? String(e.error.stack) : ''
      const where = e.filename ? `\n    at ${e.filename}:${e.lineno}:${e.colno}` : ''
      const text = stack || `${e.message}${where}`
      send({ kind: 'error', text: String(text).slice(0, 6000), ts: Date.now() })
    },
    true
  )

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason
    let text
    if (r && r.stack) text = String(r.stack)
    else if (r && r.message) text = String(r.message)
    else text = String(r)
    send({ kind: 'rejection', text: ('Unhandled promise rejection: ' + text).slice(0, 6000), ts: Date.now() })
  })
})()
