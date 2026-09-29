import { describe, expect, it } from 'vitest'
import { formatCalendarDate, formatDateForInput } from './date-utils'

describe('formatDateForInput', () => {
  it('should format an ISO date string to YYYY-MM-DD', () => {
    expect(formatDateForInput('2024-03-26T00:00:00.000Z')).toBe('2024-03-26')
    expect(formatDateForInput('2024-12-31T23:59:59.999Z')).toBe('2024-12-31')
  })

  it('should format a short date string to YYYY-MM-DD', () => {
    // Note: Depends on local timezone if no T present, but usually works for ISO partials
    expect(formatDateForInput('2024-03-26')).toBe('2024-03-26')
  })

  it('should format a Date object to YYYY-MM-DD', () => {
    const date = new Date('2024-03-26T12:00:00Z')
    expect(formatDateForInput(date)).toBe('2024-03-26')
  })

  it('should return an empty string for undefined or empty input', () => {
    expect(formatDateForInput(undefined)).toBe('')
    expect(formatDateForInput('')).toBe('')
  })

  it('should return an empty string for invalid date strings', () => {
    expect(formatDateForInput('not-a-date')).toBe('')
    expect(formatDateForInput('2024-13-45')).toBe('')
  })
})

describe('formatCalendarDate', () => {
  it('should format backend ISO dates without shifting the calendar day', () => {
    expect(formatCalendarDate('2024-03-26T00:00:00.000Z')).toBe('March 26, 2024')
    expect(formatCalendarDate('2024-03-26')).toBe('March 26, 2024')
  })

  it('should support Date objects', () => {
    expect(formatCalendarDate(new Date('2024-03-26T12:00:00Z'))).toBe('March 26, 2024')
  })

  it('should return an empty string for undefined, empty, or invalid input', () => {
    expect(formatCalendarDate(undefined)).toBe('')
    expect(formatCalendarDate('')).toBe('')
    expect(formatCalendarDate('not-a-date')).toBe('')
    expect(formatCalendarDate('2024-13-45')).toBe('')
  })
})
