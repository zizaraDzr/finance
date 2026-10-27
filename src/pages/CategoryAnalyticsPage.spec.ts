import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import CategoryAnalyticsPage from '@/pages/CategoryAnalyticsPage.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { createAccount, createCategory, createOperation, createSubcategory } from '@/test/fixtures'

async function mountPage(data: FinanceData = {}, url = '/category-analytics?month=2026-03') {
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
      { path: '/category-analytics', name: 'category-analytics', component: { template: '<div />' } },
    ],
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(CategoryAnalyticsPage, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, store, router }
}

async function clickOption(
  wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'],
  selector: string,
  label: string,
) {
  const button = wrapper.findAll(`${selector} button`).find(item => item.text() === label)

  expect(button).toBeDefined()
  await button?.trigger('click')
  await flushPromises()
}

function normalizeSpaces(value: string) {
  return value.replace(/\s/g, ' ')
}

const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
const gifts = createCategory({ id: 'cat-gifts', name: 'Подарки', type: 1 })
const dairy = createSubcategory({ id: 'sub-dairy', name: 'Молочные', categoryID: 'cat-food' })
const bakery = createSubcategory({ id: 'sub-bakery', name: 'Хлебное', categoryID: 'cat-food' })

function foodOperation(overrides: Parameters<typeof createOperation>[0]) {
  return createOperation({ categoryID: food.id, type: 1, ...overrides })
}

