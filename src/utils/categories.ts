import type { Category, CategoryOption, CategoryPickerGroup, Operation, Subcategory } from '@/types'

export function buildCategoryPickerGroups(categories: Category[], subcategories: Subcategory[], operationType: number) {
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
        .sort((first, second) => first.position - second.position)
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
}

export function getCategoryValue(operation: Operation) {
  if (operation.subcategoryID) {
    return `subcategory:${operation.categoryID}:${operation.subcategoryID}`
  }

  return operation.categoryID ? `category:${operation.categoryID}` : ''
}
