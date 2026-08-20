import { SeverityBadge, Tag } from './Badges'
import CodeBlock from './CodeBlock'
import CopyButton from './CopyButton'
import IssueCard from './IssueCard'
import IssuesSummary from './IssuesSummary'
import { Info, Book, ArrowUp, Wrench, Sparkles, External, Bolt, Check } from './icons'
import { MODE_META } from '../lib/classify'

function Section({ icon: Icon, label, accent, children, delay = 0 }) {
  return (
    <section className="rise-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="grid place-items-center h-6 w-6 rounded-md border"
          style={{ color: accent, borderColor: accent + '40', background: accent + '12' }}
        >
          <Icon width={13} height={13} />
        </span>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.13em] text-muted">{label}</h3>
      </div>
      {children}
    </section>
  )
}

const MODE_ICON = { error: Info, code: Wrench, debug: Bolt }

function ModeChip({ mode }) {
  const meta = MODE_META[mode] || MODE_META.error
  const Icon = MODE_ICON[mode] || Info
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1 text-[11px] font-medium border"
      style={{ color: 'var(--brand)', borderColor: 'var(--brand)40', background: 'var(--brand-soft)' }}
    >
      <Icon width={12} height={12} /> {meta.label}
    </span>
  )
}

function toPlainText(r) {
  const out = [r.title, '']
  if (r.summary) out.push('OVERVIEW', r.summary, '')
  if (r.rootCause) out.push('ROOT CAUSE', r.rootCause, '')
  if (r.issues?.length) {
    out.push(`ISSUES (${r.issues.length})`)
    r.issues.forEach((it, i) => {
      out.push(`${i + 1}. [${it.severity}]${it.line ? ` line ${it.line}` : ''} ${it.title}`)
      if (it.why) out.push(`   ${it.why}`)
      if (it.before || it.after) out.push(`   ${it.before || ''} -> ${it.after || ''}`)
    })
    out.push('')
  }
  if (r.causes?.length) {
    out.push('LIKELY CAUSES', ...r.causes.map((c, i) => `${i + 1}. ${c}`), '')
  }
  if (r.fixes?.length) {
    out.push('HOW TO FIX')
    r.fixes.forEach((f, i) => {
      out.push(`${i + 1}. ${f.text}`)
      if (f.code) out.push('', f.code, '')
    })
  }
  if (r.fixedCode) out.push('', 'CORRECTED CODE', r.fixedCode)
  if (r.prevention) out.push('', 'PREVENTION', r.prevention)
  return out.join('\n')
}

