import type { AnalyticsGranularity, AnalyticsWindow, Operation } from '@/types'
import { getMonthKey, isValidDate, shiftMonthKey } from '@/utils/date'
import type { OperationNames } from '@/utils/operations'

export type SubcategorySeries = {
  key: string
  subcategoryID: string | null
  name: string
  amounts: number[]
}

export type CategorySeries = {
  buckets: string[]
  amounts: number[]
  subcategories: SubcategorySeries[]
}

export type CategorySeriesOptions = {
  granularity: AnalyticsGranularity
  window: AnalyticsWindow
}

export type AmountsSummary = {
  total: number
  average: number
  bucketCount: number
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

function getBucket(monthKey: string, granularity: AnalyticsGranularity) {
  return granularity === 'year' ? monthKey.slice(0, 4) : monthKey
}

function getStartBucket(
  granularity: AnalyticsGranularity,
  window: AnalyticsWindow,
  firstBucket: string,
  lastBucket: string,
) {
  if (window === 'all') {
    return firstBucket
  }

  const windowStart =
    granularity === 'year'
      ? String(Number(lastBucket) - (window - 1))
      : shiftMonthKey(lastBucket, -(window * 12 - 1))

  return windowStart > firstBucket ? windowStart : firstBucket
}

function shiftBucket(bucket: string, granularity: AnalyticsGranularity) {
  return granularity === 'year' ? String(Number(bucket) + 1) : shiftMonthKey(bucket, 1)
}

function buildBucketRange(granularity: AnalyticsGranularity, firstBucket: string, lastBucket: string) {
  const buckets: string[] = []
  let bucket = firstBucket

  while (bucket <= lastBucket) {
    buckets.push(bucket)
    bucket = shiftBucket(bucket, granularity)
  }

  return buckets
}

export function summarizeAmounts(amounts: number[]): AmountsSummary {
  const total = sumAmounts(amounts)
  const lastAmount = amounts.at(-1) || 0
  const previousAmount = amounts.at(-2) || 0

  return {
    total,
    average: amounts.length > 0 ? total / amounts.length : 0,
    bucketCount: amounts.length,
    lastAmount,
    previousAmount,
    change: lastAmount - previousAmount,
    percentChange: getPercentChange(lastAmount, previousAmount),
  }
}

/**
 * Amounts of one category per month or per year, from the first bucket of the
 * range to its last bucket, plus the same amounts for every subcategory.
 * The range ends on the last bucket with data and never starts before the first
 * one, so the window only ever trims the history on the left.
 */
export function buildCategorySeries(
  operations: Operation[],
  categoryKey: string,
  names: OperationNames,
  options: CategorySeriesOptions,
): CategorySeries {
  const bucketTotals = new Map<string, number>()
  const subcategories = new Map<
    string,
    { subcategoryID: string | null; name: string; amounts: Map<string, number> }
  >()

  operations.forEach(operation => {
    const date = new Date(operation.date)

    if (!isValidDate(date) || getCategoryKey(operation.categoryID) !== categoryKey) {
      return
    }

    const bucket = getBucket(getMonthKey(date), options.granularity)
    const subcategoryKey = operation.subcategoryID || `${categoryKey}:without-subcategory`
    let subcategory = subcategories.get(subcategoryKey)

    if (!subcategory) {
      subcategory = {
        subcategoryID: operation.subcategoryID,
        name: operation.subcategoryID
          ? names.getSubcategory(operation.subcategoryID)?.name || names.getCategoryName(operation.categoryID)
          : names.getCategoryName(operation.categoryID),
        amounts: new Map<string, number>(),
      }
      subcategories.set(subcategoryKey, subcategory)
    }

    bucketTotals.set(bucket, (bucketTotals.get(bucket) || 0) + operation.sum)
    subcategory.amounts.set(bucket, (subcategory.amounts.get(bucket) || 0) + operation.sum)
  })

  const dataBuckets = Array.from(bucketTotals.keys()).sort()
  const firstBucket = dataBuckets[0]
  const lastBucket = dataBuckets.at(-1)

  if (!firstBucket || !lastBucket) {
    return { buckets: [], amounts: [], subcategories: [] }
  }

  const buckets = buildBucketRange(
    options.granularity,
    getStartBucket(options.granularity, options.window, firstBucket, lastBucket),
    lastBucket,
  )

  return {
    buckets,
    amounts: buckets.map(bucket => bucketTotals.get(bucket) || 0),
    subcategories: Array.from(subcategories.entries())
      .map(([key, subcategory]) => ({
        key,
        subcategoryID: subcategory.subcategoryID,
        name: subcategory.name,
        amounts: buckets.map(bucket => subcategory.amounts.get(bucket) || 0),
      }))
      .filter(subcategory => sumAmounts(subcategory.amounts) > 0)
      .sort((first, second) => sumAmounts(second.amounts) - sumAmounts(first.amounts)),
  }
}
