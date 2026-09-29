export const TABLE_STATUS_ENUM = {
  PENDING: 'pending',
  IN_PROGRESS: 'inprogress',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  CANCELED: 'canceled',
} as const

export type TableStatusValue = (typeof TABLE_STATUS_ENUM)[keyof typeof TABLE_STATUS_ENUM]

const TABLE_STATUS_LABELS: Record<TableStatusValue, string> = {
  pending: 'Pending',
  inprogress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
  canceled: 'Canceled',
}

function normalizeStatus(status?: string): string {
  return (status || '').trim().toLowerCase()
}

function humanizeStatus(rawStatus: string): string {
  return rawStatus
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getStatusLabel(status?: string, fallback = 'N/A'): string {
  if (!status) return fallback

  const normalized = normalizeStatus(status)
  return TABLE_STATUS_LABELS[normalized as TableStatusValue] || humanizeStatus(status)
}
