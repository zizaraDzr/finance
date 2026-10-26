import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OperationPeriodGroup from '@/components/OperationPeriodGroup.vue'
import type {
  OperationCategoryGroup,
  OperationPeriodGroup as OperationPeriodGroupData,
  Subcategory,
} from '@/types'
import { createOperation } from '@/test/fixtures'

const subcategories = new Map<string, Subcategory>([
  [
    'sub-birthday',
    {
      id: 'sub-birthday',
      isDeleted: false,
      name: 'День рождения',
      isActive: true,
      position: 0,
      categoryID: 'cat-gifts',
    },
  ],
  [
    'sub-wedding',
    {
      id: 'sub-wedding',
      isDeleted: false,
      name: 'Свадьба',
      isActive: true,
      position: 1,
      categoryID: 'cat-gifts',
    },
  ],
])

const getCategoryName = (id: string | null) => {
  if (id === 'cat-food') {
    return 'Продукты'
  }

  if (id === 'cat-gifts') {
    return 'Подарки'
  }

  return 'Без категории'
}

const getSubcategory = (id: string | null) => (id ? subcategories.get(id) : null)

const foodOperation = createOperation({
  id: 'op-food',
  categoryID: 'cat-food',
  subcategoryID: null,
  note: 'Хлеб',
  sum: 300,
})

const birthdayOperation = createOperation({
  id: 'op-birthday',
  categoryID: 'cat-gifts',
  subcategoryID: 'sub-birthday',
  note: 'Торт',
  sum: 400,
})

const weddingOperation = createOperation({
  id: 'op-wedding',
  categoryID: 'cat-gifts',
  subcategoryID: 'sub-wedding',
  note: 'Букет',
  sum: 500,
})

const foodCategory: OperationCategoryGroup = {
  key: 'cat-food',
  name: 'Продукты',
  income: 0,
  expense: 300,
  balance: -300,
  count: 1,
  subcategories: [
    {
      key: 'cat-food:without-subcategory',
      name: 'Продукты',
      income: 0,
      expense: 300,
      balance: -300,
      count: 1,
      operations: [foodOperation],
    },
  ],
}

const giftsCategory: OperationCategoryGroup = {
  key: 'cat-gifts',
  name: 'Подарки',
  income: 0,
  expense: 900,
  balance: -900,
  count: 2,
  subcategories: [
    {
      key: 'sub-birthday',
      name: 'День рождения',
      income: 0,
      expense: 400,
      balance: -400,
      count: 1,
      operations: [birthdayOperation],
    },
    {
      key: 'sub-wedding',
      name: 'Свадьба',
      income: 0,
      expense: 500,
      balance: -500,
      count: 1,
      operations: [weddingOperation],
    },
  ],
}

const group: OperationPeriodGroupData = {
  key: '2026-10',
  title: 'Октябрь 2026',
  subtitle: 'Месяц',
  operations: [foodOperation, birthdayOperation, weddingOperation],
  categories: [foodCategory, giftsCategory],
  income: 0,
  expense: 1200,
  balance: -1200,
  count: 3,
}

function mountGroup() {
  return mount(OperationPeriodGroup, {
    props: {
      currencySymbol: '₽',
      getCategoryName,
      getSubcategory,
      group,
      period: 'month',
    },
  })
}

describe('OperationPeriodGroup', () => {
  it('hides operations until the category accordion is open', () => {
    const wrapper = mountGroup()

    expect(wrapper.find('.subcategory-breakdown').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Хлеб')
    expect(wrapper.text()).not.toContain('Торт')
  })

  it('renders a single subcategory without its own header and opens it with the category', async () => {
    const wrapper = mountGroup()

    await wrapper.find('button[aria-label="Показать Продукты"]').trigger('click')

    expect(wrapper.findAll('button[aria-label="Показать Продукты"]')).toHaveLength(1)
    expect(wrapper.find('.subcategory-breakdown--single').exists()).toBe(true)
    expect(wrapper.findAll('.subcategory-breakdown__header')).toHaveLength(0)
    expect(wrapper.text()).toContain('Хлеб')
  })

  it('keeps subcategory accordions when a category has several subcategories', async () => {
    const wrapper = mountGroup()

    await wrapper.find('button[aria-label="Показать Подарки"]').trigger('click')

    expect(wrapper.findAll('.subcategory-breakdown__header')).toHaveLength(2)
    expect(wrapper.text()).not.toContain('Торт')
    expect(wrapper.text()).not.toContain('Букет')

    await wrapper.find('button[aria-label="Показать День рождения"]').trigger('click')

    expect(wrapper.text()).toContain('Торт')
    expect(wrapper.text()).not.toContain('Букет')
  })
})
