/** ER Sense wordmark - a coral vitals-pulse mark (error → triage → sense). */
export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="relative grid place-items-center h-9 w-9 rounded-[11px] bg-elevated border border-line-strong overflow-hidden">
        <span
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 40%, var(--brand-soft), transparent 75%)',
          }}
        />
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="relative"
          aria-hidden="true"
        >
          <path
            d="M2 12.5h4.5L9 6.5l4 11 2.4-5.5 1.4 2.5H22"
            stroke="var(--brand)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.8" cy="14.5" r="1.5" fill="var(--brand)" className="pulse-dot" />
        </svg>
      </span>
      {!compact && (
        <div className="leading-none">
          <div className="flex items-baseline gap-[3px]">
            <span className="text-[17px] font-semibold tracking-tight text-fg">
              ER
            </span>
            <span className="text-[17px] font-semibold tracking-tight text-brand">
              Sense
            </span>
          </div>
          <div className="mono text-[10.5px] uppercase tracking-[0.18em] text-subtle mt-1">
            error triage
          </div>
        </div>
      )}
    </div>
  )
}
