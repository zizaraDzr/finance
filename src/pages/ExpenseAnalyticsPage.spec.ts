import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ExpenseAnalyticsPage from '@/pages/ExpenseAnalyticsPage.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { createAccount, createCategory, createOperation, createSubcategory } from '@/test/fixtures'

async function mountPage(data: FinanceData = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useFinanceStore()
  store.loadData({
    Account: [createAccount()],
    Category: [],
    Operation: [],
    Subcategory: [],
    Target: [],
    ...data,
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
      { path: '/expense-analytics', name: 'expense-analytics', component: { template: '<div />' } },
    ],
  })
  await router.push('/expense-analytics?month=2026-10&expensePeriod=month')
  await router.isReady()

  const wrapper = mount(ExpenseAnalyticsPage, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, store, router }
}

describe('ExpenseAnalyticsPage', () => {
  it('sorts categories by expense amount and uses the category name instead of a placeholder', async () => {
    const gifts = createCategory({ id: 'cat-gifts', name: 'Подарки', type: 1 })
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const dairy = createSubcategory({ id: 'sub-dairy', name: 'Молочные', categoryID: 'cat-food' })
    const { wrapper } = await mountPage({
      Category: [food, gifts],
      Subcategory: [dairy],
      Operation: [
        createOperation({
          id: 'op-gift',
          categoryID: 'cat-gifts',
          sum: 500,
          date: '2026-10-02T12:00:00.000Z',
        }),
        createOperation({
          id: 'op-food',
          categoryID: 'cat-food',
          sum: 200,
          date: '2026-10-03T12:00:00.000Z',
        }),
        createOperation({
          id: 'op-dairy',
          categoryID: 'cat-food',
          subcategoryID: 'sub-dairy',
          sum: 100,
          date: '2026-10-04T12:00:00.000Z',
        }),
      ],
    })

    const groups = wrapper.findAll('.expense-breakdown__group')
    expect(groups[0]?.text()).toContain('Подарки')

    await wrapper.find('button[aria-label="Показать Продукты"]').trigger('click')

    const subcategories = wrapper.find('.expense-subcategories')
    expect(subcategories.text()).toContain('Молочные')
    expect(subcategories.text()).toContain('Продукты')
    expect(subcategories.text()).not.toContain('Без подкатегории')
  })
})
