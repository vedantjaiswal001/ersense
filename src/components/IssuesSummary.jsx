import { severityMeta } from '../lib/severity'

const ORDER = ['critical', 'high', 'medium', 'low', 'info']

export default function IssuesSummary({ issues }) {
  const counts = {}
  for (const it of issues) counts[it.severity] = (counts[it.severity] || 0) + 1
  const present = ORDER.filter((s) => counts[s])
  const total = issues.length
  const worst = present[0] || 'medium'
  const worstColor = severityMeta(worst).color

  return (
    <div
      className="rounded-[14px] border p-4 flex items-center justify-between gap-4 flex-wrap"
      style={{ borderColor: worstColor + '33', background: worstColor + '0d' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid place-items-center h-10 w-10 rounded-xl text-[17px] font-bold"
          style={{ color: worstColor, background: worstColor + '1a' }}
        >
          {total}
        </span>
        <div>
          <div className="text-[15px] font-semibold text-fg leading-tight">
            {total} {total === 1 ? 'issue' : 'issues'} found
          </div>
          <div className="text-[12px] text-subtle mt-0.5">ordered by severity</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {present.map((s) => {
          const m = severityMeta(s)
          return (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1 text-[11.5px] font-medium border"
              style={{ color: m.color, borderColor: m.color + '44', background: m.color + '12' }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
              {m.label} {counts[s]}
            </span>
          )
        })}
      </div>
    </div>
  )
}
