/**
 * classify - decide which mode ER Sense should run in, based on what the
 * user pasted:
 *   'error' - a stack trace / error message  → Error Explanation
 *   'code'  - source code, no error text     → Code Doctor
 *   'debug' - both code AND an error together → Debug (most powerful)
 *
 * Also provides numberLines(), which prefixes each line with its number so
 * the model can only ever cite real line numbers (never invent them).
 */

const ERROR_SIGNATURES =
  /Traceback \(most recent call last\)|Exception in thread|Unhandled exception|\bpanic:|\bUncaught\b|\b[A-Z]\w*(Error|Exception)\b|File ".*", line \d+|\bat [\w.$<>[\] ]*\(?[^\s()]+:\d+:\d+\)?|SIGSEGV|core dumped|segmentation fault|error TS\d+|NG0\d{3}|ORA-\d{5}|\bthread '.*' panicked/i

const CODE_LINE =
  /[{};]\s*$|^\s*(def|class|function|public|private|protected|static|void|int|float|double|char|const|let|var|import|from|for|while|if|else|return|print|printf|println|console|System\.|#include|package|func|fn|struct|enum)\b|=>|==|!=|\+=|-=|->|::/

function looksLikeError(text) {
  return ERROR_SIGNATURES.test(text)
}

function looksLikeCode(text) {
  const lines = text.split('\n')
  if (lines.length < 2) {
    return (
      /[{};]|=>|\bdef |\bfunction |print\(|printf\(|console\.|#include|::/.test(text) &&
      !/error|exception|traceback/i.test(text)
    )
  }
  let codeLines = 0
  for (const l of lines) {
    if (CODE_LINE.test(l)) codeLines++
    if (codeLines >= 2) return true
  }
  return false
}

export function classifyInput(raw, parsed) {
  const text = raw || ''
  const hasError = Boolean(parsed?.errorType) || looksLikeError(text)
  const hasCode = looksLikeCode(text)

  if (hasError && hasCode) return 'debug'
  if (hasError) return 'error'
  if (hasCode) return 'code'
  return 'error' // default: treat freeform input as an error message
}

export const MODE_META = {
  error: { label: 'Error Explanation', short: 'Error' },
  code: { label: 'Code Doctor', short: 'Code Doctor' },
  debug: { label: 'Debug Mode', short: 'Debug' },
}

/** Prefix every line with "N\t" so the model references real line numbers. */
export function numberLines(text) {
  return (text || '')
    .split('\n')
    .map((line, i) => `${i + 1}\t${line}`)
    .join('\n')
}
