import { describe, expect, it } from 'vitest'
import type { Category, Operation, Subcategory } from '@/types'
import {
  buildCategoryPickerGroups,
  compareByPositionThenName,
  countOperationsByCategory,
  getCategoryValue,
  getNextSubcategoryPosition,
  getTopCategoryPosition,
  groupSubcategoriesByCategory,
} from '@/utils/categories'
import { createCategory, createOperation, createSubcategory } from '@/test/fixtures'

function category(overrides: Partial<Category>) {
  return createCategory(overrides)
}

function subcategory(overrides: Partial<Subcategory>) {
  return createSubcategory(overrides)
}

function operation(overrides: Partial<Operation>) {
  return createOperation(overrides)
}

describe('buildCategoryPickerGroups', () => {
  it('filters out inactive, deleted and other-type categories', () => {
    const categories = [
      category({ id: 'food', name: 'Продукты', type: 1, position: 0 }),
      category({ id: 'inactive', name: 'Скрытая', type: 1, isActive: false }),
      category({ id: 'deleted', name: 'Удалённая', type: 1, isDeleted: true }),
      category({ id: 'income', name: 'Зарплата', type: 0 }),
    ]
    const subcategories = [
      subcategory({ id: 'dairy', name: 'Молочные', categoryID: 'food' }),
      subcategory({ id: 'hidden-sub', name: 'Скрытая подкатегория', categoryID: 'food', isActive: false }),
    ]

    const groups = buildCategoryPickerGroups(categories, subcategories, 1)

    expect(groups.map(group => group.name)).toEqual(['Продукты'])
    expect(groups[0]?.subcategories.map(option => option.name)).toEqual(['Молочные'])
  })

  it('sorts categories and subcategories by recent usage, then position', () => {
    const categories = [
      category({ id: 'food', name: 'Продукты', type: 1, position: 1 }),
      category({ id: 'gifts', name: 'Подарки', type: 1, position: 0 }),
    ]
    const subcategories = [
      subcategory({ id: 'dairy', name: 'Молочные', categoryID: 'food', position: 1 }),
      subcategory({ id: 'meat', name: 'Мясные', categoryID: 'food', position: 0 }),
    ]
    const operations = [
      operation({ categoryID: 'food', subcategoryID: 'dairy', date: '2026-10-15T12:00:00.000Z' }),
      operation({ categoryID: 'food', subcategoryID: 'dairy', date: '2026-10-14T12:00:00.000Z' }),
      operation({ categoryID: 'food', subcategoryID: 'meat', date: '2026-10-13T12:00:00.000Z' }),
    ]

    const groups = buildCategoryPickerGroups(categories, subcategories, 1, operations)

    expect(groups.map(group => group.name)).toEqual(['Продукты', 'Подарки'])
    expect(groups[0]?.subcategories.map(option => option.name)).toEqual(['Молочные', 'Мясные'])
    expect(groups[0]?.subcategories[0]?.label).toBe('Продукты / Молочные')
  })

  it('falls back to position when there is no recent usage', () => {
    const categories = [
      category({ id: 'food', name: 'Продукты', type: 1, position: 1 }),
      category({ id: 'gifts', name: 'Подарки', type: 1, position: 0 }),
    ]
    const subcategories = [
      subcategory({ id: 'dairy', name: 'Молочные', categoryID: 'food', position: 1 }),
      subcategory({ id: 'meat', name: 'Мясные', categoryID: 'food', position: 0 }),
    ]

    const groups = buildCategoryPickerGroups(categories, subcategories, 1)

    expect(groups.map(group => group.name)).toEqual(['Подарки', 'Продукты'])
    expect(groups[1]?.subcategories.map(option => option.name)).toEqual(['Мясные', 'Молочные'])
  })

  it('exposes a direct category option when there are no subcategories', () => {
    const categories = [category({ id: 'salary', name: 'Зарплата', type: 0 })]

    const groups = buildCategoryPickerGroups(categories, [], 0)

    expect(groups[0]?.subcategories).toEqual([])
    expect(groups[0]?.option.value).toBe('category:salary')
  })
})

describe('getCategoryValue', () => {
  it('uses the subcategory when it exists', () => {
    expect(
      getCategoryValue(operation({ categoryID: 'food', subcategoryID: 'dairy' })),
    ).toBe('subcategory:food:dairy')
  })

  it('falls back to the category', () => {
    expect(getCategoryValue(operation({ categoryID: 'food', subcategoryID: null }))).toBe(
      'category:food',
    )
  })

  it('returns an empty value without a category', () => {
    expect(getCategoryValue(operation({ categoryID: null, subcategoryID: null }))).toBe('')
  })
})

describe('compareByPositionThenName', () => {
  it('orders by position and then by name', () => {
    const items = [
      { position: 1, name: 'Б' },
      { position: 0, name: 'Я' },
      { position: 1, name: 'А' },
    ]

    const sorted = items.slice().sort(compareByPositionThenName)

    expect(sorted.map(item => item.name)).toEqual(['Я', 'А', 'Б'])
  })
})

describe('getTopCategoryPosition', () => {
  it('places a new category above the existing ones of its type', () => {
    const categories = [
      category({ id: 'one', type: 1, position: 3 }),
      category({ id: 'two', type: 1, position: 1 }),
      category({ id: 'income', type: 0, position: -5 }),
    ]

    expect(getTopCategoryPosition(categories, 1)).toBe(0)
  })

  it('starts at zero when the type has no categories yet', () => {
    expect(getTopCategoryPosition([], 1)).toBe(0)
    expect(getTopCategoryPosition([category({ type: 1, position: 2 })], 0)).toBe(0)
  })
})

describe('getNextSubcategoryPosition', () => {
  it('places a new subcategory after the existing ones of the category', () => {
    const subcategories = [
      subcategory({ id: 'dairy', categoryID: 'food', position: 2 }),
      subcategory({ id: 'meat', categoryID: 'food', position: 0 }),
      subcategory({ id: 'gift', categoryID: 'gifts', position: 7 }),
    ]

    expect(getNextSubcategoryPosition(subcategories, 'food')).toBe(3)
  })

  it('starts at zero when the category has no subcategories yet', () => {
    expect(getNextSubcategoryPosition([], 'food')).toBe(0)
  })
})

describe('countOperationsByCategory', () => {
  it('counts live operations per category and skips deleted or uncategorized ones', () => {
    const counts = countOperationsByCategory([
      operation({ categoryID: 'food' }),
      operation({ categoryID: 'food' }),
      operation({ categoryID: 'food', isDeleted: true }),
      operation({ categoryID: null }),
    ])

    expect(counts.get('food')).toBe(2)
    expect(counts.size).toBe(1)
  })
})

describe('groupSubcategoriesByCategory', () => {
  it('groups live subcategories and orders them by position then name', () => {
    const groups = groupSubcategoriesByCategory([
      subcategory({ id: 'second', categoryID: 'food', position: 1, name: 'Б' }),
      subcategory({ id: 'first', categoryID: 'food', position: 1, name: 'А' }),
      subcategory({ id: 'gift', categoryID: 'gifts', position: 0 }),
      subcategory({ id: 'deleted', categoryID: 'food', isDeleted: true }),
    ])

    expect([...groups.keys()].sort()).toEqual(['food', 'gifts'])
    expect(groups.get('food')?.map(item => item.name)).toEqual(['А', 'Б'])
  })
})
