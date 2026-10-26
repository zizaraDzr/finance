import { describe, expect, it } from 'vitest'
import {
  formatDateInput,
  getEndOfWeek,
  getMonthKey,
  getOperationPeriodKey,
  getStartOfWeek,
  isValidMonthKey,
  shiftMonthKey,
} from '@/utils/date'

describe('date helpers', () => {
  it('formats month keys', () => {
    expect(getMonthKey(new Date(2026, 0, 5, 12))).toBe('2026-01')
  })

  it('shifts month keys across year boundaries', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01')
  })

  it('builds operation period keys', () => {
    const date = new Date(2026, 9, 1, 12)

    expect(getOperationPeriodKey(date, 'day')).toBe('2026-10-01')
    expect(getOperationPeriodKey(date, 'week')).toBe('2026-09-28')
    expect(getOperationPeriodKey(date, 'month')).toBe('2026-10')
    expect(getOperationPeriodKey(date, 'year')).toBe('2026')
  })

  it('calculates week boundaries', () => {
    const date = new Date(2026, 9, 1, 12)

    expect(formatDateInput(getStartOfWeek(date))).toBe('2026-09-28')
    expect(formatDateInput(getEndOfWeek(date))).toBe('2026-10-04')
  })

  it('validates month keys', () => {
    expect(isValidMonthKey('2026-10')).toBe(true)
    expect(isValidMonthKey('2026-13')).toBe(false)
    expect(isValidMonthKey('2026-1')).toBe(false)
    expect(isValidMonthKey(null)).toBe(false)
  })
})
