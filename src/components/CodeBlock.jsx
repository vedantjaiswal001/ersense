import CopyButton from './CopyButton'
import Highlighted from './Highlighted'

export default function CodeBlock({ code, filename }) {
  const clean = String(code).replace(/\n+$/, '')
  return (
    <div className="mt-2.5 rounded-[10px] border border-line bg-inset overflow-hidden">
      <div className="flex items-center justify-between h-8 pl-3 pr-1.5 border-b border-line/70">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--line-strong)' }} />
          <span className="mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {filename || 'snippet'}
          </span>
        </div>
        <CopyButton text={code} label="Copy" />
      </div>
      <pre className="mono text-[12px] leading-[1.65] p-3.5 overflow-x-auto">
        <code>
          <Highlighted code={clean} />
        </code>
      </pre>
    </div>
  )
}
