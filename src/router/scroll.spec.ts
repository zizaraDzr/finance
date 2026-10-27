import { describe, expect, it } from 'vitest'
import { resolveScrollPosition } from '@/router/scroll'

function route(path: string) {
  return { path } as unknown as Parameters<typeof resolveScrollPosition>[0]
}

describe('resolveScrollPosition', () => {
  it('keeps the place when only the query of the same page changes', () => {
    expect(resolveScrollPosition(route('/category-analytics'), route('/category-analytics'), null)).toBe(
      false,
    )
  })

  it('restores the saved position of a back navigation', () => {
    expect(
      resolveScrollPosition(route('/category-analytics'), route('/'), { left: 0, top: 240 }),
    ).toEqual({ left: 0, top: 240 })
  })

  it('starts another page from the top', () => {
    expect(resolveScrollPosition(route('/categories'), route('/category-analytics'), null)).toEqual({
      top: 0,
    })
  })
})
