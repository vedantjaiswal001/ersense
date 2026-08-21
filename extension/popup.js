import { analyzeError } from './lib/analyze.js'
import { testApiKey, explainImageWithGemini } from './lib/gemini.js'
import { getApiKey, setApiKey } from './lib/storage.js'
import { MODE_META } from './lib/classify.js'
import { highlightToHTML, escapeHtml } from './lib/highlight.js'

const SEV = {
  critical: { label: 'Critical', color: 'var(--critical)' },
  high: { label: 'High', color: 'var(--critical)' },
  medium: { label: 'Medium', color: 'var(--warning)' },
  low: { label: 'Low', color: 'var(--info)' },
  info: { label: 'Info', color: 'var(--info)' },
}
const sev = (s) => SEV[s] || SEV.medium

const $ = (id) => document.getElementById(id)
const input = $('input')
const explainBtn = $('explainBtn')
const meta = $('meta')
const result = $('result')
const enginePill = $('engine')
const capturedEl = $('captured')
const editor = $('editor')
const edPre = $('edPre')
const edGutter = $('edGutter')
const edBand = $('edBand')
const captureBtn = $('captureBtn')
const shotEl = $('shot')

// Must match the editor CSS (font-size 12 * line-height 1.55, padding 10).
const LINE_H = 12 * 1.55
const PAD_TOP = 10

let snippets = [] // copy targets
let bandTimer = null

/* ------------------------------------------------------------------ */
/*  Chrome helpers                                                     */
/* ------------------------------------------------------------------ */
function sendBg(msg) {
  return new Promise((res) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => {
        void chrome.runtime.lastError
        res(r)
      })
    } catch {
      res(null)
    }
  })
}
async function activeTabId() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab && tab.id
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Engine indicator + input meta                                      */
/* ------------------------------------------------------------------ */
function refreshEngine() {
  const has = !!getApiKey()
  enginePill.textContent = has ? 'AI mode' : 'Offline'
  enginePill.className = 'pill ' + (has ? 'pill-ai' : 'pill-muted')
}
function refreshMeta() {
  const v = input.value
  const lines = v ? v.split('\n').length : 0
  meta.textContent = `${v.length.toLocaleString()} chars · ${lines} lines`
  explainBtn.disabled = v.trim().length === 0
  syncEditor()
}

/* ------------------------------------------------------------------ */
/*  Syntax-highlighted editor (colored layer + gutter)                 */
/* ------------------------------------------------------------------ */
let curLine = 0 // line to mark in the gutter (from a jump), 0 = none
function syncEditor() {
  if (!edPre) return
  const v = input.value
  // Colored layer sitting behind the transparent-text textarea.
  edPre.innerHTML = v ? highlightToHTML(v) + '\n' : ''
  // Line-number gutter.
  const n = v ? v.split('\n').length : 1
  let g = ''
  for (let i = 1; i <= n; i++) g += `<div${i === curLine ? ' class="cur"' : ''}>${i}</div>`
  edGutter.innerHTML = g
  syncScroll()
}
function syncScroll() {
  if (!edPre) return
  edPre.scrollTop = input.scrollTop
  edPre.scrollLeft = input.scrollLeft
  edGutter.scrollTop = input.scrollTop
}

/* ------------------------------------------------------------------ */
/*  Analyze                                                            */
/* ------------------------------------------------------------------ */
let running = false
async function explain() {
  const raw = input.value.trim()
  if (!raw || running) return
  running = true
  explainBtn.disabled = true
  explainBtn.innerHTML = '<span class="spinner"></span><span class="btn-label">Analyzing</span>'
  editor && editor.classList.add('scanning')
  result.innerHTML = ''
  try {
    const out = await analyzeError(raw, { apiKey: getApiKey() })
    if (out.result) renderResult(out)
  } catch {
    result.innerHTML =
      '<div class="rc"><div class="rc-title">Something went wrong</div><p class="sec">Try again, or check your API key in Settings.</p></div>'
  } finally {
    running = false
    editor && editor.classList.remove('scanning')
    explainBtn.innerHTML = '<span class="btn-label">Explain</span>'
    explainBtn.disabled = input.value.trim().length === 0
  }
}

