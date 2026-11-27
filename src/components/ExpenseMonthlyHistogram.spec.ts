import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExpenseMonthlyHistogram from '@/components/ExpenseMonthlyHistogram.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { createAccount, createOperation } from '@/test/fixtures'
import { estimateHintWidth } from '@/utils/chart'
import { formatMoney } from '@/utils/formatters'

function mountHistogram(selectedYear: number, data: FinanceData = {}) {
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

  const wrapper = mount(ExpenseMonthlyHistogram, {
    props: { selectedYear },
    global: {
      plugins: [pinia],
    },
  })

  return { wrapper, store }
}

function createYearExpense(year: number, monthIndex: number, sum = 300) {
  return createOperation({
    sum,
    date: new Date(year, monthIndex, 10, 12).toISOString(),
  })
}

describe('ExpenseMonthlyHistogram', () => {
  it('emits the month key when a month of a past year is clicked', async () => {
    const selectedYear = new Date().getFullYear() - 1
    const { wrapper } = mountHistogram(selectedYear, {
      Operation: [createYearExpense(selectedYear, 4)],
    })

    const columns = wrapper.findAll('.histogram-chart__month')
    expect(columns).toHaveLength(12)
    expect(wrapper.findAll('.histogram-chart__hit-area')).toHaveLength(12)

    await columns[4]?.trigger('click')

    expect(wrapper.emitted('selectMonth')).toEqual([[`${selectedYear}-05`]])
  })

  it('does not emit for months that have not started yet', async () => {
    const selectedYear = new Date().getFullYear() + 1
    const { wrapper } = mountHistogram(selectedYear, {
      Operation: [createYearExpense(selectedYear, 0)],
    })

    const columns = wrapper.findAll('.histogram-chart__month')
    expect(columns).toHaveLength(12)
    expect(columns[0]?.attributes('aria-disabled')).toBe('true')

    await columns[0]?.trigger('click')

    expect(wrapper.emitted('selectMonth')).toBeUndefined()
  })

  it('captions every month column with its expense sum instead of only the maximum', () => {
    const { wrapper } = mountHistogram(2026, {
      Operation: [createYearExpense(2026, 4, 300), createYearExpense(2026, 11, 1200)],
    })

    const sums = wrapper.findAll('.histogram-chart__sum-label')
    expect(sums).toHaveLength(12)
    expect(sums[4]?.text()).toBe(formatMoney(300, '₽'))
    expect(sums[11]?.text()).toBe(formatMoney(1200, '₽'))
    expect(wrapper.find('.histogram-chart__max-label').exists()).toBe(false)
  })

  it('prepares short sums for the narrow chart', () => {
    const { wrapper } = mountHistogram(2026, {
      Operation: [createYearExpense(2026, 4, 300), createYearExpense(2026, 11, 12_000)],
    })

    const sums = wrapper.findAll('.histogram-chart__sum-compact')
    expect(sums).toHaveLength(2)
    expect(sums[0]?.text()).toBe('300')
    expect(sums[1]?.text()).toBe('12к')
  })

  it('keeps the sums of the first and the last month inside the plot area', () => {
    const huge = 999999999
    const { wrapper } = mountHistogram(2026, {
      Operation: [createYearExpense(2026, 0, huge), createYearExpense(2026, 11, huge)],
    })

    const sums = wrapper.findAll('.histogram-chart__sum-label')
    const fontSize = 9.6
    const text = formatMoney(huge, '₽')
    const halfWidth = estimateHintWidth(text, fontSize) / 2

    for (const index of [0, 11]) {
      const x = Number(sums[index]?.attributes('x'))
      expect(x - halfWidth).toBeGreaterThanOrEqual(28)
      expect(x + halfWidth).toBeLessThanOrEqual(692)
    }
  })

  it('keeps the average hint inside the plot area when every month is equal', () => {
    const year = new Date().getFullYear() - 1
    const { wrapper } = mountHistogram(year, {
      Operation: Array.from({ length: 12 }, (_, monthIndex) => createYearExpense(year, monthIndex, 100)),
    })

    const label = wrapper.find('.histogram-chart__average-label')
    const y = Number(label.attributes('y'))

    expect(y).toBeGreaterThanOrEqual(34)
    expect(y).toBeLessThanOrEqual(238)
  })
})
