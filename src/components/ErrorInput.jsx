import { useEffect, useRef, useState } from 'react'
import { Bolt, Trash, Copy as PasteIcon } from './icons'
import { Tag } from './Badges'
import Highlighted from './Highlighted'
import { SAMPLES } from '../lib/samples'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

// Must match the editor's line-height / padding below (text-[12.5px] leading-[1.6]).
const LINE_H = 20
const PAD_TOP = 16

export default function ErrorInput({ value, onChange, onAnalyze, onClear, loading, detected, jump }) {
  const taRef = useRef(null)
  const bodyRef = useRef(null)
  const [highlight, setHighlight] = useState(null) // { line, n }

  // Auto-grow the textarea to fit its content (gutter stays in sync).
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.max(ta.scrollHeight, 168) + 'px'
  }, [value])

  // Jump to + highlight a line when requested from a result.
  useEffect(() => {
    if (!jump?.line) return
    setHighlight({ line: jump.line, n: jump.n })
    const top = PAD_TOP + (jump.line - 1) * LINE_H
    bodyRef.current?.scrollTo({ top: Math.max(0, top - 80), behavior: 'smooth' })
    const t = setTimeout(() => setHighlight(null), 2200)
    return () => clearTimeout(t)
  }, [jump])

  const lineCount = Math.max(value.split('\n').length, 1)
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1)

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onAnalyze()
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) onChange(text)
    } catch {
      taRef.current?.focus()
    }
  }

  const empty = value.trim().length === 0

  return (
    <div className="panel overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3.5 h-12 border-b border-line">
        <div className="flex items-center gap-2 min-w-0">
          <span className="mono text-[11px] uppercase tracking-[0.15em] text-subtle">
            error input
          </span>
          {detected?.languageLabel && detected.languageLabel !== 'Unknown' && (
            <Tag>{detected.languageLabel}</Tag>
          )}
          {detected?.framework && <Tag tone="brand">{detected.framework}</Tag>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePaste}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-subtle hover:text-fg hover:bg-elevated transition-colors"
          >
            <PasteIcon width={13} height={13} /> Paste
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={empty}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-subtle hover:text-fg hover:bg-elevated transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Trash width={13} height={13} /> Clear
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div ref={bodyRef} className="relative flex bg-inset max-h-[46vh] overflow-auto">
        {highlight && (
          <div
            key={highlight.n}
            className="pointer-events-none absolute left-0 right-0 z-0 fade-in"
            style={{
              top: PAD_TOP + (highlight.line - 1) * LINE_H,
              height: LINE_H,
              background: 'var(--brand-soft)',
              boxShadow: 'inset 3px 0 0 var(--brand)',
            }}
          />
        )}
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div className="scanline" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="relative z-20 mono select-none text-right text-[12.5px] leading-[1.6] py-4 pl-4 pr-3 text-faint border-r border-line sticky left-0 bg-inset"
        >
          {lines.map((n) => (
            <div
              key={n}
              style={highlight?.line === n ? { color: 'var(--brand)', fontWeight: 600 } : undefined}
            >
              {n}
            </div>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          {/* Syntax-highlighted layer sitting behind a transparent-text textarea */}
          <pre
            aria-hidden="true"
            className="mono pointer-events-none absolute inset-0 z-[1] m-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-4 text-[12.5px] leading-[1.6] text-fg"
          >
            {value ? (
              <>
                <Highlighted code={value} />
                {'\n'}
              </>
            ) : null}
          </pre>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder={
              'Paste your error, stack trace, or code here…\n\nUncaught TypeError: Cannot read properties of undefined (reading ‘map’)\n    at App (App.jsx:24:18)'
            }
            className="mono relative z-10 block w-full resize-none bg-transparent px-4 py-4 text-[12.5px] leading-[1.6] text-transparent placeholder:text-faint outline-none whitespace-pre-wrap break-words"
            style={{ minHeight: 168, caretColor: 'var(--brand)' }}
          />
        </div>
      </div>

      {/* Sample chips (only when empty) */}
      {empty && (
        <div className="px-4 py-3 border-t border-line flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-subtle mr-1">Try one:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onChange(s.text)}
              className="mono text-[11px] rounded-full px-2.5 py-1 border border-line-strong text-muted hover:text-fg hover:border-brand/50 hover:bg-elevated transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Footer / action */}
      <div className="flex items-center justify-between gap-3 px-3.5 h-14 border-t border-line bg-panel">
        <span className="text-[11px] text-subtle tabular-nums">
          {value.length.toLocaleString()} chars · {lineCount} lines
        </span>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={empty || loading}
          className="group inline-flex items-center gap-2 rounded-[10px] pl-3.5 pr-3 h-9 text-[13px] font-semibold text-white transition-all disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            background: 'var(--brand)',
            boxShadow: empty ? 'none' : '0 8px 24px -10px var(--brand)',
          }}
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Bolt width={15} height={15} />
              Explain error
              <kbd className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide">
                {isMac ? '⌘' : 'Ctrl'} ⏎
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
