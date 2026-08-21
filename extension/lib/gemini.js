/**
 * gemini - bring-your-own-key client for Google's Gemini API (free tier).
 *
 * The key lives only in the user's browser (localStorage) and is sent
 * directly to Google's endpoint. Nothing is proxied through a server, so
 * there are no secrets in this repo and no backend to pay for.
 *
 * Model resolution is fully self-healing: ER Sense asks Google's ListModels
 * endpoint which models THIS key can actually use, picks the best free Flash
 * model available, and caches it. This keeps working forever, even as Google
 * retires or renames model versions (gemini-2.0-flash, 2.5-flash, ...).
 *
 * Get a free key: https://aistudio.google.com/apikey
 */
import { getModel, setModel } from './storage.js'
import { numberLines } from './classify.js'

export const GEMINI_MODEL_LABEL = 'Gemini Flash (auto)'

/** Fallback names to try if ListModels can't be reached for some reason. */
export const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
]

const BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GEN_ENDPOINT = (model, key) =>
  `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`
const LIST_ENDPOINT = (key) =>
  `${BASE}/models?key=${encodeURIComponent(key)}&pageSize=1000`

const SYSTEM_INSTRUCTION = `You are ER Sense, an expert debugging assistant for software developers.
You run in one of three modes, given to you as MODE:
- "error": the input is an error message / stack trace. Explain it.
- "code": the input is source code with no error. Find every bug that would make it crash or misbehave at runtime.
- "debug": the input is code AND its error together. Explain the error, then find all related bugs in the code and prioritize them.

Absolute rules:
- Be precise and concrete. No filler, no motivational language, no emojis.
- LINE NUMBERS: If the input is provided as NUMBERED SOURCE (each line prefixed with "N\\t"), every "line" you report MUST be one of those exact numbers. Never invent, shift, or guess a line number. If you cannot tie an issue to a specific supplied line, set "line" to null.
- "expression" must be the exact offending token/snippet copied from that line (short), or null.
- "before"/"after" are minimal code fragments showing the fix (e.g. "i <= n" -> "i < n"). Use null when a fix is purely instructional.
- Order "issues" by severity, most severe first. Severity is one of: "critical" (crash/data loss), "high" (breaks a feature), "medium" (recoverable/local), "low" (warning), "info".
- List EVERY distinct issue in code/debug mode. In error mode, "issues" usually has a single entry (the fix for that error) or may be empty if the fix is described in rootCause/fixedCode.
- "fixedCode" (code/debug mode) is the FULL corrected source, ready to paste. Use null in error mode unless you have the full source.
- Identify language, framework (or null), and errorType (exception class/code, or null).

Respond with ONLY a JSON object, no markdown fences, exactly this shape:
{
  "mode": "error|code|debug",
  "title": "short human label for the overall problem (max 6 words)",
  "language": "e.g. C, Python, JavaScript, or null",
  "framework": "e.g. React, Node.js, or null",
  "errorType": "e.g. IndexError, NullPointerException, or null",
  "severity": "overall severity: critical|high|medium|low|info",
  "summary": "2-3 sentence plain-English overview of what is wrong",
  "rootCause": "the underlying cause in one or two sentences, or null",
  "failingLine": 0,
  "prevention": "one concrete habit/technique to avoid this class of bug in future, or null",
  "issues": [
    {
      "line": 0,
      "severity": "critical|high|medium|low|info",
      "type": "short_snake_case_slug e.g. out_of_bounds, null_deref, key_error",
      "title": "short issue label (max 6 words)",
      "expression": "exact offending snippet or null",
      "why": "one-sentence reason it is wrong",
      "before": "minimal buggy fragment or null",
      "after": "minimal fixed fragment or null"
    }
  ],
  "fixedCode": "full corrected source code, or null"
}
Use null (not the number 0) for "line"/"failingLine" when unknown.`

