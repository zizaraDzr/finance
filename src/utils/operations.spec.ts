import { describe, expect, it } from 'vitest'
import type { Operation, Subcategory } from '@/types'
import {
  buildOperationPeriodGroups,
  sortOperationsByDateDesc,
  summarizeOperations,
} from '@/utils/operations'
import { createOperation } from '@/test/fixtures'

const subcategories = new Map<string, Subcategory>([
  [
    'sub-dairy',
    {
      id: 'sub-dairy',
      isDeleted: false,
      name: 'Молочные',
      isActive: true,
      position: 0,
      categoryID: 'category-food',
    },
  ],
])

const names = {
  getCategoryName: (id: string | null) => {
    if (id === 'category-food') {
      return 'Продукты'
    }

    if (id === 'category-gifts') {
      return 'Подарки'
    }

    return 'Без категории'
  },
  getSubcategory: (id: string | null) => (id ? subcategories.get(id) : null),
}

function localDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12).toISOString()
}

function operation(overrides: Partial<Operation> = {}) {
  return createOperation(overrides)
}

describe('sortOperationsByDateDesc', () => {
  it('sorts by date descending and drops invalid dates', () => {
    const first = operation({ id: 'first', date: localDate(2026, 10, 1) })
    const second = operation({ id: 'second', date: localDate(2026, 10, 3) })
    const invalid = operation({ id: 'invalid', date: 'not-a-date' })

    const result = sortOperationsByDateDesc([first, invalid, second])

    expect(result.map(item => item.id)).toEqual(['second', 'first'])
  })

  it('does not mutate the source array', () => {
    const operations = [
      operation({ id: 'first', date: localDate(2026, 10, 1) }),
      operation({ id: 'second', date: localDate(2026, 10, 2) }),
    ]

    sortOperationsByDateDesc(operations)

    expect(operations.map(item => item.id)).toEqual(['first', 'second'])
  })
})

describe('summarizeOperations', () => {
  it('summarizes income, expense and balance', () => {
    const summary = summarizeOperations([
      operation({ type: 0, sum: 1000 }),
      operation({ type: 1, sum: 400 }),
      operation({ type: 1, sum: 100 }),
    ])

    expect(summary).toEqual({
      income: 1000,
      expense: 500,
      balance: 500,
      count: 3,
    })
  })
})

describe('buildOperationPeriodGroups', () => {
  it('groups months, sorts periods by date and groups by amount', () => {
    const groups = buildOperationPeriodGroups(
      [
        operation({ id: 'oct-food', categoryID: 'category-food', sum: 300, date: localDate(2026, 10, 2) }),
        operation({
          id: 'oct-dairy',
          categoryID: 'category-food',
          subcategoryID: 'sub-dairy',
          sum: 200,
          date: localDate(2026, 10, 3),
        }),
        operation({ id: 'oct-gift', categoryID: 'category-gifts', sum: 100, date: localDate(2026, 10, 4) }),
        operation({ id: 'sep-food', categoryID: 'category-food', sum: 500, date: localDate(2026, 9, 5) }),
      ],
      'month',
      names,
    )

    expect(groups.map(group => group.key)).toEqual(['2026-10', '2026-09'])

    const october = groups[0]
    expect(october?.expense).toBe(600)
    expect(october?.categories.map(category => category.name)).toEqual(['Продукты', 'Подарки'])

    const food = october?.categories[0]
    expect(food?.expense).toBe(500)
    expect(food?.subcategories.map(subcategory => subcategory.name)).toEqual(['Продукты', 'Молочные'])
    expect(food?.subcategories.map(subcategory => subcategory.expense)).toEqual([300, 200])

    const gifts = october?.categories[1]
    expect(gifts?.subcategories.map(subcategory => subcategory.name)).toEqual(['Подарки'])
  })

  it('uses the category name for a missing subcategory', () => {
    const groups = buildOperationPeriodGroups(
      [
        operation({
          categoryID: 'category-food',
          subcategoryID: 'missing-subcategory',
          sum: 50,
          date: localDate(2026, 10, 2),
        }),
      ],
      'month',
      names,
    )

    expect(groups[0]?.categories[0]?.subcategories[0]?.name).toBe('Продукты')
  })

  it('keeps day groups without category breakdown', () => {
    const groups = buildOperationPeriodGroups(
      [
        operation({ id: 'morning', date: localDate(2026, 10, 2) }),
        operation({ id: 'evening', date: localDate(2026, 10, 2) }),
      ],
      'day',
      names,
    )

    expect(groups).toHaveLength(1)
    expect(groups[0]?.categories).toEqual([])
    expect(groups[0]?.operations).toHaveLength(2)
  })

  it('builds year and week keys', () => {
    const yearGroups = buildOperationPeriodGroups(
      [
        operation({ id: '2026', date: localDate(2026, 10, 2) }),
        operation({ id: '2025', date: localDate(2025, 12, 31) }),
      ],
      'year',
      names,
    )

    expect(yearGroups.map(group => group.key)).toEqual(['2026', '2025'])

    const weekGroups = buildOperationPeriodGroups(
      [operation({ id: 'week', date: localDate(2026, 10, 1) })],
      'week',
      names,
    )

    expect(weekGroups[0]?.key).toBe('2026-09-28')
  })
})