function codeBlock(code, name) {
  const idx = snippets.push(code) - 1
  return `<div class="code"><div class="code-head"><span class="code-name">${escapeHtml(name || 'snippet')}</span><button class="copy-btn" data-copy="${idx}">Copy</button></div><pre class="code-body"><code>${highlightToHTML(code)}</code></pre></div>`
}

function renderResult(out) {
  snippets = []
  const r = out.result
  const mode = r.mode || 'error'
  const modeMeta = MODE_META[mode] || MODE_META.error
  const s = sev(r.severity)
  const hasIssues = r.issues && r.issues.length
  const engineLabel = out.engine === 'ai' ? 'Gemini AI' : 'Offline'
  const engineColor = out.engine === 'ai' ? 'var(--brand)' : 'var(--info)'

  let h = '<div class="rc">'

  // badges
  h += '<div class="rc-badges">'
  h += `<span class="chip chip-mode">${escapeHtml(modeMeta.label)}</span>`
  h += `<span class="chip" style="color:${s.color};border-color:${s.color}55"><span class="sev-dot" style="background:${s.color}"></span>${s.label}</span>`
  if (r.language) h += `<span class="chip">${escapeHtml(r.language)}</span>`
  h += `<span class="chip chip-eng" style="color:${engineColor};border-color:${engineColor}55">${escapeHtml(engineLabel)}</span>`
  h += '</div>'

  h += `<div class="rc-title">${escapeHtml(r.title || 'Result')}</div>`
  const sub = []
  if (r.errorType) sub.push(`<span class="rc-type">${escapeHtml(r.errorType)}</span>`)
  if (r.failingLine != null)
    sub.push(`<button class="line-tag" data-line="${r.failingLine}" style="cursor:pointer">fails at line ${r.failingLine}</button>`)
  if (sub.length) h += `<div style="margin-top:5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${sub.join('')}</div>`

  if (out.note) h += `<div class="note" style="margin-top:10px">${escapeHtml(out.note)}</div>`

  // summary
  if (r.summary) h += `<div class="sec"><div class="sec-h">${mode === 'error' ? 'What it means' : 'Overview'}</div><p>${escapeHtml(r.summary)}</p></div>`
  if (r.rootCause) h += `<div class="sec"><div class="sec-h">Root cause</div><p>${escapeHtml(r.rootCause)}</p></div>`

  // issues
  if (hasIssues) {
    h += '<div class="sec"><div class="sec-h">Issues</div>'
    if (r.issues.length > 1 || mode !== 'error') {
      const counts = {}
      r.issues.forEach((i) => (counts[i.severity] = (counts[i.severity] || 0) + 1))
      const order = ['critical', 'high', 'medium', 'low', 'info'].filter((k) => counts[k])
      const worst = sev(order[0] || 'medium')
      let cc = ''
      order.forEach((k) => {
        const m = sev(k)
        cc += `<span class="sev-tag" style="color:${m.color};background:${m.color}1a">${m.label} ${counts[k]}</span>`
      })
      h += `<div class="summary-card" style="border-color:${worst.color}44;background:${worst.color}0d"><span class="summary-num" style="color:${worst.color};background:${worst.color}1a">${r.issues.length}</span><span><b>${r.issues.length} ${r.issues.length === 1 ? 'issue' : 'issues'} found</b><br><span style="color:var(--subtle);font-size:11px">ordered by severity</span></span><span class="summary-counts">${cc}</span></div>`
    }
    r.issues.forEach((it) => {
      const m = sev(it.severity)
      h += `<div class="issue" style="border-left-color:${m.color}">`
      h += '<div class="issue-top">'
      h += `<span class="sev-tag" style="color:${m.color};background:${m.color}1a"><span class="sev-dot" style="background:${m.color}"></span>${m.label}</span>`
      if (it.line != null) h += `<button class="line-tag" data-line="${it.line}" style="cursor:pointer">Line ${it.line}</button>`
      if (it.type) h += `<span class="type-tag">${escapeHtml(String(it.type).replace(/_/g, ' '))}</span>`
      h += '</div>'
      h += `<div class="issue-title">${escapeHtml(it.title || 'Issue')}</div>`
      if (it.expression) h += `<code class="expr">${escapeHtml(it.expression)}</code>`
      if (it.why) h += `<p class="issue-why">${escapeHtml(it.why)}</p>`
      if (it.before || it.after) {
        h += '<div class="ba">'
        if (it.before) h += `<code class="before">${escapeHtml(it.before)}</code>`
        if (it.before && it.after) h += '<span class="arrow">→</span>'
        if (it.after) h += `<code class="after">${escapeHtml(it.after)}</code>`
        h += '</div>'
      }
      h += '</div>'
    })
    h += '</div>'
  }

  // offline causes/fixes
  if (!hasIssues && r.causes && r.causes.length) {
    h += '<div class="sec"><div class="sec-h">Likely causes</div><ol style="margin:0;padding-left:18px;color:rgba(237,237,240,.85);font-size:12.5px;line-height:1.6">'
    r.causes.forEach((c) => (h += `<li>${escapeHtml(c)}</li>`))
    h += '</ol></div>'
  }
  if (!hasIssues && r.fixes && r.fixes.length) {
    h += '<div class="sec"><div class="sec-h">How to fix</div>'
    r.fixes.forEach((f) => {
      h += `<p class="issue-why" style="margin-top:8px">${escapeHtml(f.text)}</p>`
      if (f.code) h += codeBlock(f.code, 'fix')
    })
    h += '</div>'
  }

  if (r.fixedCode) h += `<div class="sec"><div class="sec-h">Fix all - corrected code</div>${codeBlock(r.fixedCode, 'corrected')}</div>`
  if (r.prevention) h += `<div class="sec"><div class="sec-h">Prevention</div><p>${escapeHtml(r.prevention)}</p></div>`
  if (r.docs) h += `<a class="docs-link" href="${escapeHtml(r.docs.url)}" target="_blank" rel="noreferrer">${escapeHtml(r.docs.label)}</a>`

  h += '</div>'
  result.innerHTML = h

  // wire copy buttons
  result.querySelectorAll('.copy-btn').forEach((b) => {
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(snippets[+b.dataset.copy] || '')
        const t = b.textContent
        b.textContent = 'Copied'
        setTimeout(() => (b.textContent = t), 1200)
      } catch {
        /* ignore */
      }
    })
  })
  // wire line jumps
  result.querySelectorAll('.line-tag[data-line]').forEach((b) => {
    b.addEventListener('click', () => jumpToLine(+b.dataset.line))
  })
}

