import type { OperationsPeriod } from '@/types'

export function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function createOperationDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const now = new Date()

  return new Date(
    year || now.getFullYear(),
    (month || now.getMonth() + 1) - 1,
    day || now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  )
}

export function createMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseMonthKey(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split('-').map(Number)

  return {
    year: toNumber(yearPart, 0),
    month: toNumber(monthPart, 1),
  }
}

function toNumber(value: number | undefined, fallback: number) {
  return value === undefined || Number.isNaN(value) ? fallback : value
}

export function getMonthKey(date: Date) {
  return createMonthKey(date.getFullYear(), date.getMonth() + 1)
}

export function shiftMonthKey(monthKey: string, offset: number) {
  const { year, month } = parseMonthKey(monthKey)
  return getMonthKey(new Date(year, month - 1 + offset, 1))
}

export function getOperationPeriodKey(date: Date, period: OperationsPeriod) {
  if (period === 'year') {
    return String(date.getFullYear())
  }

  if (period === 'month') {
    return getMonthKey(date)
  }

  if (period === 'week') {
    return formatDateInput(getStartOfWeek(date))
  }

  return formatDateInput(date)
}

export function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)
  return start
}

export function getEndOfWeek(date: Date) {
  const end = getStartOfWeek(date)
  end.setDate(end.getDate() + 6)
  return end
}

export function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime())
}

export function isValidMonthKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return false
  }

  const { month } = parseMonthKey(value)
  return month >= 1 && month <= 12
}