function buildUserPrompt(raw, parsed, mode = 'error') {
  const hints = []
  if (parsed?.languageLabel && parsed.languageLabel !== 'Unknown')
    hints.push(`Detected language: ${parsed.languageLabel}`)
  if (parsed?.framework) hints.push(`Detected framework: ${parsed.framework}`)
  if (parsed?.errorType) hints.push(`Detected error type: ${parsed.errorType}`)
  const hintBlock = hints.length ? `\nHints (may be wrong, verify): ${hints.join('; ')}` : ''

  const clipped = raw.slice(0, 8000)

  if (mode === 'code' || mode === 'debug') {
    const numbered = numberLines(clipped)
    return `MODE: ${mode}${hintBlock}\n\nNUMBERED SOURCE (cite ONLY these line numbers):\n"""\n${numbered}\n"""`
  }
  return `MODE: ${mode}${hintBlock}\n\nERROR / STACK TRACE:\n"""\n${clipped}\n"""`
}

/** Strip ```json fences and grab the first {...} block if the model wraps it. */
function extractJson(text) {
  let t = (text || '').trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new Error('Model did not return valid JSON.')
  }
}

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']

function toInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function normalizeIssue(it) {
  if (!it || typeof it !== 'object') return null
  const severity = SEVERITIES.includes(it.severity) ? it.severity : 'medium'
  return {
    line: toInt(it.line),
    severity,
    type: it.type ? String(it.type) : null,
    title: String(it.title || it.type || 'Issue'),
    expression: it.expression ? String(it.expression) : null,
    why: it.why ? String(it.why) : '',
    before: it.before != null ? String(it.before) : null,
    after: it.after != null ? String(it.after) : null,
  }
}

function normalize(obj, parsed, mode) {
  const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : [])
  const issues = asArray(obj.issues).map(normalizeIssue).filter(Boolean)
  const severity = SEVERITIES.includes(obj.severity)
    ? obj.severity
    : issues[0]?.severity || 'medium'

  return {
    source: 'ai',
    matched: true,
    mode: obj.mode || mode || 'error',
    title: obj.title || parsed?.errorType || 'Explained',
    severity,
    language: obj.language || parsed?.languageLabel || null,
    framework: obj.framework || parsed?.framework || null,
    errorType: obj.errorType || parsed?.errorType || null,
    summary: obj.summary || '',
    rootCause: obj.rootCause || null,
    failingLine: toInt(obj.failingLine),
    prevention: obj.prevention || null,
    issues,
    fixedCode: obj.fixedCode && String(obj.fixedCode).trim() ? String(obj.fixedCode) : null,
    // legacy fields (used by the offline renderer path)
    causes: [],
    fixes: [],
    docs: null,
  }
}

export class GeminiError extends Error {
  constructor(message, kind) {
    super(message)
    this.name = 'GeminiError'
    this.kind = kind // 'auth' | 'rate' | 'network' | 'parse' | 'server' | 'unknown'
  }
}

function messageForStatus(status, bodyText) {
  if (status === 400) {
    if (/api[_ ]?key/i.test(bodyText || ''))
      return new GeminiError('Your API key is invalid. Double-check it in Settings.', 'auth')
    return new GeminiError('That model rejected the request.', 'server')
  }
  if (status === 401 || status === 403)
    return new GeminiError('Your API key was rejected. Make sure it is correct and that the Generative Language API is enabled for it.', 'auth')
  if (status === 404) return new GeminiError('That model is not available for this key.', 'server')
  if (status === 429)
    return new GeminiError('Rate limit reached for the free tier. Wait a minute and try again.', 'rate')
  if (status >= 500) return new GeminiError('Google returned a temporary server error.', 'server')
  return new GeminiError(`Request failed (HTTP ${status}). ${bodyText?.slice(0, 140) || ''}`, 'unknown')
}

/* ------------------------------------------------------------------ *
 *  Model discovery
 * ------------------------------------------------------------------ */

