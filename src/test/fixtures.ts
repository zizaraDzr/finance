import type { Account, Category, Operation, Subcategory } from '@/types'

let sequence = 0

function nextId(prefix: string) {
  sequence += 1
  return `${prefix}-${sequence}`
}

export function createAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: nextId('account'),
    isDeleted: false,
    name: 'Деньги',
    icon: '',
    balance: 0,
    createDate: '2026-01-01T00:00:00.000Z',
    position: 0,
    currencySymbol: '₽',
    currencyCode: 'RUB',
    balanceAdjustmentData: null,
    homeWidgetsData: null,
    ...overrides,
  }
}

export function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: nextId('category'),
    isDeleted: false,
    name: 'Продукты',
    icon: '',
    isActive: true,
    position: 0,
    type: 1,
    budgetSum: 0,
    budgetPeriod: 2,
    budgetStartDay: '2026-01-01T00:00:00.000Z',
    accountID: 'account-1',
    ...overrides,
  }
}

export function createSubcategory(overrides: Partial<Subcategory> = {}): Subcategory {
  return {
    id: nextId('subcategory'),
    isDeleted: false,
    name: 'Молочные',
    isActive: true,
    position: 0,
    categoryID: 'category-1',
    ...overrides,
  }
}

export function createOperation(overrides: Partial<Operation> = {}): Operation {
  return {
    id: nextId('operation'),
    isDeleted: false,
    sum: 100,
    note: null,
    date: '2026-10-15T12:00:00.000Z',
    isActive: true,
    accountID: 'account-1',
    tags: [],
    categoryID: 'category-1',
    subcategoryID: null,
    targetID: null,
    transferAccountID: null,
    paymentID: null,
    type: 1,
    ...overrides,
  }
}
