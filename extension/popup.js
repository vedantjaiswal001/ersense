import { analyzeError } from './lib/analyze.js'
import { testApiKey } from './lib/gemini.js'
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

let snippets = [] // copy targets

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
  result.innerHTML = ''
  try {
    const out = await analyzeError(raw, { apiKey: getApiKey() })
    if (out.result) renderResult(out)
  } catch {
    result.innerHTML =
      '<div class="rc"><div class="rc-title">Something went wrong</div><p class="sec">Try again, or check your API key in Settings.</p></div>'
  } finally {
    running = false
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
  // approximate scroll
  const lineH = 12 * 1.55 * 1.35
  input.scrollTop = Math.max(0, (n - 3) * lineH)
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
      '<span class="idle-dot"></span><span>Watching this page &mdash; no errors captured yet.</span>' +
      '<span class="idle-hint" title="Errors thrown by the page are captured automatically. Errors typed into the DevTools console are reported only to DevTools, so no extension can capture those.">?</span>'
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
input.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    explain()
  }
})
explainBtn.addEventListener('click', explain)

refreshEngine()
refreshMeta()
loadCaptured()
loadPending()
