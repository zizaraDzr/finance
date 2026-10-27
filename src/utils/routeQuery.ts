import type {
  AnalyticsGranularity,
  AnalyticsWindow,
  ExpensePeriod,
  OperationsPeriod,
  OperationTypeFilter,
} from '@/types'
import { isValidMonthKey } from '@/utils/date'

function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}

export function readOptionalMonthQuery(value: unknown) {
  const month = readString(value)
  return month && isValidMonthKey(month) ? month : null
}

export function readMonthQuery(value: unknown, fallback: string) {
  return readOptionalMonthQuery(value) ?? fallback
}

export function readOperationsPeriod(value: unknown): OperationsPeriod {
  const period = readString(value)

  if (period === 'day' || period === 'week' || period === 'month' || period === 'year') {
    return period
  }

  return 'day'
}

export function readOperationType(value: unknown): OperationTypeFilter {
  return readString(value) === 'income' ? 'income' : 'expense'
}

export function readExpensePeriod(value: unknown): ExpensePeriod {
  return readString(value) === 'year' ? 'year' : 'month'
}

export function readAnalyticsGranularity(value: unknown): AnalyticsGranularity {
  return readString(value) === 'year' ? 'year' : 'month'
}

export function readAnalyticsWindow(value: unknown): AnalyticsWindow {
  const years = Number(readString(value))

  return years === 1 || years === 2 || years === 3 ? years : 'all'
}
