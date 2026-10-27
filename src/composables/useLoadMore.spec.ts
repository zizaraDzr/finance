import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useLoadMore } from '@/composables/useLoadMore'

function setup(values: number[], size: number) {
  const items = ref(values)
  const pageSize = ref(size)

  return {
    items,
    pageSize,
    ...useLoadMore(() => items.value, () => pageSize.value),
  }
}

describe('useLoadMore', () => {
  it('reveals items page by page', () => {
    const { visibleItems, hiddenCount, nextCount, loadMore } = setup([1, 2, 3, 4, 5], 2)

    expect(visibleItems.value).toEqual([1, 2])
    expect(hiddenCount.value).toBe(3)
    expect(nextCount.value).toBe(2)

    loadMore()

    expect(visibleItems.value).toEqual([1, 2, 3, 4])
    expect(hiddenCount.value).toBe(1)
    expect(nextCount.value).toBe(1)

    loadMore()

    expect(visibleItems.value).toEqual([1, 2, 3, 4, 5])
    expect(hiddenCount.value).toBe(0)
    expect(nextCount.value).toBe(0)
  })

  it('shows everything at once', () => {
    const { visibleItems, hiddenCount, showAll } = setup([1, 2, 3, 4, 5], 2)

    showAll()

    expect(visibleItems.value).toEqual([1, 2, 3, 4, 5])
    expect(hiddenCount.value).toBe(0)
  })

  it('resets to the first page', () => {
    const { visibleItems, hiddenCount, loadMore, reset } = setup([1, 2, 3, 4, 5], 2)

    loadMore()
    loadMore()
    reset()

    expect(visibleItems.value).toEqual([1, 2])
    expect(hiddenCount.value).toBe(3)
  })

  it('follows a shorter source and an empty source', () => {
    const { items, visibleItems, hiddenCount } = setup([1, 2, 3], 2)

    items.value = [1]

    expect(visibleItems.value).toEqual([1])
    expect(hiddenCount.value).toBe(0)

    items.value = []

    expect(visibleItems.value).toEqual([])
    expect(hiddenCount.value).toBe(0)
  })

  it('uses the page size at the moment of the click', () => {
    const { pageSize, visibleItems, loadMore } = setup([1, 2, 3, 4, 5, 6], 2)

    pageSize.value = 3
    loadMore()

    expect(visibleItems.value).toEqual([1, 2, 3, 4, 5])
  })
})
