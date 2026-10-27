import { describe, expect, it } from 'vitest'
import {
  formatChangeHint,
  formatDate,
  formatMoney,
  formatMonthTitle,
  formatOperationsCount,
  formatPercent,
  formatSignedMoney,
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

describe('formatSignedMoney', () => {
  it('marks the direction of the money difference', () => {
    expect(normalizeSpaces(formatSignedMoney(200, '₽'))).toBe('+200 ₽')
    expect(normalizeSpaces(formatSignedMoney(-500, '₽'))).toBe('−500 ₽')
    expect(normalizeSpaces(formatSignedMoney(0, '₽'))).toBe('0 ₽')
  })
})

describe('formatChangeHint', () => {
  it('puts the money difference in brackets after the percentage', () => {
    expect(normalizeSpaces(formatChangeHint(100, 50, '₽'))).toBe('+50% (+100 ₽)')
    expect(normalizeSpaces(formatChangeHint(-500, -25, '₽'))).toBe('−25% (−500 ₽)')
    expect(normalizeSpaces(formatChangeHint(0, 0, '₽'))).toBe('0% (0 ₽)')
  })

  it('shows only the money when there is no base for a percentage', () => {
    expect(normalizeSpaces(formatChangeHint(300, null, '₽'))).toBe('+300 ₽')
    expect(normalizeSpaces(formatChangeHint(0, null, '₽'))).toBe('—')
  })
})
