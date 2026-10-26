export const minOperationLoaderDuration = 800

export function waitForMinimumDuration(startedAt: number, duration = minOperationLoaderDuration) {
  const remaining = duration - (Date.now() - startedAt)

  return new Promise<void>(resolve => {
    setTimeout(resolve, Math.max(remaining, 0))
  })
}