export default function ResultPanel({ result, engine, note, onJumpToLine }) {
  const mode = result.mode || 'error'
  const hasIssues = result.issues?.length > 0
  const showSummaryCard = hasIssues && (result.issues.length > 1 || mode !== 'error')

  const engineMeta =
    engine === 'ai'
      ? { label: 'Gemini AI', icon: Sparkles, color: 'var(--brand)' }
      : { label: 'Offline library', icon: Book, color: 'var(--info)' }
  const EngineIcon = engineMeta.icon

  const summaryLabel =
    mode === 'code' ? 'Overview' : mode === 'debug' ? 'What happened' : 'What it means'

  return (
    <div className="panel p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <ModeChip mode={mode} />
            <SeverityBadge severity={result.severity} />
            {result.language && <Tag>{result.language}</Tag>}
            {result.framework && <Tag tone="brand">{result.framework}</Tag>}
          </div>
          <h2 className="text-[22px] sm:text-[25px] font-semibold tracking-tight text-fg leading-tight">
            {result.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {result.errorType && <span className="mono text-[12px] text-subtle">{result.errorType}</span>}
            {result.failingLine != null && (
              <button
                type="button"
                onClick={() => onJumpToLine?.(result.failingLine)}
                className="mono inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-critical border border-critical/30 hover:bg-critical/10 transition-colors"
                title="Jump to the failing line"
              >
                <ArrowUp width={11} height={11} className="-rotate-45" /> fails at line {result.failingLine}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5 text-[11px] font-medium border"
            style={{ color: engineMeta.color, borderColor: engineMeta.color + '40', background: engineMeta.color + '10' }}
          >
            <EngineIcon width={13} height={13} /> {engineMeta.label}
          </span>
          <CopyButton text={toPlainText(result)} label="Copy all" />
        </div>
      </div>

      {note && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[12.5px]"
          style={{ color: 'var(--warning)', borderColor: 'var(--warning)33', background: 'var(--warning)10' }}
        >
          <Info width={15} height={15} className="mt-0.5 shrink-0" />
          <span>{note}</span>
        </div>
      )}

      <div className="mt-6 space-y-7">
        {/* Summary */}
        {result.summary && (
          <Section icon={Info} label={summaryLabel} accent="var(--info)" delay={0}>
            <p className="text-[14.5px] leading-relaxed text-fg/90">{result.summary}</p>
          </Section>
        )}

        {/* Root cause */}
        {result.rootCause && (
          <Section icon={ArrowUp} label="Root cause" accent="var(--warning)" delay={50}>
            <p className="text-[14px] leading-relaxed text-fg/85">{result.rootCause}</p>
          </Section>
        )}

        {/* Issues (code / debug / ai with issues) */}
        {hasIssues && (
          <Section icon={Wrench} label={mode === 'error' ? 'The fix' : 'Issues'} accent="var(--critical)" delay={90}>
            <div className="space-y-3">
              {showSummaryCard && <IssuesSummary issues={result.issues} />}
              {result.issues.map((it, i) => (
                <IssueCard key={i} issue={it} index={i} onJump={onJumpToLine} />
              ))}
            </div>
          </Section>
        )}

        {/* Offline path: causes + fixes */}
        {!hasIssues && result.causes?.length > 0 && (
          <Section icon={ArrowUp} label="Likely causes" accent="var(--warning)" delay={60}>
            <ol className="space-y-2.5">
              {result.causes.map((c, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mono shrink-0 grid place-items-center h-5 w-5 rounded-md text-[11px] font-semibold mt-0.5"
                    style={{ color: 'var(--warning)', background: 'var(--warning)15' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[14px] leading-relaxed text-fg/85">{c}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}
        {!hasIssues && result.fixes?.length > 0 && (
          <Section icon={Wrench} label="How to fix" accent="var(--success)" delay={120}>
            <ol className="space-y-4">
              {result.fixes.map((f, i) => (
                <li key={i}>
                  <div className="flex gap-3">
                    <span
                      className="mono shrink-0 grid place-items-center h-5 w-5 rounded-md text-[11px] font-semibold mt-0.5"
                      style={{ color: 'var(--success)', background: 'var(--success)15' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] leading-relaxed text-fg/90">{f.text}</p>
                      {f.code && <CodeBlock code={f.code} />}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Fix all - corrected code */}
        {result.fixedCode && (
          <Section icon={Check} label="Fix all - corrected code" accent="var(--success)" delay={140}>
            <CodeBlock code={result.fixedCode} filename="corrected" />
          </Section>
        )}

        {/* Prevention */}
        {result.prevention && (
          <Section icon={Sparkles} label="Prevention" accent="var(--brand)" delay={160}>
            <p className="text-[14px] leading-relaxed text-fg/85">{result.prevention}</p>
          </Section>
        )}

        {/* Docs (offline) */}
        {result.docs && (
          <a
            href={result.docs.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-[10px] border border-line-strong px-3.5 py-2.5 text-[13px] text-muted hover:text-fg hover:border-brand/50 transition-colors"
          >
            <Book width={15} height={15} />
            {result.docs.label}
            <External width={13} height={13} className="opacity-60" />
          </a>
        )}
      </div>
    </div>
  )
}
