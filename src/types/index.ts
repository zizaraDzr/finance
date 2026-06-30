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
  balanceAdjustmentData: any
  homeWidgetsData: any
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