/** Rank available model IDs, best free text model first (prefer Flash). */
function rankModels(names) {
  const bad = /embedding|aqa|imagen|image|vision|tts|audio|dialog|live|learnlm|gemma|nano|robotics|computer-use/i
  const usable = [...new Set(names)].filter((n) => /gemini/i.test(n) && !bad.test(n))
  const flashes = usable.filter((n) => /flash/i.test(n))
  const pool = flashes.length ? flashes : usable
  const version = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0')
  const score = (n) => {
    let s = version(n) * 10
    if (/flash/i.test(n) && !/lite/i.test(n)) s += 5 // full flash over lite
    else if (/lite/i.test(n)) s += 2
    if (/-latest$/.test(n)) s += 1
    if (/preview|exp|-\d{3,}$/i.test(n)) s -= 4 // dated previews lower
    return s
  }
  return pool.sort((a, b) => score(b) - score(a)).slice(0, 6)
}

/**
 * Ask Google which models this key can use for generateContent, ranked.
 * Throws GeminiError on auth/rate/network problems.
 */
export async function discoverModels(apiKey, signal) {
  let res
  try {
    res = await fetch(LIST_ENDPOINT(apiKey), { signal })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new GeminiError('Could not reach Google. Check your internet connection.', 'network')
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw messageForStatus(res.status, t)
  }
  const data = await res.json().catch(() => null)
  const names = (data?.models || [])
    .filter((m) => (m.supportedGenerationMethods || m.supportedActions || []).includes('generateContent'))
    .map((m) => (m.name || '').replace(/^models\//, ''))
    .filter(Boolean)
  return rankModels(names)
}

/* ------------------------------------------------------------------ *
 *  Generation
 * ------------------------------------------------------------------ */

const VISION_PROMPT = `MODE: debug
The input is a SCREENSHOT from a developer's screen - it may be from an online judge (LeetCode, HackerRank), an online compiler, an IDE, a terminal, or a browser.

Read everything relevant in the image: the source code, any error message or stack trace, and any "Wrong Answer" / expected-vs-actual output that is shown.
- If it shows code together with a wrong/expected output or an error, treat it as debug mode: explain what is going wrong, then list every distinct bug that causes it, most severe first.
- Transcribe the code accurately from the image.
- LINE NUMBERS: use a line number ONLY if it is clearly visible in the code's gutter in the screenshot; otherwise set every "line"/"failingLine" to null. Never guess a number that is not visible.
- "fixedCode" must be the full corrected source you can read from the image.
- If the image contains no code or error at all, return a result whose summary says no code or error was found in the capture.
Respond with ONLY the JSON object described in the system instruction.`

function textRequestBody(raw, parsed, mode, { noThinkingConfig = false } = {}) {
  return assembleBody([{ text: buildUserPrompt(raw, parsed, mode) }], { noThinkingConfig })
}

function imageRequestBody(base64, mimeType, { noThinkingConfig = false } = {}) {
  return assembleBody(
    [{ text: VISION_PROMPT }, { inline_data: { mime_type: mimeType || 'image/png', data: base64 } }],
    { noThinkingConfig },
  )
}

function assembleBody(parts, { noThinkingConfig = false } = {}) {
  const generationConfig = {
    temperature: 0.2,
    topP: 0.9,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
  }
  // Disable the model's internal "thinking" pass for a much faster answer.
  // Some models don't accept this field; the caller retries without it.
  if (!noThinkingConfig) generationConfig.thinkingConfig = { thinkingBudget: 0 }

  return {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts }],
    generationConfig,
  }
}

