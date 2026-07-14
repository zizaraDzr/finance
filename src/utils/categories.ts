import type { Category, CategoryOption, CategoryPickerGroup, Operation, Subcategory } from '@/types'

type CategoryUsageStats = {
  categories: Map<string, number>
  subcategories: Map<string, number>
}

const recentOperationsLimit = 50

export function buildCategoryPickerGroups(
  categories: Category[],
  subcategories: Subcategory[],
  operationType: number,
  operations: Operation[] = [],
) {
  const usageStats = getRecentCategoryUsageStats(operations, operationType)

  return categories
    .filter(category => category.type === operationType && category.isActive && !category.isDeleted)
    .sort((first, second) => first.position - second.position)
    .map<CategoryPickerGroup>(category => {
      const name = category.name.trim() || 'Без названия'
      const option: CategoryOption = {
        value: `category:${category.id}`,
        label: name,
        name,
        categoryID: category.id,
        subcategoryID: null,
      }
      const childOptions = subcategories
        .filter(subcategory => subcategory.categoryID === category.id && subcategory.isActive && !subcategory.isDeleted)
        .sort(
          (first, second) =>
            getSubcategoryUsage(usageStats, second.id) - getSubcategoryUsage(usageStats, first.id) ||
            first.position - second.position,
        )
        .map<CategoryOption>(subcategory => ({
          value: `subcategory:${category.id}:${subcategory.id}`,
          label: `${name} / ${subcategory.name.trim() || 'Без названия'}`,
          name: subcategory.name.trim() || 'Без названия',
          categoryID: category.id,
          subcategoryID: subcategory.id,
        }))

      return {
        id: category.id,
        name,
        option,
        subcategories: childOptions,
      }
    })
    .sort(
      (first, second) =>
        getCategoryUsage(usageStats, second.id) - getCategoryUsage(usageStats, first.id) ||
        getCategoryPosition(categories, first.id) - getCategoryPosition(categories, second.id),
    )
}

export function getCategoryValue(operation: Operation) {
  if (operation.subcategoryID) {
    return `subcategory:${operation.categoryID}:${operation.subcategoryID}`
  }

  return operation.categoryID ? `category:${operation.categoryID}` : ''
}

function getRecentCategoryUsageStats(operations: Operation[], operationType: number): CategoryUsageStats {
  const stats: CategoryUsageStats = {
    categories: new Map(),
    subcategories: new Map(),
  }

  operations
    .filter(operation => operation.type === operationType && isValidOperationDate(operation))
    .slice()
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, recentOperationsLimit)
    .forEach(operation => {
      if (operation.categoryID) {
        stats.categories.set(operation.categoryID, getCategoryUsage(stats, operation.categoryID) + 1)
      }

      if (operation.subcategoryID) {
        stats.subcategories.set(operation.subcategoryID, getSubcategoryUsage(stats, operation.subcategoryID) + 1)
      }
    })

  return stats
}

function getCategoryUsage(stats: CategoryUsageStats, id: string) {
  return stats.categories.get(id) || 0
}

function getSubcategoryUsage(stats: CategoryUsageStats, id: string) {
  return stats.subcategories.get(id) || 0
}

function getCategoryPosition(categories: Category[], id: string) {
  return categories.find(category => category.id === id)?.position || 0
}

function isValidOperationDate(operation: Operation) {
  return !Number.isNaN(new Date(operation.date).getTime())
}
