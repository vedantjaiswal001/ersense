/**
 * analyze - the orchestrator. Parses the input, classifies the mode
 * (error / code / debug), then routes to Gemini or the offline knowledge
 * base, with a graceful fallback if the AI call fails.
 */
import { parseError } from './parseError'
import { classifyInput } from './classify'
import { matchOfflineToResult } from './offlineDb'
import { explainWithGemini, GeminiError } from './gemini'

export async function analyzeError(raw, { apiKey, forceOffline = false, signal } = {}) {
  const parsed = parseError(raw)

  if (parsed.empty) {
    return { parsed, result: null, engine: 'none', error: 'empty', mode: 'error' }
  }

  const mode = classifyInput(raw, parsed)
  const useAi = apiKey && !forceOffline

  if (useAi) {
    try {
      const result = await explainWithGemini(raw, parsed, { apiKey, mode, signal })
      return { parsed, result, engine: 'ai', mode: result.mode || mode }
    } catch (e) {
      if (e?.name === 'AbortError') throw e
      const result = matchOfflineToResult(raw, parsed)
      result.mode = 'error'
      const note =
        e instanceof GeminiError
          ? `AI unavailable (${e.message}) - showing offline analysis.`
          : 'AI unavailable - showing offline analysis.'
      return { parsed, result, engine: 'offline', note, degraded: true, mode: 'error' }
    }
  }

  const result = matchOfflineToResult(raw, parsed)
  result.mode = 'error'
  // In offline mode we can't do Code Doctor / Debug analysis (that needs AI).
  const note =
    mode !== 'error'
      ? 'Code Doctor and Debug mode need a Gemini key - add one in Settings. Showing a basic offline read.'
      : null
  return { parsed, result, engine: 'offline', note, mode: 'error' }
}
