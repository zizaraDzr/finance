import { onBeforeUnmount, onMounted, ref } from 'vue'

const PULL_THRESHOLD = 70
const PULL_RESISTANCE = 0.5
const MAX_PULL = 110

export function pullDistance(startY: number, currentY: number, scrollY: number) {
  if (scrollY > 0) {
    return 0
  }

  const delta = currentY - startY

  if (delta <= 0) {
    return 0
  }

  return Math.min(MAX_PULL, delta * PULL_RESISTANCE)
}

export function isPullReady(distance: number) {
  return distance >= PULL_THRESHOLD
}

type PullOptions = {
  reload?: () => void
  canRefresh?: () => boolean
  target?: Window
}

// Жест «потянуть вниз» для установленного PWA: в standalone-режиме на iOS
// системного pull-to-refresh нет, поэтому перезагрузку делаем сами.
export function usePullToRefresh({
  reload = () => location.reload(),
  canRefresh = () => true,
  target = window,
}: PullOptions = {}) {
  const distance = ref(0)
  const isReady = ref(false)
  let startY: number | null = null

  function reset() {
    distance.value = 0
    isReady.value = false
    startY = null
  }

  function handleStart(event: TouchEvent) {
    const touch = event.touches[0]

    if (event.touches.length !== 1 || !touch || window.scrollY > 0 || !canRefresh()) {
      startY = null
      return
    }

    startY = touch.clientY
  }

  function handleMove(event: TouchEvent) {
    const touch = event.touches[0]

    if (startY === null || !touch) {
      return
    }

    const next = pullDistance(startY, touch.clientY, window.scrollY)

    distance.value = next
    isReady.value = isPullReady(next)

    if (next > 0 && event.cancelable) {
      event.preventDefault()
    }
  }

  function handleEnd() {
    if (isReady.value && canRefresh()) {
      reset()
      reload()
      return
    }

    reset()
  }

  onMounted(() => {
    target.addEventListener('touchstart', handleStart, { passive: true })
    target.addEventListener('touchmove', handleMove, { passive: false })
    target.addEventListener('touchend', handleEnd)
    target.addEventListener('touchcancel', handleEnd)
  })

  onBeforeUnmount(() => {
    target.removeEventListener('touchstart', handleStart)
    target.removeEventListener('touchmove', handleMove)
    target.removeEventListener('touchend', handleEnd)
    target.removeEventListener('touchcancel', handleEnd)
  })

  return { distance, isReady }
}
