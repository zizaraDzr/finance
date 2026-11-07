import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { isPullReady, pullDistance, usePullToRefresh } from '@/composables/usePullToRefresh'

const mountedWrappers: ReturnType<typeof mount>[] = []

function mountHost(options: Parameters<typeof usePullToRefresh>[0] = {}) {
  const Host = defineComponent({
    setup() {
      usePullToRefresh(options)
      return () => h('div')
    },
  })

  const wrapper = mount(Host)
  mountedWrappers.push(wrapper)

  return wrapper
}

function touchEvent(type: string, clientY: number) {
  const event = new Event(type, { cancelable: true }) as unknown as TouchEvent
  Object.defineProperty(event, 'touches', { value: [{ clientY }] })

  return event
}

function pull(fromY: number, toY: number) {
  window.dispatchEvent(touchEvent('touchstart', fromY))
  window.dispatchEvent(touchEvent('touchmove', toY))
  window.dispatchEvent(new Event('touchend'))
}

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
})

describe('pull to refresh', () => {
  it('computes the distance with resistance', () => {
    expect(pullDistance(100, 300, 0)).toBe(100)
    expect(pullDistance(300, 100, 0)).toBe(0)
    expect(pullDistance(100, 300, 10)).toBe(0)
    expect(pullDistance(0, 1000, 0)).toBe(110)
  })

  it('is ready only after a long enough pull', () => {
    expect(isPullReady(69)).toBe(false)
    expect(isPullReady(70)).toBe(true)
  })

  it('reloads the page when pulled far enough', () => {
    const reload = vi.fn()
    mountHost({ reload })

    pull(100, 320)

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload after a short pull', () => {
    const reload = vi.fn()
    mountHost({ reload })

    pull(100, 150)

    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload while the page is scrolled', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    const reload = vi.fn()
    mountHost({ reload })

    pull(100, 320)

    expect(reload).not.toHaveBeenCalled()
  })

  it('does not reload while editing an operation', () => {
    const reload = vi.fn()
    mountHost({ reload, canRefresh: () => false })

    pull(100, 320)

    expect(reload).not.toHaveBeenCalled()
  })
})
