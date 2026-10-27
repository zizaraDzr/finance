import { describe, expect, it } from 'vitest'
import { buildCategorySeries, summarizeAmounts } from '@/utils/analytics'
import { createOperation, createSubcategory } from '@/test/fixtures'

const dairy = createSubcategory({ id: 'sub-dairy', name: 'Молочные', categoryID: 'cat-food' })
const bakery = createSubcategory({ id: 'sub-bakery', name: 'Хлебное', categoryID: 'cat-food' })

const names = {
  getCategoryName: (id: string | null) => (id === 'cat-home' ? 'Дом' : 'Продукты'),
  getSubcategory: (id: string | null) => {
    if (id === dairy.id) {
      return dairy
    }

    return id === bakery.id ? bakery : null
  },
}

function foodOperation(overrides: Parameters<typeof createOperation>[0]) {
  return createOperation({ categoryID: 'cat-food', type: 1, ...overrides })
}

describe('buildCategorySeries', () => {
  it('builds a continuous month range and fills the gaps with zeros', () => {
    const series = buildCategorySeries(
      [
        foodOperation({ id: 'op-jan', sum: 100, date: '2026-01-15T12:00:00.000Z' }),
        foodOperation({ id: 'op-mar', sum: 200, date: '2026-03-15T12:00:00.000Z' }),
      ],
      'cat-food',
      names,
      'month',
    )

    expect(series.buckets).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(series.amounts).toEqual([100, 0, 200])
  })

  it('keeps only the selected category and skips operations with a broken date', () => {
    const series = buildCategorySeries(
      [
        foodOperation({ id: 'op-food', sum: 100, date: '2026-01-15T12:00:00.000Z' }),
        createOperation({
          id: 'op-home',
          categoryID: 'cat-home',
          sum: 500,
          date: '2026-01-16T12:00:00.000Z',
        }),
        foodOperation({ id: 'op-broken', sum: 900, date: 'not-a-date' }),
      ],
      'cat-food',
      names,
      'month',
    )

    expect(series.buckets).toEqual(['2026-01'])
    expect(series.amounts).toEqual([100])
  })

  it('groups subcategories by bucket and sorts them by amount', () => {
    const series = buildCategorySeries(
      [
        foodOperation({
          id: 'op-dairy-jan',
          subcategoryID: dairy.id,
          sum: 100,
          date: '2026-01-10T12:00:00.000Z',
        }),
        foodOperation({
          id: 'op-dairy-feb',
          subcategoryID: dairy.id,
          sum: 100,
          date: '2026-02-10T12:00:00.000Z',
        }),
        foodOperation({
          id: 'op-bakery-feb',
          subcategoryID: bakery.id,
          sum: 300,
          date: '2026-02-11T12:00:00.000Z',
        }),
        foodOperation({ id: 'op-plain', sum: 50, date: '2026-01-12T12:00:00.000Z' }),
      ],
      'cat-food',
      names,
      'month',
    )

    expect(series.buckets).toEqual(['2026-01', '2026-02'])
    expect(series.subcategories).toEqual([
      { key: bakery.id, subcategoryID: bakery.id, name: 'Хлебное', amounts: [0, 300] },
      { key: dairy.id, subcategoryID: dairy.id, name: 'Молочные', amounts: [100, 100] },
      { key: 'cat-food:without-subcategory', subcategoryID: null, name: 'Продукты', amounts: [50, 0] },
    ])
  })

  it('sums the months of one year into a year bucket', () => {
    const series = buildCategorySeries(
      [
        foodOperation({ id: 'op-2024', sum: 100, date: '2024-05-10T12:00:00.000Z' }),
        foodOperation({ id: 'op-2025', sum: 200, date: '2025-02-10T12:00:00.000Z' }),
        foodOperation({ id: 'op-2026-a', sum: 300, date: '2026-03-10T12:00:00.000Z' }),
        foodOperation({ id: 'op-2026-b', sum: 50, date: '2026-09-10T12:00:00.000Z' }),
      ],
      'cat-food',
      names,
      'year',
    )

    expect(series.buckets).toEqual(['2024', '2025', '2026'])
    expect(series.amounts).toEqual([100, 200, 350])
  })

  it('returns an empty series when the category has no operations', () => {
    expect(buildCategorySeries([], 'cat-food', names, 'month')).toEqual({
      buckets: [],
      amounts: [],
      subcategories: [],
    })
  })
})

describe('summarizeAmounts', () => {
  it('sums the whole period and compares the last two buckets', () => {
    expect(summarizeAmounts([100, 200])).toEqual({
      total: 300,
      average: 150,
      bucketCount: 2,
      lastAmount: 200,
      previousAmount: 100,
      change: 100,
      percentChange: 100,
    })
  })

  it('counts a zero bucket inside the range in the average', () => {
    const summary = summarizeAmounts([100, 0, 300])

    expect(summary.total).toBe(400)
    expect(summary.bucketCount).toBe(3)
    expect(summary.average).toBeCloseTo(400 / 3)
    expect(summary.lastAmount).toBe(300)
    expect(summary.previousAmount).toBe(0)
    expect(summary.change).toBe(300)
    expect(summary.percentChange).toBeNull()
  })

  it('reports a negative percent change when the last bucket is smaller', () => {
    expect(summarizeAmounts([200, 100]).percentChange).toBe(-50)
  })

  it('has no percent change to show for an empty or a single-bucket period', () => {
    expect(summarizeAmounts([])).toEqual({
      total: 0,
      average: 0,
      bucketCount: 0,
      lastAmount: 0,
      previousAmount: 0,
      change: 0,
      percentChange: null,
    })
    expect(summarizeAmounts([50]).percentChange).toBeNull()
  })
})
