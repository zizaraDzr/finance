import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { defineStore } from 'pinia'
import type { Account, Category, Operation, Subcategory, Target } from '@/types'
import {
  readFinanceSnapshot,
  writeFinanceSnapshot,
  type FinanceData,
  type FinanceSnapshot,
} from '@/storage/financeDb'
import { getMonthKey, shiftMonthKey } from '@/utils/date'
import { generateGuid } from '@/utils/formatters'

export type { Account, Category, Operation, Subcategory, Target }

export type MonthlySummary = {
  month: string
  income: number
  expense: number
  balance: number
  count: number
}

export type NewOperation = Omit<Operation, 'id' | 'isDeleted'>
export type NewCategory = Omit<Category, 'id' | 'isDeleted'>
export type NewSubcategory = Omit<Subcategory, 'id' | 'isDeleted'>

type SoftDeletable = {
  id: string
  isDeleted: boolean
}

function emptyMonthSummary(month: string): MonthlySummary {
  return {
    month,
    income: 0,
    expense: 0,
    balance: 0,
    count: 0,
  }
}

function isActiveOperation(operation: Operation) {
  return !operation.isDeleted && operation.isActive !== false
}

export const useFinanceStore = defineStore('finance', () => {
  const accounts = ref<Account[]>([])
  const categories = ref<Category[]>([])
  const operations = ref<Operation[]>([])
  const subcategories = ref<Subcategory[]>([])
  const targets = ref<Target[]>([])
  const lastUpdatedAt = ref(new Date(0).toISOString())

  function loadData(data: FinanceData) {
    accounts.value = data.Account || []
    categories.value = data.Category || []
    operations.value = data.Operation || []
    subcategories.value = data.Subcategory || []
    targets.value = data.Target || []
  }

  function exportData(): FinanceData {
    const data: FinanceData = {
      Account: accounts.value,
      Category: categories.value,
      Operation: operations.value,
      Subcategory: subcategories.value,
      Target: targets.value,
    }

    return JSON.parse(JSON.stringify(data)) as FinanceData
  }

  function exportSnapshot(): FinanceSnapshot {
    return {
      data: exportData(),
      updatedAt: lastUpdatedAt.value,
    }
  }

  async function saveToIndexedDB(updatedAt = new Date().toISOString()) {
    lastUpdatedAt.value = updatedAt
    await writeFinanceSnapshot(exportSnapshot())
  }

  async function saveSnapshotToIndexedDB(snapshot: FinanceSnapshot) {
    loadData(snapshot.data)
    lastUpdatedAt.value = snapshot.updatedAt
    await writeFinanceSnapshot(snapshot)
  }

  async function loadFromIndexedDB() {
    const indexedSnapshot = await readFinanceSnapshot()

    if (indexedSnapshot) {
      loadData(indexedSnapshot.data)
      lastUpdatedAt.value = indexedSnapshot.updatedAt
      await writeFinanceSnapshot(indexedSnapshot)
      return true
    }

    const stored = localStorage.getItem('financeData')

    if (!stored) {
      return false
    }

    const data = JSON.parse(stored) as FinanceData
    loadData(data)
    await saveToIndexedDB()
    return true
  }

  const activeOperations = computed(() => operations.value.filter(isActiveOperation))

  const incomes = computed(() => activeOperations.value.filter(operation => operation.type === 0))

  const expenses = computed(() => activeOperations.value.filter(operation => operation.type === 1))

  const totalIncome = computed(() =>
    incomes.value.reduce((sum, operation) => sum + operation.sum, 0),
  )

  const totalExpense = computed(() =>
    expenses.value.reduce((sum, operation) => sum + operation.sum, 0),
  )

  const balance = computed(() => totalIncome.value - totalExpense.value)

  const monthlyData = computed(() => {
    const summaries = new Map<string, MonthlySummary>()

    activeOperations.value.forEach(operation => {
      const date = new Date(operation.date)

      if (Number.isNaN(date.getTime())) {
        return
      }

      const month = getMonthKey(date)
      const summary = summaries.get(month) || emptyMonthSummary(month)

      if (operation.type === 0) {
        summary.income += operation.sum
      } else if (operation.type === 1) {
        summary.expense += operation.sum
      }

      summary.balance = summary.income - summary.expense
      summary.count += 1
      summaries.set(month, summary)
    })

    return Array.from(summaries.values()).sort((a, b) => a.month.localeCompare(b.month))
  })

  const currentMonthKey = computed(() => getMonthKey(new Date()))

  const previousMonthKey = computed(() => shiftMonthKey(currentMonthKey.value, -1))

  function getMonthlySummary(month: string) {
    return monthlyData.value.find(summary => summary.month === month) || emptyMonthSummary(month)
  }

  const currentMonthSummary = computed(() => getMonthlySummary(currentMonthKey.value))

  const previousMonthSummary = computed(() => getMonthlySummary(previousMonthKey.value))

  const currencySymbol = computed(() => accounts.value[0]?.currencySymbol || '₽')

  async function commit(mutation: () => void, rollback: () => void) {
    mutation()

    try {
      await saveToIndexedDB()
    } catch (error) {
      rollback()
      throw error
    }
  }

  function collectionActions<T extends SoftDeletable>(items: Ref<T[]>) {
    async function add(entity: T) {
      await commit(
        () => {
          items.value.push(entity)
        },
        () => {
          items.value = items.value.filter(item => item.id !== entity.id)
        },
      )

      return entity
    }

    async function update(id: string, data: Partial<T>) {
      const index = items.value.findIndex(item => item.id === id)
      const current = items.value[index]

      if (!current) {
        return
      }

      await commit(
        () => {
          items.value[index] = { ...current, ...data }
        },
        () => {
          items.value[index] = current
        },
      )
    }

    async function remove(id: string) {
      const item = items.value.find(entry => entry.id === id)

      if (!item) {
        return
      }

      const previousDeleted = item.isDeleted

      await commit(
        () => {
          item.isDeleted = true
        },
        () => {
          item.isDeleted = previousDeleted
        },
      )
    }

    async function restore(id: string) {
      const item = items.value.find(entry => entry.id === id)

      if (!item) {
        return
      }

      const previousDeleted = item.isDeleted

      await commit(
        () => {
          item.isDeleted = false
        },
        () => {
          item.isDeleted = previousDeleted
        },
      )
    }

    return { add, update, remove, restore }
  }

  const operationActions = collectionActions(operations)
  const categoryActions = collectionActions(categories)
  const subcategoryActions = collectionActions(subcategories)

  function addOperation(operation: NewOperation) {
    return operationActions.add({ ...operation, id: generateGuid(), isDeleted: false })
  }

  function addCategory(category: NewCategory) {
    return categoryActions.add({ ...category, id: generateGuid(), isDeleted: false })
  }

  function addSubcategory(subcategory: NewSubcategory) {
    return subcategoryActions.add({ ...subcategory, id: generateGuid(), isDeleted: false })
  }

  async function deleteCategory(id: string) {
    const category = categories.value.find(item => item.id === id)

    if (!category) {
      return
    }

    const previousCategoryDeleted = category.isDeleted
    const categorySubcategories = subcategories.value
      .filter(item => item.categoryID === id)
      .map(item => ({ item, isDeleted: item.isDeleted }))

    await commit(
      () => {
        category.isDeleted = true
        categorySubcategories.forEach(({ item }) => {
          item.isDeleted = true
        })
      },
      () => {
        category.isDeleted = previousCategoryDeleted
        categorySubcategories.forEach(({ item, isDeleted }) => {
          item.isDeleted = isDeleted
        })
      },
    )
  }

  function getCategory(id: string | null) {
    if (!id) {
      return null
    }

    return categories.value.find(category => category.id === id)
  }

  function getSubcategory(id: string | null) {
    if (!id) {
      return null
    }

    return subcategories.value.find(subcategory => subcategory.id === id)
  }

  function getCategoryName(id: string | null) {
    const category = getCategory(id)
    return category?.name || 'Без категории'
  }

  return {
    accounts,
    categories,
    operations,
    subcategories,
    targets,
    lastUpdatedAt,
    activeOperations,
    incomes,
    expenses,
    totalIncome,
    totalExpense,
    balance,
    monthlyData,
    currentMonthKey,
    previousMonthKey,
    currentMonthSummary,
    previousMonthSummary,
    currencySymbol,
    getMonthlySummary,
    exportSnapshot,
    loadData,
    saveToIndexedDB,
    saveSnapshotToIndexedDB,
    loadFromIndexedDB,
    addOperation,
    updateOperation: operationActions.update,
    deleteOperation: operationActions.remove,
    restoreOperation: operationActions.restore,
    addCategory,
    updateCategory: categoryActions.update,
    deleteCategory,
    addSubcategory,
    updateSubcategory: subcategoryActions.update,
    deleteSubcategory: subcategoryActions.remove,
    getCategory,
    getSubcategory,
    getCategoryName,
  }
})
