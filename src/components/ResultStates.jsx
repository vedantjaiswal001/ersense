import { Info, ArrowUp, Wrench, Sparkles, Bolt, Book } from './icons'

export function LoadingResult() {
  return (
    <div className="panel p-5 sm:p-6 fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-7 w-2/3 rounded-md mb-6" />
      {[Info, ArrowUp, Wrench].map((Icon, s) => (
        <div key={s} className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <div className="skeleton h-6 w-6 rounded-md" />
            <div className="skeleton h-3.5 w-28 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3.5 w-[92%] rounded" />
            <div className="skeleton h-3.5 w-[78%] rounded" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 text-[12px] text-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-brand pulse-dot" />
        Reading the stack trace…
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, body, color }) {
  return (
    <div className="flex gap-3">
      <span
        className="grid place-items-center h-8 w-8 shrink-0 rounded-lg border"
        style={{ color, borderColor: color + '33', background: color + '10' }}
      >
        <Icon width={15} height={15} />
      </span>
      <div>
        <div className="text-[13.5px] font-medium text-fg">{title}</div>
        <div className="text-[12.5px] text-subtle leading-relaxed mt-0.5">{body}</div>
      </div>
    </div>
  )
}

export function EmptyResult({ onOpenSettings }) {
  return (
    <div className="panel p-6 sm:p-8 flex flex-col justify-center min-h-[420px] relative overflow-hidden">
      <div
        className="absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-60 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--brand-soft), transparent 70%)' }}
      />
      <div className="relative">
        <span className="grid place-items-center h-12 w-12 rounded-2xl border border-line-strong bg-elevated mb-5">
          <Bolt width={22} height={22} style={{ color: 'var(--brand)' }} />
        </span>
        <h2 className="text-[20px] font-semibold tracking-tight text-fg">
          Your explanation appears here
        </h2>
        <p className="text-[13.5px] text-subtle leading-relaxed mt-2 max-w-md">
          Paste an error on the left and hit <span className="text-muted font-medium">Explain error</span>.
          ER Sense reads the stack trace, then breaks it down into plain English -
          what it means, why it happened, and exactly how to fix it.
        </p>

        <div className="mt-7 space-y-4 max-w-md">
          <Feature
            icon={Info}
            color="var(--info)"
            title="Plain-English translation"
            body="No jargon - a clear read of what the runtime actually tried to do and why it failed."
          />
          <Feature
            icon={ArrowUp}
            color="var(--warning)"
            title="Ranked likely causes"
            body="The real-world reasons this error shows up, ordered most-likely first."
          />
          <Feature
            icon={Wrench}
            color="var(--success)"
            title="Concrete fixes with code"
            body="Copy-pasteable snippets and steps, tailored to your language and framework."
          />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-[10px] px-3.5 h-9 text-[13px] font-semibold text-white transition-all"
            style={{ background: 'var(--brand)', boxShadow: '0 8px 24px -12px var(--brand)' }}
          >
            <Sparkles width={15} height={15} /> Get your free key
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-subtle">
            <Book width={14} height={14} /> or use offline mode for common errors
          </span>
        </div>
      </div>
    </div>
  )
}
