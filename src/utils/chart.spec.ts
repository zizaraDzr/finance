import { describe, expect, it } from 'vitest'
import {
  estimateHintWidth,
  fitHintInArea,
  placePointHint,
  placePointHints,
  type ChartArea,
} from '@/utils/chart'

const plotArea: ChartArea = { left: 28, right: 692, top: 34, bottom: 238 }

function placePair(input: Parameters<typeof placePointHints>[0]) {
  const [first, second] = placePointHints(input)

  if (!first || !second) {
    throw new Error('Expected exactly two placed hints')
  }

  return { first, second }
}

describe('estimateHintWidth', () => {
  it('grows with the text length and the font size', () => {
    expect(estimateHintWidth('12345', 10)).toBeCloseTo(28, 5)
    expect(estimateHintWidth('1234567890', 10)).toBeCloseTo(56, 5)
    expect(estimateHintWidth('12345', 20)).toBeCloseTo(56, 5)
  })
})

describe('fitHintInArea', () => {
  it('moves a text that starts too close to the right edge back inside', () => {
    const placement = fitHintInArea({
      text: '12345',
      x: 680,
      y: 100,
      anchor: 'start',
      fontSize: 10,
      area: plotArea,
    })

    expect(placement).toEqual({ anchor: 'start', x: 664, y: 100 })
  })

  it('moves a text that ends too close to the left edge back inside', () => {
    const placement = fitHintInArea({
      text: '12345',
      x: 40,
      y: 100,
      anchor: 'end',
      fontSize: 10,
      area: plotArea,
    })

    expect(placement).toEqual({ anchor: 'end', x: 56, y: 100 })
  })

  it('centers a middle-anchored text inside the area', () => {
    const placement = fitHintInArea({
      text: '12345',
      x: 30,
      y: 100,
      anchor: 'middle',
      fontSize: 10,
      area: plotArea,
    })

    expect(placement).toEqual({ anchor: 'middle', x: 42, y: 100 })
  })

  it('keeps the baseline between the top and the bottom of the area', () => {
    const above = fitHintInArea({
      text: '12345',
      x: 300,
      y: 35,
      anchor: 'middle',
      fontSize: 10,
      area: plotArea,
    })
    const below = fitHintInArea({
      text: '12345',
      x: 300,
      y: 250,
      anchor: 'middle',
      fontSize: 10,
      area: plotArea,
    })

    expect(above.y).toBeCloseTo(41.8, 5)
    expect(below.y).toBeCloseTo(235.8, 5)
  })

  it('keeps an oversized text starting at the left edge instead of dropping it', () => {
    const placement = fitHintInArea({
      text: 'x'.repeat(200),
      x: 600,
      y: 100,
      anchor: 'start',
      fontSize: 10,
      area: plotArea,
    })

    expect(placement.x).toBe(28)
  })
})

describe('placePointHint', () => {
  it('puts the hint to the right of a point with enough room', () => {
    const placement = placePointHint({
      text: '100 ₽',
      pointX: 500,
      pointY: 100,
      fontSize: 10,
      area: plotArea,
    })

    expect(placement).toEqual({ anchor: 'start', x: 508, y: 94 })
  })

  it('puts the hint to the left of a point near the right edge', () => {
    const placement = placePointHint({
      text: '100 ₽',
      pointX: 680,
      pointY: 100,
      fontSize: 10,
      area: plotArea,
    })

    expect(placement).toEqual({ anchor: 'end', x: 672, y: 94 })
  })

  it('puts the hint below a point near the top edge', () => {
    const placement = placePointHint({
      text: '100 ₽',
      pointX: 500,
      pointY: 36,
      fontSize: 10,
      area: plotArea,
    })

    expect(placement).toEqual({ anchor: 'start', x: 508, y: 52 })
  })
})

describe('placePointHints', () => {
  it('separates hints that would otherwise overlap near the right edge', () => {
    const { first, second } = placePair({
      hints: [
        { text: '100 ₽', pointY: 190 },
        { text: '90 ₽', pointY: 195 },
      ],
      pointX: 680,
      fontSize: 10,
      area: plotArea,
    })

    expect(first.anchor).toBe('end')
    expect(second.anchor).toBe('end')
    expect(second.y - first.y).toBeCloseTo(12, 5)
    expect(second.y).toBeLessThanOrEqual(238)
  })

  it('keeps the input order when the lower label comes first', () => {
    const { first, second } = placePair({
      hints: [
        { text: '90 ₽', pointY: 195 },
        { text: '100 ₽', pointY: 190 },
      ],
      pointX: 680,
      fontSize: 10,
      area: plotArea,
    })

    expect(first.y).toBeGreaterThan(second.y)
    expect(first.y - second.y).toBeCloseTo(12, 5)
  })

  it('does not move hints that are already far apart', () => {
    const { first, second } = placePair({
      hints: [
        { text: '100 ₽', pointY: 60 },
        { text: '90 ₽', pointY: 180 },
      ],
      pointX: 500,
      fontSize: 10,
      area: plotArea,
    })

    expect(first).toEqual({ anchor: 'start', x: 508, y: 54, text: '100 ₽' })
    expect(second).toEqual({ anchor: 'start', x: 508, y: 174, text: '90 ₽' })
  })

  it('pulls the pair up when the lower hint does not fit above the bottom', () => {
    const { first, second } = placePair({
      hints: [
        { text: '100 ₽', pointY: 232 },
        { text: '90 ₽', pointY: 236 },
      ],
      pointX: 680,
      fontSize: 10,
      area: plotArea,
    })

    expect(first.y).toBeCloseTo(223.8, 5)
    expect(second.y).toBeCloseTo(235.8, 5)
  })
})