async function post(model, apiKey, body, signal) {
  return fetch(GEN_ENDPOINT(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

/**
 * Shared generation loop: try the cached model, then models Google says this
 * key can use, then known fallbacks. `body`/`bodyNoThink` are prebuilt request
 * bodies (text or image). Returns a normalized result, or throws GeminiError.
 */
async function generate({ body, bodyNoThink, parsed, mode, apiKey, signal }) {
  const tried = new Set()
  let lastError = null

  // POST to a model; if it rejects the thinkingConfig field (400), retry once
  // without it so models that don't support the setting still work.
  async function send(model) {
    let res = await post(model, apiKey, body, signal)
    if (!res.ok && res.status === 400) {
      const peek = await res.clone().text().catch(() => '')
      if (/think/i.test(peek)) res = await post(model, apiKey, bodyNoThink, signal)
    }
    return res
  }

  async function tryModels(models) {
    for (const model of models) {
      if (!model || tried.has(model)) continue
      tried.add(model)
      let res
      try {
        res = await send(model)
      } catch (e) {
        if (e?.name === 'AbortError') throw e
        throw new GeminiError('Could not reach Google. Check your internet connection.', 'network')
      }
      if (res.ok) {
        const data = await res.json().catch(() => null)
        const cand = data?.candidates?.[0]
        if (cand?.finishReason === 'SAFETY') {
          lastError = new GeminiError('The response was blocked by a safety filter.', 'server')
          continue
        }
        const text = cand?.content?.parts?.map((p) => p.text).join('') || ''
        if (!text) {
          lastError = new GeminiError('The model returned an empty response.', 'parse')
          continue
        }
        let pj
        try {
          pj = extractJson(text)
        } catch {
          lastError = new GeminiError('Could not parse the model response as JSON.', 'parse')
          continue
        }
        setModel(model)
        return normalize(pj, parsed, mode)
      }
      const errText = await res.text().catch(() => '')
      const err = messageForStatus(res.status, errText)
      if (err.kind === 'auth' || err.kind === 'rate') throw err
      lastError = err
    }
    return null
  }

  // 1. Fast path: a previously-working model cached from a past run.
  const cached = getModel()
  if (cached) {
    const r = await tryModels([cached])
    if (r) return r
  }

  // 2. Authoritative: ask Google what this key can actually use.
  let discovered = []
  try {
    discovered = await discoverModels(apiKey, signal)
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    if (e.kind === 'auth' || e.kind === 'rate' || e.kind === 'network') throw e
    lastError = e
  }
  const r2 = await tryModels(discovered)
  if (r2) return r2

  // 3. Last resort: known model names.
  const r3 = await tryModels(MODEL_CANDIDATES)
  if (r3) return r3

  throw lastError || new GeminiError('No Gemini model was available for this key.', 'server')
}

/**
 * Ask Gemini to explain an error/code. Uses the cached working model, else
 * discovers a valid model for this key, else falls back to known names.
 * Returns a normalized result, or throws a GeminiError.
 */
export async function explainWithGemini(raw, parsed, { apiKey, mode = 'error', signal } = {}) {
  if (!apiKey) throw new GeminiError('No API key set.', 'auth')
  return generate({
    body: textRequestBody(raw, parsed, mode),
    bodyNoThink: textRequestBody(raw, parsed, mode, { noThinkingConfig: true }),
    parsed,
    mode,
    apiKey,
    signal,
  })
}

/**
 * Ask Gemini to read a screenshot (base64 PNG/JPEG, no data: prefix) and
 * explain the code/error/wrong-output it shows. Vision needs the API key, so
 * there is no offline fallback for this path. Returns a normalized result.
 */
export async function explainImageWithGemini(base64, { apiKey, mimeType = 'image/png', signal } = {}) {
  if (!apiKey) throw new GeminiError('No API key set.', 'auth')
  if (!base64) throw new GeminiError('The capture was empty. Select an area with some text in it.', 'parse')
  return generate({
    body: imageRequestBody(base64, mimeType),
    bodyNoThink: imageRequestBody(base64, mimeType, { noThinkingConfig: true }),
    parsed: null,
    mode: 'debug',
    apiKey,
    signal,
  })
}

/**
 * Key check for the Settings "Test" button. ListModels is the cleanest probe:
 * if it succeeds the key is valid, and we cache the best model for later.
 */
export async function testApiKey(apiKey) {
  if (!apiKey) return { ok: false, message: 'Enter a key first.' }
  try {
    const models = await discoverModels(apiKey)
    if (models.length) {
      setModel(models[0])
      return { ok: true, model: models[0] }
    }
    return { ok: false, message: 'This key has no usable text models. Create a new key at aistudio.google.com/apikey.' }
  } catch (e) {
    if (e instanceof GeminiError) return { ok: false, message: e.message }
    return { ok: false, message: 'Could not reach Google. Check your connection.' }
  }
}
