/**
 * content-detect.js  (isolated world, top frame only)
 *
 * Detects when a *failed run/submit result* appears on a page - a LeetCode
 * "Wrong Answer", a runtime error, a traceback, a compile error, etc. - and
 * tells the extension so the side panel can auto-explain it.
 *
 * These verdicts are TEXT the site renders (the code ran on a server), so they
 * are not JavaScript errors and window.onerror never sees them. We instead
 * watch the DOM. The strong, low-false-positive signal is:
 *     "the user clicked a Run/Submit button, then a failure verdict appeared".
 * When that happens we mark the report as `auto` so the panel runs hands-free.
 * A verdict that appears without a detected click is still reported, but as a
 * one-click suggestion instead of an automatic run.
 */
;(() => {
  if (window.top !== window) return // top frame only - ignore ad/iframe noise

  const RUN_RE = /\b(run|submit|compile|execute|test)\b/i
  const FAIL_RE =
    /(wrong answer|runtime error|time limit exceeded|memory limit exceeded|output limit exceeded|compil(?:e|ation) error|presentation error|segmentation fault|core dumped|traceback \(most recent call last\)|\b(?:Syntax|Name|Type|Index|Key|Value|Attribute|Reference|Runtime|Assertion|Range|ZeroDivision|Overflow|Import|IndentationError|Unbound[Ll]ocal|Recursion|StackOverflow)Error\b|\bpanic:|\bUncaught\b|\bsegfault\b)/i
  const ACCEPT_RE = /\b(accepted|all (?:test ?cases|tests) passed|correct answer|success)\b/i

  const ARM_MS = 25000
  let armedAt = 0
  let lastSig = ''
  let debounce = null
  let buffer = []

  /* ---- arming: did the user just run/submit something? ---- */
  function clickable(el) {
    let n = el
    for (let i = 0; n && i < 5; i++, n = n.parentElement) {
      const tag = n.tagName
      if (
        tag === 'BUTTON' ||
        tag === 'A' ||
        n.getAttribute?.('role') === 'button' ||
        (tag === 'INPUT' && /submit|button/i.test(n.type || ''))
      )
        return n
    }
    return el
  }
  function labelOf(el) {
    return (
      el.innerText ||
      el.value ||
      el.getAttribute?.('aria-label') ||
      el.getAttribute?.('title') ||
      ''
    ).trim()
  }
  function arm() {
    armedAt = Date.now()
    // A verdict usually lands shortly after; poll a few times in case the
    // MutationObserver misses the exact insertion.
    ;[900, 2000, 3500, 5500].forEach((ms) => setTimeout(fullScan, ms))
  }
  document.addEventListener(
    'click',
    (e) => {
      try {
        const label = labelOf(clickable(e.target))
        if (label && label.length <= 40 && RUN_RE.test(label)) arm()
      } catch {
        /* ignore */
      }
    },
    true,
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') arm()
    },
    true,
  )

  /* ---- detection ---- */
  function contextText(node) {
    let n = node
    for (let i = 0; n && i < 6; i++) {
      const t = n.innerText || n.textContent || ''
      if (t.length > 180) return t.slice(0, 4000)
      n = n.parentElement
    }
    return (node.innerText || node.textContent || '').slice(0, 4000)
  }
  function looksFailed(txt) {
    if (!txt) return false
    if (ACCEPT_RE.test(txt) && !FAIL_RE.test(txt)) return false
    return FAIL_RE.test(txt)
  }
  function report(text, armed) {
    const sig = (text || '').replace(/\s+/g, ' ').trim().slice(0, 160)
    if (!sig || sig === lastSig) return
    lastSig = sig
    try {
      chrome.runtime?.sendMessage(
        { type: 'ersense-verdict', auto: !!armed, text: (text || '').slice(0, 4000) },
        () => void chrome.runtime.lastError,
      )
    } catch {
      /* extension context gone; ignore */
    }
  }
  function fullScan() {
    const body = document.body
    if (!body) return
    const txt = body.innerText || ''
    if (!looksFailed(txt)) return
    const idx = txt.search(FAIL_RE)
    const slice = txt.slice(Math.max(0, idx - 400), idx + 1600)
    report(slice, true) // only scheduled right after a run click
  }
  function scanNodes(nodes) {
    const seen = nodes.slice(-300)
    for (const node of seen) {
      if (!node || node.nodeType !== 1) continue
      const txt = node.textContent || ''
      if (!txt || txt.length > 20000) continue
      if (looksFailed(txt)) return node
    }
    return null
  }

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.addedNodes) for (const n of m.addedNodes) if (n.nodeType === 1) buffer.push(n)
      if (m.type === 'characterData' && m.target?.parentElement) buffer.push(m.target.parentElement)
    }
    if (buffer.length > 2000) buffer = buffer.slice(-1000)
    if (debounce) return
    debounce = setTimeout(() => {
      debounce = null
      const nodes = buffer
      buffer = []
      const hit = scanNodes(nodes)
      if (!hit) return
      report(contextText(hit), Date.now() - armedAt < ARM_MS)
      armedAt = 0
    }, 600)
  })
  try {
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true })
  } catch {
    /* ignore */
  }
})()
