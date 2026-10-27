import { describe, expect, it } from 'vitest'
import { toggleSetMember } from '@/utils/collections'

describe('toggleSetMember', () => {
  it('adds a missing value to a copy and leaves the source untouched', () => {
    const source = new Set(['a'])

    const result = toggleSetMember(source, 'b')

    expect([...result]).toEqual(['a', 'b'])
    expect([...source]).toEqual(['a'])
  })

  it('removes a present value', () => {
    const result = toggleSetMember(new Set(['a', 'b']), 'a')

    expect([...result]).toEqual(['b'])
  })
})
