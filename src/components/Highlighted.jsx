/**
 * Highlighted - a tiny, dependency-free syntax highlighter.
 *
 * It's intentionally language-agnostic: it colors the constructs common to
 * JavaScript, TypeScript, Python, C/C++, Java, Go, and Rust (comments,
 * strings, numbers, keywords, literals, function calls). Good enough to make
 * code read like code, with zero bundle cost.
 */

const KEYWORDS = new Set(
  (
    'function def fn func lambda class struct enum interface trait impl type namespace module ' +
    'return yield await async if elif else for while do switch case break continue default ' +
    'const let var val mut new delete typeof instanceof in of as is import from export using include require ' +
    'try catch finally throw throws raise with pass del global nonlocal ' +
    'public private protected static final abstract virtual override synchronized volatile transient ' +
    'void int long short float double char bool boolean string str byte unsigned signed ' +
    'extends implements super self this package where match when go defer chan map range ' +
    'and or not print println printf echo template operator sizeof goto continue'
  ).split(/\s+/)
)

const LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'nil', 'None', 'True', 'False', 'NaN', 'Infinity', 'self', 'this',
])

const TOKEN_RE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-fA-F]+\b|\b\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([\s\S])/g

function tokenize(code) {
  const src = String(code)
  const out = []
  let m
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(src)) !== null) {
    if (m[1]) out.push({ t: m[0], c: 'hl-c' })
    else if (m[2]) out.push({ t: m[0], c: 'hl-s' })
    else if (m[3]) out.push({ t: m[0], c: 'hl-n' })
    else if (m[4]) {
      const w = m[0]
      if (KEYWORDS.has(w)) out.push({ t: w, c: 'hl-k' })
      else if (LITERALS.has(w)) out.push({ t: w, c: 'hl-l' })
      else if (/^\s*\(/.test(src.slice(TOKEN_RE.lastIndex))) out.push({ t: w, c: 'hl-f' })
      else out.push({ t: w, c: null })
    } else {
      out.push({ t: m[0], c: null })
    }
  }
  return out
}

export default function Highlighted({ code }) {
  const tokens = tokenize(code)
  return (
    <>
      {tokens.map((tok, i) =>
        tok.c ? (
          <span key={i} className={tok.c}>
            {tok.t}
          </span>
        ) : (
          tok.t
        )
      )}
    </>
  )
}