function jumpToLine(n) {
  const lines = input.value.split('\n')
  if (n < 1 || n > lines.length) return
  let start = 0
  for (let i = 0; i < n - 1; i++) start += lines[i].length + 1
  const end = start + lines[n - 1].length
  input.focus()
  input.setSelectionRange(start, end)

  // Scroll the line into view (keep it a few rows from the top).
  input.scrollTop = Math.max(0, PAD_TOP + (n - 3) * LINE_H)

  // Mark the gutter line and flash a highlight band on it.
  curLine = n
  syncEditor()
  if (edBand) {
    edBand.style.top = PAD_TOP + (n - 1) * LINE_H - input.scrollTop + 'px'
    edBand.classList.remove('show')
    void edBand.offsetWidth // restart the animation
    edBand.classList.add('show')
    clearTimeout(bandTimer)
    bandTimer = setTimeout(() => {
      curLine = 0
      edBand.classList.remove('show')
      syncEditor()
    }, 2200)
  }
}

/* ------------------------------------------------------------------ */
/*  Screen capture -> Gemini vision                                    */
/* ------------------------------------------------------------------ */
let toastTimer = null
function toast(msg) {
  let t = $('toast')
  if (!t) {
    t = document.createElement('div')
    t.id = 'toast'
    t.className = 'toast'
    document.body.appendChild(t)
  }
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), 3400)
}

