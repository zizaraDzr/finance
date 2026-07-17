export interface Account {
  id: string
  isDeleted: boolean
  name: string
  icon: string
  balance: number
  createDate: string
  position: number
  currencySymbol: string
  currencyCode: string
  balanceAdjustmentData: unknown
  homeWidgetsData: unknown
}

export interface Category {
  id: string
  isDeleted: boolean
  name: string
  icon: string
  isActive: boolean
  position: number
  type: number // 0 - income, 1 - expense
  budgetSum: number
  budgetPeriod: number
  budgetStartDay: string
  accountID: string
}

export interface Operation {
  id: string
  isDeleted: boolean
  sum: number
  note: string | null
  date: string
  isActive: boolean
  accountID: string
  tags: string[]
  categoryID: string | null
  subcategoryID: string | null
  targetID: string | null
  transferAccountID: string | null
  paymentID: string | null
  type: number // 0 - income, 1 - expense
}

export interface Subcategory {
  id: string
  isDeleted: boolean
  name: string
  isActive: boolean
  position: number
  categoryID: string
}

export interface Target {
  id: string
  isDeleted: boolean
  name: string
  icon: string
  sum: number
  startDay: string
  endDay: string
  note: string | null
  accountID: string
  isFinished: boolean
  finishDay: string | null
}

export type OperationsPeriod = 'day' | 'week' | 'month' | 'year'
export type OperationTypeFilter = 'income' | 'expense'

export interface PeriodOption {
  value: OperationsPeriod
  label: string
}

export interface OperationSummary {
  income: number
  expense: number
  balance: number
  count: number
}

export interface OperationSubcategoryGroup extends OperationSummary {
  key: string
  name: string
  operations: Operation[]
}

export interface OperationCategoryGroup extends OperationSummary {
  key: string
  name: string
  subcategories: OperationSubcategoryGroup[]
}

export interface OperationPeriodGroup extends OperationSummary {
  key: string
  title: string
  subtitle: string
  operations: Operation[]
  categories: OperationCategoryGroup[]
}

export interface CategoryOption {
  value: string
  label: string
  name: string
  categoryID: string
  subcategoryID: string | null
}

export interface CategoryPickerGroup {
  id: string
  name: string
  option: CategoryOption
  subcategories: CategoryOption[]
}
