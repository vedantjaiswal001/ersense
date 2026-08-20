/**
 * highlight - dependency-free syntax highlighter (plain JS for the popup).
 * Returns an HTML string of escaped tokens wrapped in <span class="hl-*">.
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
    'and or not print println printf echo template operator sizeof goto'
  ).split(/\s+/)
)
const LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'nil', 'None', 'True', 'False', 'NaN', 'Infinity', 'self', 'this',
])
const TOKEN_RE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-fA-F]+\b|\b\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([\s\S])/g

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function highlightToHTML(code) {
  const src = String(code)
  let html = ''
  let m
  TOKEN_RE.lastIndex = 0
  const wrap = (cls, text) => `<span class="${cls}">${escapeHtml(text)}</span>`
  while ((m = TOKEN_RE.exec(src)) !== null) {
    if (m[1]) html += wrap('hl-c', m[0])
    else if (m[2]) html += wrap('hl-s', m[0])
    else if (m[3]) html += wrap('hl-n', m[0])
    else if (m[4]) {
      const w = m[0]
      if (KEYWORDS.has(w)) html += wrap('hl-k', w)
      else if (LITERALS.has(w)) html += wrap('hl-l', w)
      else if (/^\s*\(/.test(src.slice(TOKEN_RE.lastIndex))) html += wrap('hl-f', w)
      else html += escapeHtml(w)
    } else {
      html += escapeHtml(m[0])
    }
  }
  return html
}
