import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import OperationsPage from '@/pages/OperationsPage.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { createAccount, createCategory, createOperation } from '@/test/fixtures'

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
      { path: '/operations', name: 'operations', component: { template: '<div />' } },
      { path: '/edit/:id', name: 'operation-edit', component: { template: '<div />' } },
    ],
  })
  await router.push('/operations?month=2026-10&period=month&type=expense')
  await router.isReady()

  const wrapper = mount(OperationsPage, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, store, router }
}

describe('OperationsPage', () => {
  it('shows only operations of the selected type', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const salary = createCategory({ id: 'cat-salary', name: 'Зарплата', type: 0 })
    const expense = createOperation({
      id: 'op-food',
      categoryID: 'cat-food',
      sum: 300,
      note: 'Хлеб',
      date: '2026-10-02T12:00:00.000Z',
    })
    const income = createOperation({
      id: 'op-salary',
      categoryID: 'cat-salary',
      type: 0,
      sum: 1000,
      note: 'Аванс',
      date: '2026-10-03T12:00:00.000Z',
    })
    const { wrapper } = await mountPage({
      Category: [food, salary],
      Operation: [expense, income],
    })

    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).not.toContain('Зарплата')
    expect(wrapper.text()).not.toContain('Аванс')
  })

  it('shows operations immediately for a category with one subcategory', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const operation = createOperation({
      id: 'op-food',
      categoryID: 'cat-food',
      sum: 300,
      note: 'Хлеб',
      date: '2026-10-02T12:00:00.000Z',
    })
    const { wrapper } = await mountPage({ Category: [food], Operation: [operation] })

    expect(wrapper.text()).not.toContain('Хлеб')

    await wrapper.find('button[aria-label="Показать Продукты"]').trigger('click')

    expect(wrapper.text()).toContain('Хлеб')
    expect(wrapper.findAll('.subcategory-breakdown__header')).toHaveLength(0)
  })

  it('does not mix in operations from another month', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const cafe = createCategory({ id: 'cat-cafe', name: 'Кафе', type: 1 })
    const { wrapper } = await mountPage({
      Category: [food, cafe],
      Operation: [
        createOperation({
          id: 'op-october',
          categoryID: 'cat-food',
          sum: 300,
          date: '2026-10-02T12:00:00.000Z',
        }),
        createOperation({
          id: 'op-september',
          categoryID: 'cat-cafe',
          sum: 200,
          date: '2026-09-02T12:00:00.000Z',
        }),
      ],
    })

    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).not.toContain('Кафе')
  })

  it('finds a category by a note inside the selected month', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const cafe = createCategory({ id: 'cat-cafe', name: 'Кафе', type: 1 })
    const { wrapper } = await mountPage({
      Category: [food, cafe],
      Operation: [
        createOperation({
          id: 'op-bread',
          categoryID: 'cat-food',
          sum: 300,
          note: 'Хлеб',
          date: '2026-10-02T12:00:00.000Z',
        }),
        createOperation({
          id: 'op-coffee',
          categoryID: 'cat-cafe',
          sum: 200,
          note: 'Кофе',
          date: '2026-10-03T12:00:00.000Z',
        }),
      ],
    })

    await wrapper.find('input[type="search"]').setValue('хлеб')

    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).not.toContain('Кафе')
  })
})
