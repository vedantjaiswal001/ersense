/** Shared severity → label/color mapping used across the result UI. */
export const SEVERITY = {
  critical: { label: 'Critical', color: 'var(--critical)' },
  high: { label: 'High', color: 'var(--critical)' },
  medium: { label: 'Medium', color: 'var(--warning)' },
  low: { label: 'Low', color: 'var(--info)' },
  info: { label: 'Info', color: 'var(--info)' },
}

export const severityMeta = (severity) => SEVERITY[severity] || SEVERITY.medium
