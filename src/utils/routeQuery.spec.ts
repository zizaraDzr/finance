import { describe, expect, it } from 'vitest'
import {
  readAnalyticsGranularity,
  readAnalyticsWindow,
  readExpensePeriod,
  readMonthQuery,
  readOperationType,
  readOperationsPeriod,
  readOptionalMonthQuery,
} from '@/utils/routeQuery'

describe('readMonthQuery', () => {
  it('returns a valid month from the query', () => {
    expect(readMonthQuery('2026-05', '2026-10')).toBe('2026-05')
  })

  it('falls back for a missing or malformed month', () => {
    expect(readMonthQuery(undefined, '2026-10')).toBe('2026-10')
    expect(readMonthQuery(null, '2026-10')).toBe('2026-10')
    expect(readMonthQuery('2026-13', '2026-10')).toBe('2026-10')
    expect(readMonthQuery('not-a-month', '2026-10')).toBe('2026-10')
    expect(readMonthQuery(['2026-05'], '2026-10')).toBe('2026-10')
  })
})

describe('readOptionalMonthQuery', () => {
  it('returns null when the query has no valid month', () => {
    expect(readOptionalMonthQuery('2026-05')).toBe('2026-05')
    expect(readOptionalMonthQuery(undefined)).toBeNull()
    expect(readOptionalMonthQuery('2026-13')).toBeNull()
  })
})

describe('readOperationsPeriod', () => {
  it('accepts known periods and defaults to day', () => {
    expect(readOperationsPeriod('week')).toBe('week')
    expect(readOperationsPeriod('year')).toBe('year')
    expect(readOperationsPeriod('decade')).toBe('day')
    expect(readOperationsPeriod(undefined)).toBe('day')
  })
})

describe('readOperationType', () => {
  it('accepts known types and defaults to expense', () => {
    expect(readOperationType('income')).toBe('income')
    expect(readOperationType('expense')).toBe('expense')
    expect(readOperationType('transfer')).toBe('expense')
    expect(readOperationType(undefined)).toBe('expense')
  })
})

describe('readExpensePeriod', () => {
  it('accepts year and defaults to month', () => {
    expect(readExpensePeriod('year')).toBe('year')
    expect(readExpensePeriod('month')).toBe('month')
    expect(readExpensePeriod('week')).toBe('month')
    expect(readExpensePeriod(undefined)).toBe('month')
  })
})

describe('readAnalyticsGranularity', () => {
  it('accepts year and defaults to month', () => {
    expect(readAnalyticsGranularity('year')).toBe('year')
    expect(readAnalyticsGranularity('month')).toBe('month')
    expect(readAnalyticsGranularity('week')).toBe('month')
    expect(readAnalyticsGranularity(undefined)).toBe('month')
  })
})

describe('readAnalyticsWindow', () => {
  it('accepts the known windows and defaults to the whole history', () => {
    expect(readAnalyticsWindow('1')).toBe(1)
    expect(readAnalyticsWindow('3')).toBe(3)
    expect(readAnalyticsWindow('all')).toBe('all')
    expect(readAnalyticsWindow('5')).toBe('all')
    expect(readAnalyticsWindow(undefined)).toBe('all')
  })
})
