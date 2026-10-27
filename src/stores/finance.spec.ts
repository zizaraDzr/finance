import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { writeFinanceSnapshot } from '@/storage/financeDb'
import { createCategory, createOperation, createSubcategory } from '@/test/fixtures'

vi.mock('@/storage/financeDb', () => ({
  readFinanceSnapshot: vi.fn(),
  writeFinanceSnapshot: vi.fn(),
}))

const writeSnapshot = vi.mocked(writeFinanceSnapshot)

function budgetData(data: FinanceData = {}): FinanceData {
  return {
    Account: [],
    Category: [],
    Operation: [],
    Subcategory: [],
    Target: [],
    ...data,
  }
}

function createStore(data: FinanceData = {}) {
  const store = useFinanceStore()
  store.loadData(budgetData(data))
  return store
}

const newCategory = {
  name: 'Продукты',
  icon: '',
  isActive: true,
  position: 0,
  type: 1,
  budgetSum: 0,
  budgetPeriod: 2,
  budgetStartDay: '2026-01-01T00:00:00.000Z',
  accountID: 'account-1',
}

describe('finance store categories', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    writeSnapshot.mockReset()
    writeSnapshot.mockResolvedValue('key')
  })

  it('adds a category and persists the snapshot', async () => {
    const store = createStore()

    const category = await store.addCategory(newCategory)

    expect(category.id).toHaveLength(36)
    expect(category.isDeleted).toBe(false)
    expect(store.categories).toHaveLength(1)
    expect(store.categories[0]).toMatchObject({ name: 'Продукты', type: 1 })
    expect(writeSnapshot).toHaveBeenCalledTimes(1)
  })

  it('rolls back a category when saving fails', async () => {
    const store = createStore()
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.addCategory(newCategory)).rejects.toThrow('save failed')

    expect(store.categories).toEqual([])
  })

  it('updates a category', async () => {
    const category = createCategory({ id: 'cat-food', name: 'Старое', isActive: true })
    const store = createStore({ Category: [category] })

    await store.updateCategory('cat-food', { name: 'Новое', isActive: false })

    expect(store.categories[0]).toMatchObject({ name: 'Новое', isActive: false })
    expect(writeSnapshot).toHaveBeenCalledTimes(1)
  })

  it('rolls back a category update when saving fails', async () => {
    const category = createCategory({ id: 'cat-food', name: 'Старое', isActive: true })
    const store = createStore({ Category: [category] })
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.updateCategory('cat-food', { name: 'Новое' })).rejects.toThrow('save failed')

    expect(store.categories[0]).toMatchObject({ name: 'Старое', isActive: true })
  })

  it('soft-deletes a category together with its subcategories', async () => {
    const food = createCategory({ id: 'cat-food' })
    const gifts = createCategory({ id: 'cat-gifts', name: 'Подарки' })
    const dairy = createSubcategory({ id: 'sub-dairy', categoryID: 'cat-food' })
    const meat = createSubcategory({ id: 'sub-meat', categoryID: 'cat-food' })
    const giftSub = createSubcategory({ id: 'sub-gift', categoryID: 'cat-gifts' })
    const store = createStore({
      Category: [food, gifts],
      Subcategory: [dairy, meat, giftSub],
    })

    await store.deleteCategory('cat-food')

    expect(food.isDeleted).toBe(true)
    expect(dairy.isDeleted).toBe(true)
    expect(meat.isDeleted).toBe(true)
    expect(giftSub.isDeleted).toBe(false)
    expect(gifts.isDeleted).toBe(false)
    expect(writeSnapshot).toHaveBeenCalledTimes(1)
  })

  it('rolls back a category deletion when saving fails', async () => {
    const food = createCategory({ id: 'cat-food' })
    const dairy = createSubcategory({ id: 'sub-dairy', categoryID: 'cat-food' })
    const store = createStore({ Category: [food], Subcategory: [dairy] })
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.deleteCategory('cat-food')).rejects.toThrow('save failed')

    expect(food.isDeleted).toBe(false)
    expect(dairy.isDeleted).toBe(false)
  })
})

describe('finance store subcategories', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    writeSnapshot.mockReset()
    writeSnapshot.mockResolvedValue('key')
  })

  it('adds, updates and soft-deletes a subcategory', async () => {
    const category = createCategory({ id: 'cat-food' })
    const store = createStore({ Category: [category] })

    const subcategory = await store.addSubcategory({
      name: 'Молочные',
      isActive: true,
      position: 0,
      categoryID: 'cat-food',
    })

    expect(subcategory.id).toHaveLength(36)
    expect(store.subcategories[0]).toMatchObject({ name: 'Молочные', isDeleted: false })

    await store.updateSubcategory(subcategory.id, { name: 'Молочка', isActive: false })

    expect(store.subcategories[0]).toMatchObject({ name: 'Молочка', isActive: false })

    await store.deleteSubcategory(subcategory.id)

    expect(store.subcategories[0]?.isDeleted).toBe(true)
  })

  it('rolls back a subcategory deletion when saving fails', async () => {
    const subcategory = createSubcategory({ id: 'sub-dairy', categoryID: 'cat-food' })
    const store = createStore({ Subcategory: [subcategory] })
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.deleteSubcategory('sub-dairy')).rejects.toThrow('save failed')

    expect(subcategory.isDeleted).toBe(false)
  })
})

describe('finance store operations', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    writeSnapshot.mockReset()
    writeSnapshot.mockResolvedValue('key')
  })

  it('soft-deletes and restores an operation', async () => {
    const operation = createOperation({ id: 'operation-1' })
    const store = createStore({ Operation: [operation] })

    await store.deleteOperation('operation-1')
    expect(store.operations[0]?.isDeleted).toBe(true)

    await store.restoreOperation('operation-1')
    expect(store.operations[0]?.isDeleted).toBe(false)
  })

  it('rolls back an operation update when saving fails', async () => {
    const operation = createOperation({ id: 'operation-1', sum: 100 })
    const store = createStore({ Operation: [operation] })
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.updateOperation('operation-1', { sum: 500 })).rejects.toThrow('save failed')

    expect(store.operations[0]?.sum).toBe(100)
  })

  it('rolls back an operation deletion when saving fails', async () => {
    const operation = createOperation({ id: 'operation-1' })
    const store = createStore({ Operation: [operation] })
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.deleteOperation('operation-1')).rejects.toThrow('save failed')

    expect(store.operations[0]?.isDeleted).toBe(false)
  })

  it('rolls back an operation restore when saving fails', async () => {
    const operation = createOperation({ id: 'operation-1', isDeleted: true })
    const store = createStore({ Operation: [operation] })
    writeSnapshot.mockRejectedValueOnce(new Error('save failed'))

    await expect(store.restoreOperation('operation-1')).rejects.toThrow('save failed')

    expect(store.operations[0]?.isDeleted).toBe(true)
  })
})
