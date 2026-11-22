import { describe, expect, it } from 'vitest'
import {
  estimateHintWidth,
  fitHintInArea,
  placePointHint,
  type ChartArea,
} from '@/utils/chart'

const plotArea: ChartArea = { left: 28, right: 692, top: 34, bottom: 238 }

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