// Injected into the page: dim it, let the user drag a rectangle, return the
// rect in viewport CSS pixels + devicePixelRatio (or null if cancelled).
// Must be fully self-contained (runs in the page, not this module).
function regionSelectOverlay() {
  return new Promise((resolve) => {
    const dpr = window.devicePixelRatio || 1
    const ov = document.createElement('div')
    ov.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(10,10,12,.30);' +
      'margin:0;padding:0'
    const box = document.createElement('div')
    box.style.cssText =
      'position:fixed;border:2px solid #ff6a3d;background:rgba(255,106,61,.12);display:none;' +
      'pointer-events:none;z-index:2147483647;box-sizing:border-box'
    const hint = document.createElement('div')
    hint.textContent = 'Drag to select the area  ·  Esc to cancel'
    hint.style.cssText =
      'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
      'background:#16161a;color:#ededf0;font:600 12px system-ui,-apple-system,sans-serif;' +
      'padding:7px 13px;border-radius:999px;border:1px solid #31313a;pointer-events:none;white-space:nowrap'
    ov.appendChild(box)
    document.documentElement.appendChild(ov)
    document.documentElement.appendChild(hint)

    let sx = 0, sy = 0, active = false
    function cleanup() {
      ov.remove()
      hint.remove()
      document.removeEventListener('keydown', onKey, true)
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        cleanup()
        resolve(null)
      }
    }
    document.addEventListener('keydown', onKey, true)
    ov.addEventListener('mousedown', (e) => {
      active = true
      sx = e.clientX
      sy = e.clientY
      box.style.display = 'block'
      box.style.left = sx + 'px'
      box.style.top = sy + 'px'
      box.style.width = '0px'
      box.style.height = '0px'
      e.preventDefault()
    })
    ov.addEventListener('mousemove', (e) => {
      if (!active) return
      box.style.left = Math.min(sx, e.clientX) + 'px'
      box.style.top = Math.min(sy, e.clientY) + 'px'
      box.style.width = Math.abs(e.clientX - sx) + 'px'
      box.style.height = Math.abs(e.clientY - sy) + 'px'
    })
    ov.addEventListener('mouseup', (e) => {
      if (!active) return
      active = false
      const x = Math.min(sx, e.clientX)
      const y = Math.min(sy, e.clientY)
      const width = Math.abs(e.clientX - sx)
      const height = Math.abs(e.clientY - sy)
      cleanup()
      if (width < 8 || height < 8) resolve(null)
      else resolve({ x, y, width, height, dpr })
    })
    ov.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      cleanup()
      resolve(null)
    })
  })
}

// Crop a full-viewport screenshot down to the selected rect (scaled by dpr).
function cropImage(dataUrl, rect) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const dpr = rect.dpr || 1
      const sx = Math.max(0, Math.round(rect.x * dpr))
      const sy = Math.max(0, Math.round(rect.y * dpr))
      const sw = Math.min(img.width - sx, Math.round(rect.width * dpr))
      const sh = Math.min(img.height - sy, Math.round(rect.height * dpr))
      if (sw < 1 || sh < 1) return reject(new Error('empty crop'))
      const c = document.createElement('canvas')
      c.width = sw
      c.height = sh
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
}

