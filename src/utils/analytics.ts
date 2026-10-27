import type { Operation } from '@/types'
import { getMonthKey, isValidDate, shiftMonthKey } from '@/utils/date'
import type { OperationNames } from '@/utils/operations'

export type SubcategorySeries = {
  key: string
  name: string
  amounts: number[]
}

export type CategorySeries = {
  months: string[]
  amounts: number[]
  subcategories: SubcategorySeries[]
}

export type AmountsSummary = {
  total: number
  average: number
  monthCount: number
  lastAmount: number
  previousAmount: number
  change: number
  percentChange: number | null
}

const withoutCategoryKey = 'without-category'

function getCategoryKey(categoryID: string | null) {
  return categoryID || withoutCategoryKey
}

function sumAmounts(amounts: number[]) {
  return amounts.reduce((sum, amount) => sum + amount, 0)
}

function getPercentChange(current: number, previous: number) {
  return previous === 0 ? null : ((current - previous) / previous) * 100
}

export function summarizeAmounts(amounts: number[]): AmountsSummary {
  const total = sumAmounts(amounts)
  const lastAmount = amounts.at(-1) || 0
  const previousAmount = amounts.at(-2) || 0

  return {
    total,
    average: amounts.length > 0 ? total / amounts.length : 0,
    monthCount: amounts.length,
    lastAmount,
    previousAmount,
    change: lastAmount - previousAmount,
    percentChange: getPercentChange(lastAmount, previousAmount),
  }
}

/**
 * Monthly amounts of one category from its first to its last month, plus the same
 * monthly amounts for every subcategory, aligned to the same month list.
 */
export function buildCategorySeries(
  operations: Operation[],
  categoryKey: string,
  names: OperationNames,
): CategorySeries {
  const monthTotals = new Map<string, number>()
  const subcategories = new Map<string, { name: string; amounts: Map<string, number> }>()

  operations.forEach(operation => {
    const date = new Date(operation.date)

    if (!isValidDate(date) || getCategoryKey(operation.categoryID) !== categoryKey) {
      return
    }

    const month = getMonthKey(date)
    const subcategoryKey = operation.subcategoryID || `${categoryKey}:without-subcategory`
    let subcategory = subcategories.get(subcategoryKey)

    if (!subcategory) {
      subcategory = {
        name: operation.subcategoryID
          ? names.getSubcategory(operation.subcategoryID)?.name || names.getCategoryName(operation.categoryID)
          : names.getCategoryName(operation.categoryID),
        amounts: new Map<string, number>(),
      }
      subcategories.set(subcategoryKey, subcategory)
    }

    monthTotals.set(month, (monthTotals.get(month) || 0) + operation.sum)
    subcategory.amounts.set(month, (subcategory.amounts.get(month) || 0) + operation.sum)
  })

  const months = buildMonthRange(Array.from(monthTotals.keys()))

  return {
    months,
    amounts: months.map(month => monthTotals.get(month) || 0),
    subcategories: Array.from(subcategories.entries())
      .map(([key, subcategory]) => ({
        key,
        name: subcategory.name,
        amounts: months.map(month => subcategory.amounts.get(month) || 0),
      }))
      .sort((first, second) => sumAmounts(second.amounts) - sumAmounts(first.amounts)),
  }
}

function buildMonthRange(monthKeys: string[]) {
  const sorted = [...monthKeys].sort()
  const firstMonth = sorted[0]
  const lastMonth = sorted[sorted.length - 1]
  const months: string[] = []

  if (!firstMonth || !lastMonth) {
    return months
  }

  let month = firstMonth

  while (month <= lastMonth) {
    months.push(month)
    month = shiftMonthKey(month, 1)
  }

  return months
}
