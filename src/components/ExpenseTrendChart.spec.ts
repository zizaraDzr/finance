import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExpenseTrendChart from '@/components/ExpenseTrendChart.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { createAccount, createOperation } from '@/test/fixtures'
import type { ExpensePeriod } from '@/types'

const chartLeft = 28
const chartRight = 702
const chartTop = 18
const chartBottom = 212

function mountChart(selectedMonthKey: string, period: ExpensePeriod, data: FinanceData = {}) {
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

  const wrapper = mount(ExpenseTrendChart, {
    props: { selectedMonthKey, period },
    global: {
      plugins: [pinia],
    },
  })

  return { wrapper, store }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ExpenseTrendChart hints', () => {
  it('keeps the today hint inside the plot area at the end of the month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 30, 12))
    const { wrapper } = mountChart('2026-11', 'month', {
      Operation: [
        createOperation({ sum: 1000, date: new Date(2026, 10, 30, 12).toISOString() }),
      ],
    })

    const hint = wrapper.find('.trend-chart__value--current')
    const x = Number(hint.attributes('x'))
    const y = Number(hint.attributes('y'))

    expect(hint.attributes('text-anchor')).toBe('end')
    expect(x).toBeGreaterThanOrEqual(chartLeft)
    expect(x).toBeLessThanOrEqual(chartRight)
    expect(y).toBeGreaterThanOrEqual(chartTop)
    expect(y).toBeLessThanOrEqual(chartBottom)
  })

  it('keeps the today hint inside the plot area at the end of the year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 15, 12))
    const { wrapper } = mountChart('2026-12', 'year', {
      Operation: [
        createOperation({ sum: 1000, date: new Date(2026, 11, 1, 12).toISOString() }),
      ],
    })

    const hint = wrapper.find('.trend-chart__value--current')
    const x = Number(hint.attributes('x'))

    expect(hint.attributes('text-anchor')).toBe('end')
    expect(x).toBeLessThanOrEqual(chartRight)
  })

  it('keeps the hint to the right of the point in the middle of the period', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 10, 12))
    const { wrapper } = mountChart('2026-11', 'month', {
      Operation: [
        createOperation({ sum: 100, date: new Date(2026, 10, 1, 12).toISOString() }),
        createOperation({ sum: 100, date: new Date(2026, 10, 10, 12).toISOString() }),
        createOperation({ sum: 500, date: new Date(2026, 10, 20, 12).toISOString() }),
      ],
    })

    const hint = wrapper.find('.trend-chart__value--current')

    expect(hint.attributes('text-anchor')).toBe('start')
  })
})
