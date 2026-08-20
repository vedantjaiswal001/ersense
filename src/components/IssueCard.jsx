import { severityMeta } from '../lib/severity'
import CopyButton from './CopyButton'
import { ArrowUp } from './icons'

function BeforeAfter({ before, after }) {
  if (!before && !after) return null
  const multiline = (before && before.includes('\n')) || (after && after.includes('\n'))

  if (multiline) {
    return (
      <div className="mt-3 space-y-2">
        {before && (
          <div className="rounded-lg border border-critical/25 bg-critical/5 overflow-hidden">
            <div className="mono text-[10px] uppercase tracking-[0.14em] px-3 pt-2 text-critical/80">before</div>
            <pre className="mono text-[12px] leading-[1.6] px-3 pb-2.5 overflow-x-auto text-fg/85">{before}</pre>
          </div>
        )}
        {after && (
          <div className="rounded-lg border border-success/25 bg-success/5 overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="mono text-[10px] uppercase tracking-[0.14em] text-success/80">after</span>
              <CopyButton text={after} label="Copy" />
            </div>
            <pre className="mono text-[12px] leading-[1.6] px-3 pb-2.5 overflow-x-auto text-fg/90">{after}</pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
      {before && (
        <code className="mono rounded-md px-2 py-1 border border-critical/25 bg-critical/8 text-critical/90 line-through decoration-critical/40">
          {before}
        </code>
      )}
      {before && after && <span className="text-subtle">→</span>}
      {after && (
        <code className="mono rounded-md px-2 py-1 border border-success/30 bg-success/10 text-success">
          {after}
        </code>
      )}
    </div>
  )
}

export default function IssueCard({ issue, index, onJump }) {
  const meta = severityMeta(issue.severity)

  return (
    <div
      className="rounded-[14px] border bg-inset overflow-hidden rise-in"
      style={{ borderColor: meta.color + '2e', animationDelay: `${index * 55}ms` }}
    >
      {/* accent rail + header */}
      <div className="flex items-stretch">
        <span className="w-1 shrink-0" style={{ background: meta.color }} />
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-0.5 text-[11px] font-semibold"
              style={{ color: meta.color, background: meta.color + '18' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </span>

            {issue.line != null && (
              <button
                type="button"
                onClick={() => onJump?.(issue.line)}
                className="mono inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted border border-line-strong hover:text-brand hover:border-brand/50 transition-colors"
                title="Jump to this line"
              >
                <ArrowUp width={11} height={11} className="-rotate-45" />
                Line {issue.line}
              </button>
            )}

            {issue.type && (
              <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
                {issue.type.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <h4 className="text-[14.5px] font-semibold text-fg leading-snug">{issue.title}</h4>

          {issue.expression && (
            <code className="mono inline-block mt-1.5 rounded-md px-2 py-0.5 text-[12px] bg-elevated border border-line text-brand-strong">
              {issue.expression}
            </code>
          )}

          {issue.why && (
            <p className="text-[13.5px] leading-relaxed text-fg/80 mt-2">{issue.why}</p>
          )}

          <BeforeAfter before={issue.before} after={issue.after} />
        </div>
      </div>
    </div>
  )
}
