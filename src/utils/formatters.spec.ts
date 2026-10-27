import { describe, expect, it } from 'vitest'
import { formatOperationsCount, formatSubcategoryCount } from '@/utils/formatters'

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
