import type { OperationsPeriod } from '@/types'
import { getEndOfWeek, getMonthKey, getStartOfWeek, parseMonthKey } from '@/utils/date'

const moneyFormatters = new Map<string, Intl.NumberFormat>()
const percentFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })
const pluralRules = new Intl.PluralRules('ru-RU')
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' })
const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const monthTitleFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const yearFormatter = new Intl.DateTimeFormat('ru-RU', { year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' })
const dayTitleFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function getMoneyFormatter(currencySymbol: string) {
  const cachedFormatter = moneyFormatters.get(currencySymbol)

  if (cachedFormatter) {
    return cachedFormatter
  }

  const formatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencySymbol === '$' ? 'USD' : 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  moneyFormatters.set(currencySymbol, formatter)

  return formatter
}

export function formatMoney(value: number, currencySymbol: string) {
  return getMoneyFormatter(currencySymbol).format(value)
}

function formatCount(count: number, forms: readonly [one: string, few: string, many: string]) {
  const plural = pluralRules.select(count)
  const word = plural === 'one' ? forms[0] : plural === 'few' ? forms[1] : forms[2]

  return `${count} ${word}`
}

export function formatOperationsCount(count: number) {
  return formatCount(count, ['операция', 'операции', 'операций'])
}

export function formatSubcategoryCount(count: number) {
  return formatCount(count, ['подкатегория', 'подкатегории', 'подкатегорий'])
}

export function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`
}

export function formatDate(value: string) {
  return shortDateFormatter.format(new Date(value))
}

export function formatOperationDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value))
}

export function formatOperationTime(value: string) {
  return timeFormatter.format(new Date(value))
}

export function formatMonthTitle(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey)
  const date = new Date(year, month - 1, 1)

  return capitalizeFirstLetter(monthTitleFormatter.format(date))
}

export function formatOperationPeriodTitle(date: Date, period: OperationsPeriod) {
  if (period === 'year') {
    return yearFormatter.format(date)
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
    return weekdayFormatter.format(date)
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
  return capitalizeFirstLetter(dayTitleFormatter.format(date))
}

function formatShortDate(date: Date) {
  return shortDateFormatter.format(date)
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
