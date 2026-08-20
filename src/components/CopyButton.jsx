import { useState } from 'react'
import { Copy, Check } from './icons'

export default function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for insecure contexts
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-subtle hover:text-fg hover:bg-elevated transition-colors"
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? (
        <Check width={13} height={13} style={{ color: 'var(--success)' }} />
      ) : (
        <Copy width={13} height={13} />
      )}
      {copied ? 'Copied' : label}
    </button>
  )
}
