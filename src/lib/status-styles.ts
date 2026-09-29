export const STATUS_BADGE_BASE_CLASS = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium'

const STATUS_TONE_CLASS = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  neutral: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
} as const

type StatusTone = keyof typeof STATUS_TONE_CLASS

function normalizeStatus(status?: string): string {
  return (status || '').trim().toLowerCase()
}

function getToneClass(tone: StatusTone): string {
  return STATUS_TONE_CLASS[tone]
}

/**
 * Maps a backend status to its tone. One map for every status, everywhere.
 *
 * The criterion is blue while something is happening, green once it ended well:
 * a status must not mean "done" on one screen and "in progress" on another.
 */
export function getStatusTone(status?: string): StatusTone {
  switch (normalizeStatus(status)) {
    case 'inprogress':
      return 'info'
    case 'completed':
    case 'closed':
      return 'success'
    case 'canceling':
    case 'canceled':
      return 'danger'
    case 'pending':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function getStatusClass(status?: string): string {
  return getToneClass(getStatusTone(status))
}
