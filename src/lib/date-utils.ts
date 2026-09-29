/**
 * Formats a date string or Date object to YYYY-MM-DD format for HTML date inputs.
 * Returns an empty string if the date is invalid or undefined.
 */
export function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return ''

  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''

    // Using toISOString() and split('T')[0] ensures YYYY-MM-DD format
    // Note: ISO string is in UTC, which usually matches what backend provides
    return d.toISOString().split('T')[0]
  } catch (error) {
    console.error('Error formatting date for input:', error)
    return ''
  }
}

type CalendarDateParts = {
  year: number
  month: number
  day: number
}

const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

function getCalendarDateParts(date: string | Date): CalendarDateParts | null {
  if (typeof date === 'string') {
    const match = date.trim().match(ISO_CALENDAR_DATE_PATTERN)

    if (match) {
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      const utcDate = new Date(Date.UTC(year, month - 1, day))

      if (utcDate.getUTCFullYear() === year && utcDate.getUTCMonth() === month - 1 && utcDate.getUTCDate() === day) {
        return { year, month, day }
      }

      return null
    }
  }

  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) return null

  return {
    year: parsedDate.getUTCFullYear(),
    month: parsedDate.getUTCMonth() + 1,
    day: parsedDate.getUTCDate(),
  }
}

/**
 * Formats backend calendar dates without shifting them into the browser timezone.
 */
export function formatCalendarDate(date: string | Date | undefined, locale = 'en-US'): string {
  if (!date) return ''

  const parts = getCalendarDateParts(date)
  if (!parts) return ''

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)))
}
