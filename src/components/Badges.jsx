import { severityMeta } from '../lib/severity'

export function SeverityBadge({ severity = 'medium' }) {
  const s = severityMeta(severity)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1 text-[11px] font-medium border"
      style={{
        color: s.color,
        borderColor: s.color + '55',
        background: s.color + '14',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
      />
      {s.label}
    </span>
  )
}

export function Tag({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'text-muted border-line-strong bg-elevated',
    brand: 'text-brand border-brand/40',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${tones[tone]}`}
      style={tone === 'brand' ? { background: 'var(--brand-soft)' } : undefined}
    >
      {children}
    </span>
  )
}
