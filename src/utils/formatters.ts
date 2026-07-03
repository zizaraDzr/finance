import type { OperationsPeriod } from '@/types'
import { getEndOfWeek, getMonthKey, getStartOfWeek } from '@/utils/date'

export function createMoneyFormatter(currencySymbol: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencySymbol === '$' ? 'USD' : 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatMoney(value: number, currencySymbol: string) {
  return createMoneyFormatter(currencySymbol).format(value)
}

export function formatOperationsCount(count: number) {
  const plural = new Intl.PluralRules('ru-RU').select(count)
  const word = plural === 'one' ? 'операция' : plural === 'few' ? 'операции' : 'операций'

  return `${count} ${word}`
}

export function formatSubcategoryCount(count: number) {
  const plural = new Intl.PluralRules('ru-RU').select(count)
  const word = plural === 'one' ? 'подкатегория' : plural === 'few' ? 'подкатегории' : 'подкатегорий'

  return `${count} ${word}`
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
  }).format(value)}%`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function formatOperationDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatOperationTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year || 0, (month || 1) - 1, 1)
  const title = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date)

  return capitalizeFirstLetter(title)
}

export function formatOperationPeriodTitle(date: Date, period: OperationsPeriod) {
  if (period === 'year') {
    return new Intl.DateTimeFormat('ru-RU', { year: 'numeric' }).format(date)
  }

  if (period === 'month') {
    return formatMonthTitle(getMonthKey(date))
  }

  if (period === 'week') {
    const start = getStartOfWeek(date)
    const end = getEndOfWeek(date)
    return `${formatShortDate(start)} - ${formatShortDate(end)}`
  }

  return formatDayTitle(date)
}

export function formatOperationPeriodSubtitle(date: Date, period: OperationsPeriod) {
  if (period === 'day') {
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date)
  }

  if (period === 'week') {
    return 'Неделя'
  }

  if (period === 'month') {
    return 'Месяц'
  }

  return 'Год'
}

function formatDayTitle(date: Date) {
  const title = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  return capitalizeFirstLetter(title)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function generateGuid() {
  let d = new Date().getTime()
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replaceAll(/[xy]/g, function (c) {
    const r = Math.trunc((d + Math.random() * 16) % 16)
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16).toUpperCase()
  })
}