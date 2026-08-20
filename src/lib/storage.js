/**
 * Thin, safe wrappers around localStorage.
 * Everything is namespaced under `ersense:` and fails quietly if storage
 * is unavailable (private mode, etc.).
 */

const NS = 'ersense:'
const keyFor = (k) => NS + k

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(keyFor(key))
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(keyFor(key), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function remove(key) {
  try {
    localStorage.removeItem(keyFor(key))
  } catch {
    /* ignore */
  }
}

/* ---- API key (bring your own) ------------------------------------ */
export const getApiKey = () => read('apiKey', '') || ''
export const setApiKey = (v) => (v ? write('apiKey', v) : remove('apiKey'))
export const clearApiKey = () => remove('apiKey')

/* ---- Last known-working model (auto-resolved, cached) ------------ */
export const getModel = () => read('model', null)
export const setModel = (v) => write('model', v)

/* ---- Theme -------------------------------------------------------- */
export const getTheme = () => read('theme', 'dark')
export const setTheme = (v) => write('theme', v)

/* ---- History ------------------------------------------------------ */
const HISTORY_LIMIT = 25

export function getHistory() {
  const h = read('history', [])
  return Array.isArray(h) ? h : []
}

export function addHistory(entry) {
  const history = getHistory()
  const next = [entry, ...history].slice(0, HISTORY_LIMIT)
  write('history', next)
  return next
}

export function removeHistory(id) {
  const next = getHistory().filter((e) => e.id !== id)
  write('history', next)
  return next
}

export function clearHistory() {
  write('history', [])
  return []
}
