import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
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

function readPolyline(wrapper: VueWrapper, selector: string) {
  const points = wrapper.find(selector).attributes('points') ?? ''

  return points
    .trim()
    .split(/\s+/)
    .map(pair => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x ?? 0, y: y ?? 0 }
    })
}

function interpolateY(points: { x: number; y: number }[], x: number) {
  const index = points.findIndex((point, i) => i > 0 && point.x >= x)
  const right = points[index]
  const left = points[index - 1]

  if (!left || !right || right.x === left.x) {
    return Number.NaN
  }

  return left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x)
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

  it('keeps the previous day dot on the previous line when the previous month is longer', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 26, 12))
    const { wrapper } = mountChart('2026-11', 'month', {
      Operation: [
        createOperation({ sum: 1000, date: new Date(2026, 10, 26, 12).toISOString() }),
        createOperation({ sum: 500, date: new Date(2026, 9, 26, 12).toISOString() }),
        createOperation({ sum: 3000, date: new Date(2026, 9, 27, 12).toISOString() }),
      ],
    })

    const markerX = Number(wrapper.find('.trend-chart__today').attributes('x1'))
    const previousPoints = readPolyline(wrapper, '.trend-chart__line--previous')
    const previousDot = wrapper.find('.trend-chart__dot--previous')

    expect(Number(previousDot.attributes('cx'))).toBeCloseTo(markerX, 5)
    expect(previousPoints[25]?.x).toBeCloseTo(markerX, 5)
    expect(Number(previousDot.attributes('cy'))).toBeCloseTo(interpolateY(previousPoints, markerX), 5)
  })

  it('puts the bigger value hint above the smaller one even when it has to go below its point', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 15, 12))
    const { wrapper } = mountChart('2026-11', 'year', {
      Operation: [
        createOperation({ sum: 1000, date: new Date(2026, 9, 1, 12).toISOString() }),
        createOperation({ sum: 860, date: new Date(2025, 9, 1, 12).toISOString() }),
      ],
    })

    const current = wrapper.find('.trend-chart__value--current')
    const previous = wrapper.find('.trend-chart__value--previous')
    const currentY = Number(current.attributes('y'))
    const previousY = Number(previous.attributes('y'))

    expect(currentY).toBeLessThan(previousY)
    expect(previousY - currentY).toBeGreaterThanOrEqual(23)
  })

  it('does not let the current and the previous value hints overlap', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 22, 12))
    const { wrapper } = mountChart('2026-11', 'month', {
      Operation: [
        createOperation({ sum: 1000, date: new Date(2026, 10, 22, 12).toISOString() }),
        createOperation({ sum: 900, date: new Date(2026, 9, 22, 12).toISOString() }),
      ],
    })

    const current = wrapper.find('.trend-chart__value--current')
    const previous = wrapper.find('.trend-chart__value--previous')
    const currentY = Number(current.attributes('y'))
    const previousY = Number(previous.attributes('y'))

    expect(current.attributes('text-anchor')).toBe(previous.attributes('text-anchor'))
    expect(Math.abs(currentY - previousY)).toBeGreaterThanOrEqual(23)
  })
})
