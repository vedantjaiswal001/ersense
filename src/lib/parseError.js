/**
 * parseError - light, dependency-free heuristics that inspect a raw error
 * or stack trace and pull out the useful structure:
 *   { language, languageLabel, framework, errorType, message, firstLine, frames }
 *
 * These signals drive the offline matcher and enrich the AI prompt.
 */

const LANG_LABELS = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  sql: 'SQL',
  shell: 'Shell',
  unknown: 'Unknown',
}

/* Ordered detectors - first strong match wins. */
const LANGUAGE_TESTS = [
  ['python', /Traceback \(most recent call last\)|File ".*", line \d+|^\s*\w*Error: .*(\n\s+File )|IndentationError|ModuleNotFoundError|(?:^|\n)\s{2,}File "/m],
  ['java', /Exception in thread|\bjava\.(lang|util|io|net)\.|\.java:\d+|at [\w.$]+\([\w$]+\.java:\d+\)/],
  ['csharp', /System\.[A-Z]\w+Exception|at [\w.]+\(.*\) in .*:line \d+|Unhandled exception\. System\./],
  ['go', /\bpanic:|goroutine \d+ \[|\.go:\d+ \+0x/],
  ['rust', /thread '.*' panicked at|-->\s.*\.rs:\d+|\bpanicked at '/],
  ['ruby', /\.rb:\d+:in |NoMethodError|from .*\.rb:\d+|\(irb\):/],
  ['php', /PHP (Fatal|Parse|Warning|Notice)|Stack trace:\n#\d|Uncaught \w+Error.* in .*\.php/],
  ['sql', /SQLSTATE\[|syntax error at or near|ORA-\d{5}|ERROR:\s.*\n\s*LINE \d+|near ".*": syntax error/],
  ['typescript', /\bTS\d{3,}\b|\.tsx?:\d+|error TS\d+|Type '.*' is not assignable to type/],
  ['javascript', /\b(?:Type|Reference|Syntax|Range|Eval|URI)Error\b|Uncaught|at Object\.<anonymous>|node:internal|Cannot read propert|is not a function|is not defined|\.jsx?:\d+/],
  ['shell', /command not found|npm ERR!|bash: |sh: \d+: |permission denied|No such file or directory/],
]

/* Framework / ecosystem hints layered on top of the base language. */
const FRAMEWORK_TESTS = [
  ['React', /React|useState|useEffect|Invalid hook call|Rendered (more|fewer) hooks|Objects are not valid as a React child|Each child in a list|Maximum update depth|hydrat(e|ion)/i],
  ['Next.js', /next\/|Next\.js|getServerSideProps|app router|use client/i],
  ['Node.js', /node:internal|ERR_[A-Z_]+|node_modules|Cannot find module|ECONNREFUSED|EADDRINUSE|ENOENT/],
  ['Vue', /\[Vue warn\]|vue-router|Vuex|createApp/i],
  ['Angular', /NG0\d{3}|@angular\/|ExpressionChangedAfterItHasBeenChecked/],
  ['Django', /django\.|DoesNotExist|ImproperlyConfigured|\bviews\.py\b/],
  ['Flask', /flask|werkzeug/i],
  ['Spring', /org\.springframework|BeanCreationException|NoSuchBeanDefinition/],
  ['TypeScript', /error TS\d+|\.tsx?:\d+|is not assignable to type/],
]

const ERROR_TYPE_PATTERNS = [
  /\b([A-Z][A-Za-z0-9_]*(?:Error|Exception|Warning|Fault|Panic))\b/,
  /\b(SIGSEGV|SIGABRT|EADDRINUSE|ECONNREFUSED|ENOENT|EACCES|ETIMEDOUT)\b/,
  /\berror\s+(TS\d+)\b/i,
  /\b(NG0\d{3})\b/,
  /\b(ORA-\d{5})\b/,
]

function detectLanguage(text) {
  for (const [lang, re] of LANGUAGE_TESTS) {
    if (re.test(text)) return lang
  }
  return 'unknown'
}

function detectFramework(text) {
  for (const [name, re] of FRAMEWORK_TESTS) {
    if (re.test(text)) return name
  }
  return null
}

function detectErrorType(text) {
  for (const re of ERROR_TYPE_PATTERNS) {
    const m = text.match(re)
    if (m) return m[1]
  }
  return null
}

/** Best-guess one-line human message for the error. */
function extractMessage(text, errorType) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // Python: the final "SomeError: message" line is the real one.
  const pyErr = [...lines].reverse().find((l) => /^\w*(Error|Exception):/.test(l))
  if (pyErr) return pyErr

  // JS: "Uncaught TypeError: message" or "TypeError: message"
  if (errorType) {
    const typed = lines.find((l) => l.includes(errorType + ':'))
    if (typed) {
      const idx = typed.indexOf(errorType + ':')
      return typed.slice(idx).replace(/^Uncaught\s+/, '')
    }
  }

  // Otherwise the first non-frame line.
  const firstMeaningful = lines.find(
    (l) => !/^\s*at\s|^File "|^\s*#\d|^-->|^\s*\|/.test(l)
  )
  return firstMeaningful || lines[0] || ''
}

/** Pull file:line frames for a compact "where" summary. */
function extractFrames(text) {
  const frames = []
  const patterns = [
    /at\s+(?:[\w.$<>[\] ]+\s+\()?([^\s()]+:\d+:\d+)\)?/g, // JS
    /File "([^"]+)", line (\d+)/g, // Python
    /([\w./-]+\.\w+):(\d+)/g, // generic file:line
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text)) && frames.length < 6) {
      const loc = m[2] ? `${m[1]}:${m[2]}` : m[1]
      if (loc && !frames.includes(loc)) frames.push(loc)
    }
    if (frames.length) break
  }
  return frames
}

export function parseError(raw) {
  const text = (raw || '').trim()
  if (!text) {
    return {
      language: 'unknown',
      languageLabel: 'Unknown',
      framework: null,
      errorType: null,
      message: '',
      firstLine: '',
      frames: [],
      empty: true,
    }
  }

  const language = detectLanguage(text)
  const framework = detectFramework(text)
  const errorType = detectErrorType(text)
  const message = extractMessage(text, errorType)
  const frames = extractFrames(text)
  const firstLine = text.split('\n')[0].trim()

  return {
    language,
    languageLabel: LANG_LABELS[language] || 'Unknown',
    framework,
    errorType,
    message,
    firstLine,
    frames,
    empty: false,
  }
}

export { LANG_LABELS }
