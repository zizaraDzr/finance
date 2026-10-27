import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'
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
      { path: '/categories', name: 'categories', component: { template: '<div />' } },
      { path: '/operations', name: 'operations', component: { template: '<div />' } },
      { path: '/expense-analytics', name: 'expense-analytics', component: { template: '<div />' } },
      { path: '/category-analytics', name: 'category-analytics', component: { template: '<div />' } },
    ],
  })
  await router.push('/?month=2026-10')
  await router.isReady()

  const wrapper = mount(DashboardPage, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, store, router }
}

async function openHeaderLink(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], label: string) {
  const button = wrapper.findAll('button').find(item => item.text() === label)

  expect(button).toBeDefined()
  await button?.trigger('click')
  await flushPromises()
}

describe('DashboardPage', () => {
  it('renders recent operations of the selected month', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const operation = createOperation({
      id: 'op-food',
      categoryID: 'cat-food',
      sum: 300,
      date: '2026-10-02T12:00:00.000Z',
    })
    const { wrapper } = await mountPage({ Category: [food], Operation: [operation] })

    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).toContain('Октябрь 2026')
  })

  it('opens the categories page with the selected month', async () => {
    const { wrapper, router } = await mountPage()

    await openHeaderLink(wrapper, 'Категории')

    expect(router.currentRoute.value.name).toBe('categories')
    expect(router.currentRoute.value.query.month).toBe('2026-10')
  })

  it('opens the category analytics page with the selected month', async () => {
    const { wrapper, router } = await mountPage()

    await openHeaderLink(wrapper, 'Аналитика')

    expect(router.currentRoute.value.name).toBe('category-analytics')
    expect(router.currentRoute.value.query.month).toBe('2026-10')
  })
})
