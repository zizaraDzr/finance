import type {
  Operation,
  OperationCategoryGroup,
  OperationPeriodGroup,
  OperationSubcategoryGroup,
  OperationSummary,
  OperationsPeriod,
  Subcategory,
} from '@/types'
import { getOperationPeriodKey, isValidDate } from '@/utils/date'
import { formatOperationPeriodSubtitle, formatOperationPeriodTitle } from '@/utils/formatters'

type OperationNames = {
  getCategoryName: (id: string | null) => string
  getSubcategory: (id: string | null) => Subcategory | null | undefined
}

export function sortOperationsByDateDesc(operations: Operation[]) {
  return operations
    .filter(operation => isValidDate(new Date(operation.date)))
    .slice()
    .sort((first, second) => getOperationTimestamp(second) - getOperationTimestamp(first))
}

export function summarizeOperations(operations: Operation[]) {
  const summary = createEmptySummary()

  operations.forEach(operation => {
    applyOperationToSummary(summary, operation)
  })

  return summary
}

export function buildOperationPeriodGroups(operations: Operation[], period: OperationsPeriod, names: OperationNames) {
  const groups = new Map<string, OperationPeriodGroup>()

  operations.forEach(operation => {
    const date = new Date(operation.date)
    const key = getOperationPeriodKey(date, period)
    const group = groups.get(key) || createOperationPeriodGroup(key, date, period)

    applyOperationToSummary(group, operation)
    group.operations.push(operation)
    groups.set(key, group)
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      categories: period === 'day' ? [] : buildCategoryGroups(group.operations, names),
    }))
    .sort((first, second) => second.key.localeCompare(first.key))
}

function createEmptySummary(): OperationSummary {
  return {
    income: 0,
    expense: 0,
    balance: 0,
    count: 0,
  }
}

function applyOperationToSummary(summary: OperationSummary, operation: Operation) {
  if (operation.type === 0) {
    summary.income += operation.sum
  } else if (operation.type === 1) {
    summary.expense += operation.sum
  }

  summary.balance = summary.income - summary.expense
  summary.count += 1
}

function createOperationPeriodGroup(key: string, date: Date, period: OperationsPeriod): OperationPeriodGroup {
  return {
    key,
    title: formatOperationPeriodTitle(date, period),
    subtitle: formatOperationPeriodSubtitle(date, period),
    operations: [],
    categories: [],
    ...createEmptySummary(),
  }
}

function buildCategoryGroups(operations: Operation[], names: OperationNames) {
  const categoryMap = new Map<string, OperationCategoryGroup>()

  operations.forEach(operation => {
    const categoryKey = operation.categoryID || 'without-category'
    const subcategoryKey = operation.subcategoryID || `${categoryKey}:without-subcategory`
    const category = categoryMap.get(categoryKey) || {
      key: categoryKey,
      name: names.getCategoryName(operation.categoryID),
      subcategories: [],
      ...createEmptySummary(),
    }
    const subcategory =
      category.subcategories.find(item => item.key === subcategoryKey) ||
      createSubcategoryGroup(subcategoryKey, operation, names)

    applyOperationToSummary(category, operation)
    applyOperationToSummary(subcategory, operation)
    subcategory.operations.push(operation)

    if (!category.subcategories.some(item => item.key === subcategory.key)) {
      category.subcategories.push(subcategory)
    }

    categoryMap.set(categoryKey, category)
  })

  return Array.from(categoryMap.values())
    .map(category => ({
      ...category,
      subcategories: category.subcategories.sort((first, second) => second.count - first.count),
    }))
    .sort((first, second) => second.count - first.count)
}

function createSubcategoryGroup(
  key: string,
  operation: Operation,
  names: OperationNames,
): OperationSubcategoryGroup {
  return {
    key,
    name: operation.subcategoryID ? names.getSubcategory(operation.subcategoryID)?.name || 'Без подкатегории' : 'Без подкатегории',
    operations: [],
    ...createEmptySummary(),
  }
}

function getOperationTimestamp(operation: Operation) {
  return new Date(operation.date).getTime()
}
