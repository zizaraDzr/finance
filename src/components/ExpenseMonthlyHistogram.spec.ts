import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExpenseMonthlyHistogram from '@/components/ExpenseMonthlyHistogram.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { createAccount, createOperation } from '@/test/fixtures'

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
})