function showShot(dataUrl) {
  shotEl.innerHTML = `<img src="${dataUrl}" alt="Captured area"/><button class="shot-clear" id="shotClear" title="Remove screenshot">✕</button>`
  shotEl.classList.remove('hidden')
  $('shotClear').addEventListener('click', () => {
    shotEl.classList.add('hidden')
    shotEl.innerHTML = ''
  })
}

async function captureRegion() {
  if (running) return
  if (!getApiKey()) {
    toast('Add your free Gemini key in Settings to use screen capture.')
    showSettings(true)
    return
  }
  let tab
  try {
    ;[tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  } catch {
    tab = null
  }
  if (!tab || !tab.id) return
  if (/^(chrome|edge|brave|about|chrome-extension|devtools|view-source):/i.test(tab.url || '')) {
    toast("Capture doesn't work on browser system pages. Open a normal website and try again.")
    return
  }

  // 1. Let the user drag a rectangle on the page.
  let rect
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: regionSelectOverlay,
    })
    rect = res && res.result
  } catch {
    toast("This page won't allow an overlay. Try selecting the text and right-clicking instead.")
    return
  }
  if (!rect) return // cancelled or too small

  // 2. Let the overlay fully clear, then grab the visible viewport.
  await new Promise((r) => setTimeout(r, 110))
  let dataUrl
  try {
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
  } catch {
    toast('Screen capture failed. Try again.')
    return
  }
  if (!dataUrl) {
    toast('Screen capture failed. Try again.')
    return
  }

  // 3. Crop, preview, and hand the image to Gemini vision.
  let cropped
  try {
    cropped = await cropImage(dataUrl, rect)
  } catch {
    toast('Could not read the captured area. Try a slightly larger box.')
    return
  }
  showShot(cropped)
  await analyzeShot(cropped)
}

async function analyzeShot(dataUrl) {
  running = true
  captureBtn.disabled = true
  explainBtn.disabled = true
  result.innerHTML =
    '<div class="rc"><div class="rc-title"><span class="spinner"></span> Reading your screenshot…</div><p class="sec">Gemini is looking at the captured area.</p></div>'
  try {
    const base64 = dataUrl.split(',')[1]
    const out = await explainImageWithGemini(base64, { apiKey: getApiKey() })
    renderResult({ result: out, engine: 'ai' })
  } catch (e) {
    const msg = e && e.message ? e.message : 'Try selecting a clearer area, or check your key in Settings.'
    result.innerHTML = `<div class="rc"><div class="rc-title">Couldn't read that capture</div><p class="sec">${escapeHtml(msg)}</p></div>`
  } finally {
    running = false
    captureBtn.disabled = false
    explainBtn.disabled = input.value.trim().length === 0
  }
}

