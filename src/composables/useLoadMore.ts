import { computed, ref } from 'vue'

export function useLoadMore<T>(items: () => readonly T[], pageSize: () => number) {
  const visibleCount = ref(pageSize())
  const visibleItems = computed(() => items().slice(0, visibleCount.value))
  const hiddenCount = computed(() => Math.max(items().length - visibleItems.value.length, 0))
  const nextCount = computed(() => Math.min(pageSize(), hiddenCount.value))

  function loadMore() {
    visibleCount.value += pageSize()
  }

  function showAll() {
    visibleCount.value = items().length
  }

  function reset() {
    visibleCount.value = pageSize()
  }

  return {
    visibleItems,
    hiddenCount,
    nextCount,
    loadMore,
    showAll,
    reset,
  }
}
