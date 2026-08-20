import { useEffect, useRef, useState } from 'react'
import { Close, Key, Check, Info, External, Sparkles } from './icons'
import { testApiKey, GEMINI_MODEL_LABEL } from '../lib/gemini'

export default function SettingsModal({ open, onClose, apiKey, onSaveKey }) {
  const [draft, setDraft] = useState(apiKey || '')
  const [show, setShow] = useState(false)
  const [testState, setTestState] = useState(null) // null | 'testing' | {ok, message}
  const closeRef = useRef(null)

  useEffect(() => {
    if (open) {
      setDraft(apiKey || '')
      setTestState(null)
      setTimeout(() => closeRef.current?.focus(), 0)
    }
  }, [open, apiKey])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function handleTest() {
    if (!draft.trim()) return
    setTestState('testing')
    const res = await testApiKey(draft.trim())
    setTestState(res)
  }

  function handleSave() {
    onSaveKey(draft.trim())
    onClose()
  }

  function handleClear() {
    setDraft('')
    onSaveKey('')
    setTestState(null)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="panel relative w-full max-w-lg rise-in"
        style={{ animationDuration: '.3s' }}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-8 w-8 rounded-lg border border-line-strong bg-elevated">
              <Key width={15} height={15} style={{ color: 'var(--brand)' }} />
            </span>
            <h2 className="text-[15px] font-semibold text-fg">Settings</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
          >
            <Close width={16} height={16} />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-auto">
          {/* How to get a key */}
          <div className="rounded-[12px] border border-line bg-inset p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles width={15} height={15} style={{ color: 'var(--brand)' }} />
              <h3 className="text-[13px] font-semibold text-fg">Add your free Gemini key</h3>
              <span className="ml-auto text-[11px] text-subtle">~1 min, no card needed</span>
            </div>
            <ol className="space-y-2.5">
              {[
                <>
                  Open{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand hover:underline inline-flex items-center gap-0.5"
                  >
                    Google AI Studio <External width={11} height={11} />
                  </a>{' '}
                  and sign in with a Google account.
                </>,
                <>
                  Click <span className="text-fg font-medium">Create API key</span> and copy it
                  (it starts with <span className="mono text-fg">AIza…</span>).
                </>,
                <>
                  Paste it in the box below, press <span className="text-fg font-medium">Test key</span>,
                  then <span className="text-fg font-medium">Save</span>.
                </>,
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    className="mono shrink-0 grid place-items-center h-5 w-5 rounded-md text-[11px] font-semibold"
                    style={{ color: 'var(--brand)', background: 'var(--brand-soft)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-muted">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* API key */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="apikey" className="text-[13px] font-medium text-fg">
                Gemini API key
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[12px] text-brand hover:underline"
              >
                Get a free key <External width={12} height={12} />
              </a>
            </div>
            <div className="flex items-center gap-2 rounded-[10px] border border-line-strong bg-inset px-3 h-11 focus-within:border-brand/60 transition-colors">
              <input
                id="apikey"
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setTestState(null)
                }}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                className="mono flex-1 bg-transparent text-[13px] text-fg placeholder:text-faint outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-[11px] font-medium text-subtle hover:text-fg transition-colors"
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={handleTest}
                disabled={!draft.trim() || testState === 'testing'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3 h-8 text-[12px] font-medium text-muted hover:text-fg hover:bg-elevated transition-colors disabled:opacity-40"
              >
                {testState === 'testing' ? (
                  <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Sparkles width={13} height={13} />
                )}
                Test key
              </button>
              {draft && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[12px] font-medium text-subtle hover:text-critical transition-colors px-2 h-8"
                >
                  Remove key
                </button>
              )}
              {testState && testState !== 'testing' && (
                <span
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: testState.ok ? 'var(--success)' : 'var(--critical)' }}
                >
                  {testState.ok ? <Check width={13} height={13} /> : <Info width={13} height={13} />}
                  {testState.ok ? 'Key works' : testState.message}
                </span>
              )}
            </div>

            <p className="flex items-start gap-2 text-[12px] text-subtle leading-relaxed mt-3">
              <Info width={14} height={14} className="mt-0.5 shrink-0" />
              Your key is stored only in this browser and sent directly to Google.
              It never touches any ER Sense server. Without a key, the app runs in
              offline mode using its built-in error library.
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="text-[13px] font-medium text-fg mb-2 block">Model</label>
            <div
              className="flex items-center justify-between rounded-[10px] border px-3.5 h-12"
              style={{ borderColor: 'var(--brand)', background: 'var(--brand-soft)' }}
            >
              <span className="flex items-center gap-2">
                <Sparkles width={15} height={15} style={{ color: 'var(--brand)' }} />
                <span>
                  <span className="text-[13px] font-medium text-fg">{GEMINI_MODEL_LABEL}</span>
                  <span className="mono block text-[11px] text-subtle mt-0.5">
                    auto-selects a working model
                  </span>
                </span>
              </span>
              <Check width={15} height={15} style={{ color: 'var(--brand)' }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 h-16 border-t border-line">
          <button
            onClick={onClose}
            className="rounded-lg px-4 h-9 text-[13px] font-medium text-muted hover:text-fg hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg px-4 h-9 text-[13px] font-semibold text-white transition-all"
            style={{ background: 'var(--brand)', boxShadow: '0 8px 24px -12px var(--brand)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