/* ------------------------------------------------------------------ */
/*  Captured errors                                                    */
/* ------------------------------------------------------------------ */
async function loadCaptured() {
  const tabId = await activeTabId()
  if (tabId == null) return
  const resp = await sendBg({ type: 'ersense-get-captured', tabId })
  renderCaptured((resp && resp.errors) || [], tabId)
}
function firstLine(t) {
  return (t || '').split('\n').find((l) => l.trim()) || ''
}
function renderCaptured(errors, tabId) {
  if (!errors.length) {
    capturedEl.className = 'captured captured-idle'
    capturedEl.innerHTML =
      '<span class="idle-dot"></span><span>Watching this page for JavaScript errors.</span>' +
      '<span class="idle-hint" title="Auto-capture catches JavaScript errors the page itself throws. For an error shown ON the page (an online compiler output, a Python traceback, a console log) select it and right-click - Explain with ER Sense, or paste it above. Errors typed into the DevTools console cannot be captured by any extension.">?</span>'
    capturedEl.classList.remove('hidden')
    return
  }
  const recent = errors.slice(-5).reverse()
  let h = '<div class="captured-head"><span class="captured-title">⚠ ' + errors.length + ' error' + (errors.length > 1 ? 's' : '') + ' on this page</span><div class="captured-actions"><button class="mini-btn primary" id="explainLatest">Explain latest</button><button class="mini-btn" id="clearCaptured">Clear</button></div></div>'
  h += '<div class="captured-list">'
  recent.forEach((e, i) => {
    h += `<div class="captured-item" data-idx="${i}" title="${escapeHtml(e.text).slice(0, 300)}">${escapeHtml(firstLine(e.text)).slice(0, 120)}</div>`
  })
  h += '</div>'
  capturedEl.className = 'captured'
  capturedEl.innerHTML = h
  capturedEl.classList.remove('hidden')

  $('explainLatest').addEventListener('click', () => {
    input.value = errors[errors.length - 1].text
    refreshMeta()
    explain()
  })
  $('clearCaptured').addEventListener('click', async () => {
    await sendBg({ type: 'ersense-clear-captured', tabId })
    renderCaptured([], tabId)
  })
  capturedEl.querySelectorAll('.captured-item').forEach((el) => {
    el.addEventListener('click', () => {
      input.value = recent[+el.dataset.idx].text
      refreshMeta()
      input.scrollTop = 0
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Pending selection (from context menu)                              */
/* ------------------------------------------------------------------ */
async function loadPending() {
  const resp = await sendBg({ type: 'ersense-get-pending' })
  if (resp && resp.pending) {
    input.value = resp.pending
    refreshMeta()
    explain()
  }
}

/* ------------------------------------------------------------------ */
/*  Settings view                                                      */
/* ------------------------------------------------------------------ */
function showSettings(show) {
  $('settingsView').classList.toggle('hidden', !show)
  $('mainView').classList.toggle('hidden', show)
  if (show) $('apikey').value = getApiKey()
}

$('settingsBtn').addEventListener('click', () => showSettings(true))
$('backBtn').addEventListener('click', () => showSettings(false))
$('toggleKey').addEventListener('click', () => {
  const el = $('apikey')
  const show = el.type === 'password'
  el.type = show ? 'text' : 'password'
  $('toggleKey').textContent = show ? 'Hide' : 'Show'
})
$('testBtn').addEventListener('click', async () => {
  const key = $('apikey').value.trim()
  const status = $('testStatus')
  if (!key) return
  status.textContent = 'Testing...'
  status.style.color = 'var(--subtle)'
  const res = await testApiKey(key)
  status.textContent = res.ok ? '✓ Key works' : res.message
  status.style.color = res.ok ? 'var(--success)' : 'var(--critical)'
})
$('saveKey').addEventListener('click', () => {
  setApiKey($('apikey').value.trim())
  refreshEngine()
  showSettings(false)
})
$('removeKey').addEventListener('click', () => {
  $('apikey').value = ''
  setApiKey('')
  refreshEngine()
  $('testStatus').textContent = ''
})

/* ------------------------------------------------------------------ */
/*  Wire up                                                            */
/* ------------------------------------------------------------------ */
input.addEventListener('input', refreshMeta)
input.addEventListener('scroll', () => {
  syncScroll()
  if (edBand && edBand.classList.contains('show') && curLine) {
    edBand.style.top = PAD_TOP + (curLine - 1) * LINE_H - input.scrollTop + 'px'
  }
})
input.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    explain()
  }
})
explainBtn.addEventListener('click', explain)
if (captureBtn) captureBtn.addEventListener('click', captureRegion)

refreshEngine()
refreshMeta()
loadCaptured()
loadPending()

// Live updates (mainly for the docked side panel, which stays open).
try {
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === 'ersense-refresh-captured') loadCaptured()
    else if (m && m.type === 'ersense-refresh-pending') loadPending()
  })
} catch {
  /* ignore */
}
try {
  chrome.tabs.onActivated.addListener(loadCaptured)
  chrome.tabs.onUpdated.addListener((id, info) => {
    if (info.status === 'complete') loadCaptured()
  })
} catch {
  /* ignore */
}
