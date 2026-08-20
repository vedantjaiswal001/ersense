import { useEffect } from 'react'
import { Close, Clock, Trash, Sparkles, Book } from './icons'
import { SeverityBadge } from './Badges'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function HistoryPanel({ open, onClose, items, onSelect, onRemove, onClear }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-sm bg-panel border-l border-line shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="History"
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-line">
          <div className="flex items-center gap-2.5">
            <Clock width={17} height={17} style={{ color: 'var(--brand)' }} />
            <h2 className="text-[15px] font-semibold text-fg">History</h2>
            {items.length > 0 && (
              <span className="mono text-[11px] text-subtle">{items.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={onClear}
                className="text-[12px] font-medium text-subtle hover:text-critical transition-colors px-2 h-8"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-fg hover:bg-elevated transition-colors"
            >
              <Close width={16} height={16} />
            </button>
          </div>
        </div>

        <div className="overflow-auto h-[calc(100%-4rem)] p-3">
          {items.length === 0 ? (
            <div className="grid place-items-center text-center h-full px-6">
              <div>
                <Clock width={26} height={26} className="mx-auto text-faint" />
                <p className="text-[13px] text-subtle mt-3">
                  No analyses yet. Explained errors show up here so you can revisit them.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="group rounded-[12px] border border-line hover:border-line-strong bg-inset transition-colors">
                    <button
                      onClick={() => onSelect(item)}
                      className="w-full text-left p-3.5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <SeverityBadge severity={item.severity} />
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-subtle"
                          title={item.engine === 'ai' ? 'Explained by Gemini' : 'Offline library'}
                        >
                          {item.engine === 'ai' ? (
                            <Sparkles width={12} height={12} />
                          ) : (
                            <Book width={12} height={12} />
                          )}
                        </span>
                        <span className="text-[11px] text-faint ml-auto">{timeAgo(item.ts)}</span>
                      </div>
                      <div className="text-[13.5px] font-medium text-fg truncate">{item.title}</div>
                      <div className="mono text-[11px] text-subtle truncate mt-1">
                        {item.preview}
                      </div>
                    </button>
                    <div className="flex items-center justify-between px-3.5 pb-2.5 -mt-1">
                      <span className="text-[11px] text-faint">{item.language || '-'}</span>
                      <button
                        onClick={() => onRemove(item.id)}
                        aria-label="Remove"
                        className="opacity-0 group-hover:opacity-100 grid place-items-center h-6 w-6 rounded-md text-subtle hover:text-critical transition-all"
                      >
                        <Trash width={13} height={13} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
