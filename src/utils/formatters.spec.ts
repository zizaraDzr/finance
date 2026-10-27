import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatMoney,
  formatMonthShortTitle,
  formatMonthTitle,
  formatOperationsCount,
  formatPercent,
  formatSignedPercent,
  formatSubcategoryCount,
} from '@/utils/formatters'

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, ' ')
}

describe('formatMoney', () => {
  it('formats rubles and dollars without fractional digits', () => {
    expect(normalizeSpaces(formatMoney(1234, '₽'))).toBe('1 234 ₽')
    expect(normalizeSpaces(formatMoney(0.4, '₽'))).toBe('0 ₽')
    expect(normalizeSpaces(formatMoney(1234.5, '$'))).toBe('1 235 $')
  })
})

describe('formatPercent', () => {
  it('keeps at most one fractional digit', () => {
    expect(formatPercent(12.34)).toBe('12,3%')
    expect(formatPercent(50)).toBe('50%')
    expect(formatPercent(0.05)).toBe('0,1%')
  })
})

describe('formatDate and formatMonthTitle', () => {
  it('formats a short date and a month title', () => {
    expect(formatDate('2026-10-15T12:00:00.000Z')).toBe('15 окт.')
    expect(formatMonthTitle('2026-10')).toBe('Октябрь 2026 г.')
  })
})

describe('formatOperationsCount', () => {
  it('declines the word for Russian plural forms', () => {
    expect(formatOperationsCount(1)).toBe('1 операция')
    expect(formatOperationsCount(2)).toBe('2 операции')
    expect(formatOperationsCount(5)).toBe('5 операций')
    expect(formatOperationsCount(11)).toBe('11 операций')
    expect(formatOperationsCount(21)).toBe('21 операция')
    expect(formatOperationsCount(0)).toBe('0 операций')
  })
})

describe('formatSubcategoryCount', () => {
  it('declines the word for Russian plural forms', () => {
    expect(formatSubcategoryCount(1)).toBe('1 подкатегория')
    expect(formatSubcategoryCount(3)).toBe('3 подкатегории')
    expect(formatSubcategoryCount(11)).toBe('11 подкатегорий')
  })
})

describe('formatSignedPercent', () => {
  it('marks the direction of the change and the missing comparison', () => {
    expect(formatSignedPercent(12.34)).toBe('+12,3%')
    expect(formatSignedPercent(-5)).toBe('−5%')
    expect(formatSignedPercent(0)).toBe('0%')
    expect(formatSignedPercent(null)).toBe('—')
  })
})

describe('formatMonthShortTitle', () => {
  it('builds a compact month label with a two-digit year', () => {
    expect(formatMonthShortTitle('2026-10')).toBe('Окт 26')
    expect(formatMonthShortTitle('2026-05')).toBe('Май 26')
  })
})
