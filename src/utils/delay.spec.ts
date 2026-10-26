import { afterEach, describe, expect, it, vi } from 'vitest'
import { minOperationLoaderDuration, waitForMinimumDuration } from '@/utils/delay'

describe('waitForMinimumDuration', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits for the remaining part of the minimum duration', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'))

    const elapsed = Math.floor(minOperationLoaderDuration / 2)
    const remaining = minOperationLoaderDuration - elapsed
    let resolved = false
    const promise = waitForMinimumDuration(Date.now() - elapsed).then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(remaining - 1)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(resolved).toBe(true)

    await promise
  })

  it('uses the shared minimum duration by default', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'))

    let resolved = false
    const promise = waitForMinimumDuration(Date.now()).then(() => {
      resolved = true
    })

    await vi.advanceTimersByTimeAsync(minOperationLoaderDuration - 1)
    expect(resolved).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(resolved).toBe(true)

    await promise
  })

  it('resolves immediately when the minimum duration has already passed', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'))

    let resolved = false
    const promise = waitForMinimumDuration(Date.now() - minOperationLoaderDuration - 1).then(() => {
      resolved = true
    })

    await vi.runAllTimersAsync()
    expect(resolved).toBe(true)

    await promise
  })
})