describe('CategoryAnalyticsPage', () => {
  it('lists the expense categories and starts from the biggest one', async () => {
    const { wrapper } = await mountPage({
      Category: [food, gifts],
      Operation: [
        foodOperation({ id: 'op-food', sum: 300, date: '2026-01-10T12:00:00.000Z' }),
        createOperation({
          id: 'op-gift',
          categoryID: gifts.id,
          sum: 500,
          date: '2026-01-11T12:00:00.000Z',
        }),
      ],
    })

    const pickerButtons = wrapper.findAll('.category-analytics__picker button')
    expect(pickerButtons.map(button => button.text())).toEqual(['Подарки', 'Продукты'])
    expect(pickerButtons[0]?.classes()).toContain('period-switch__button--active')
    expect(wrapper.find('.analytics-summary').text()).toContain('500')
  })

  it('shows the whole-period total, the monthly average and the change to the previous month', async () => {
    const { wrapper } = await mountPage(
      {
        Category: [food],
        Operation: [
          foodOperation({ id: 'op-jan', sum: 100, date: '2026-01-10T12:00:00.000Z' }),
          foodOperation({ id: 'op-feb', sum: 200, date: '2026-02-10T12:00:00.000Z' }),
          foodOperation({ id: 'op-mar', sum: 300, date: '2026-03-10T12:00:00.000Z' }),
        ],
      },
      '/category-analytics?month=2026-03&category=cat-food',
    )

    const summary = wrapper.find('.analytics-summary')
    expect(summary.text()).toContain('600')
    expect(summary.text()).toContain('200')
    expect(summary.text()).toContain('В среднем в месяц')
    expect(summary.text()).toContain('К предыдущему месяцу')
    expect(normalizeSpaces(summary.find('.analytics-change').text())).toBe('+50% (+100 ₽)')

    expect(wrapper.findAll('.category-trend-chart__bar')).toHaveLength(3)
    expect(wrapper.find('.analytics-chart').text()).toContain('Янв 26')
  })

  it('switches the analysed category from the picker and keeps it in the URL', async () => {
    const { wrapper, router } = await mountPage({
      Category: [food, gifts],
      Operation: [
        foodOperation({ id: 'op-food', sum: 300, date: '2026-01-10T12:00:00.000Z' }),
        createOperation({
          id: 'op-gift',
          categoryID: gifts.id,
          sum: 500,
          date: '2026-01-11T12:00:00.000Z',
        }),
      ],
    })

    await clickOption(wrapper, '.category-analytics__picker', 'Продукты')

    expect(router.currentRoute.value.query.category).toBe('cat-food')
    expect(wrapper.find('.analytics-summary').text()).toContain('300')
  })

  it('shows every subcategory with its share and its change in percent and rubles', async () => {
    const { wrapper } = await mountPage(
      {
        Category: [food],
        Subcategory: [dairy, bakery],
        Operation: [
          foodOperation({
            id: 'op-dairy-jan',
            subcategoryID: dairy.id,
            sum: 100,
            date: '2026-01-10T12:00:00.000Z',
          }),
          foodOperation({
            id: 'op-dairy-feb',
            subcategoryID: dairy.id,
            sum: 300,
            date: '2026-02-10T12:00:00.000Z',
          }),
          foodOperation({
            id: 'op-bakery-jan',
            subcategoryID: bakery.id,
            sum: 300,
            date: '2026-01-11T12:00:00.000Z',
          }),
        ],
      },
      '/category-analytics?month=2026-03&category=cat-food',
    )

    const rows = wrapper.findAll('.category-analytics__subcategory')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Молочные')
    expect(rows[0]?.text()).toContain('57,1%')
    expect(normalizeSpaces(rows[0]?.text() ?? '')).toContain('+200% (+200 ₽) к предыдущему месяцу')
    expect(rows[1]?.text()).toContain('Хлебное')
    expect(normalizeSpaces(rows[1]?.text() ?? '')).toContain('−100% (−300 ₽) к предыдущему месяцу')
  })

  it('hides the subcategory breakdown when the category has none', async () => {
    const { wrapper } = await mountPage(
      {
        Category: [food],
        Operation: [foodOperation({ id: 'op-food', sum: 300, date: '2026-01-10T12:00:00.000Z' })],
      },
      '/category-analytics?month=2026-03&category=cat-food',
    )

    expect(wrapper.findAll('.category-analytics__subcategory')).toHaveLength(0)
    expect(wrapper.find('.analytics-summary').exists()).toBe(true)
  })

  it('keeps a deleted category out of the picker', async () => {
    const removed = createCategory({ id: 'cat-old', name: 'Старое', type: 1, isDeleted: true })
    const { wrapper } = await mountPage({
      Category: [food, removed],
      Operation: [
        foodOperation({ id: 'op-food', sum: 300, date: '2026-01-10T12:00:00.000Z' }),
        createOperation({
          id: 'op-old',
          categoryID: removed.id,
          sum: 700,
          date: '2026-01-11T12:00:00.000Z',
        }),
      ],
    })

    const picker = wrapper.find('.category-analytics__picker')
    expect(picker.text()).toContain('Продукты')
    expect(picker.text()).not.toContain('Старое')
  })

  it('keeps a deleted subcategory out of the breakdown', async () => {
    const removed = createSubcategory({
      id: 'sub-old',
      name: 'Старое',
      categoryID: food.id,
      isDeleted: true,
    })
    const { wrapper } = await mountPage(
      {
        Category: [food],
        Subcategory: [dairy, removed],
        Operation: [
          foodOperation({
            id: 'op-dairy',
            subcategoryID: dairy.id,
            sum: 100,
            date: '2026-01-10T12:00:00.000Z',
          }),
          foodOperation({
            id: 'op-old',
            subcategoryID: removed.id,
            sum: 700,
            date: '2026-01-11T12:00:00.000Z',
          }),
        ],
      },
      '/category-analytics?month=2026-03&category=cat-food',
    )

    const rows = wrapper.findAll('.category-analytics__subcategory')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.text()).toContain('Молочные')
    expect(wrapper.text()).not.toContain('Старое')
  })

  it('groups the chart by years when the year granularity is chosen', async () => {
    const { wrapper, router } = await mountPage(
      {
        Category: [food],
        Operation: [
          foodOperation({ id: 'op-2025', sum: 100, date: '2025-01-10T12:00:00.000Z' }),
          foodOperation({ id: 'op-2026', sum: 300, date: '2026-01-10T12:00:00.000Z' }),
        ],
      },
      '/category-analytics?month=2026-03&category=cat-food',
    )

    await clickOption(wrapper, '.category-analytics__granularity', 'Год')

    expect(router.currentRoute.value.query.granularity).toBe('year')
    expect(wrapper.findAll('.category-trend-chart__bar')).toHaveLength(2)
    expect(wrapper.find('.analytics-chart').text()).toContain('2025')
    expect(wrapper.find('.analytics-chart').text()).toContain('2026')
    expect(wrapper.find('.analytics-summary').text()).toContain('В среднем в год')
    expect(wrapper.find('.analytics-summary').text()).toContain('К предыдущему году')
    expect(normalizeSpaces(wrapper.find('.analytics-change').text())).toBe('+200% (+200 ₽)')
  })

  it('cuts the chart down to the chosen number of years', async () => {
    const { wrapper, router } = await mountPage(
      {
        Category: [food],
        Operation: [
          foodOperation({ id: 'op-2024', sum: 100, date: '2024-01-10T12:00:00.000Z' }),
          foodOperation({ id: 'op-2026', sum: 300, date: '2026-01-10T12:00:00.000Z' }),
        ],
      },
      '/category-analytics?month=2026-03&category=cat-food',
    )

    expect(wrapper.findAll('.category-trend-chart__bar')).toHaveLength(25)

    await clickOption(wrapper, '.category-analytics__window', '1 год')

    expect(router.currentRoute.value.query.window).toBe('1')
    expect(wrapper.findAll('.category-trend-chart__bar')).toHaveLength(12)
  })

  it('keeps the granularity and the window when another category is picked', async () => {
    const { wrapper, router } = await mountPage(
      {
        Category: [food, gifts],
        Operation: [
          foodOperation({ id: 'op-food', sum: 300, date: '2026-01-10T12:00:00.000Z' }),
          createOperation({
            id: 'op-gift',
            categoryID: gifts.id,
            sum: 500,
            date: '2026-01-11T12:00:00.000Z',
          }),
        ],
      },
      '/category-analytics?month=2026-03&category=cat-gifts&granularity=year&window=2',
    )

    await clickOption(wrapper, '.category-analytics__picker', 'Продукты')

    expect(router.currentRoute.value.query).toMatchObject({
      category: 'cat-food',
      granularity: 'year',
      window: '2',
    })
  })

  it('shows an empty state when there are no expenses yet', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find('.empty-state').text()).toContain('пока нет')
    expect(wrapper.find('.category-analytics__picker').exists()).toBe(false)
  })
})
