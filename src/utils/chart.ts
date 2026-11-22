export type ChartArea = {
  left: number
  right: number
  top: number
  bottom: number
}

export type ChartHintAnchor = 'start' | 'middle' | 'end'

export type ChartHintPlacement = {
  anchor: ChartHintAnchor
  x: number
  y: number
}

type FitHintInput = {
  text: string
  x: number
  y: number
  anchor: ChartHintAnchor
  fontSize: number
  area: ChartArea
}

type PlacePointHintInput = {
  text: string
  pointX: number
  pointY: number
  fontSize: number
  area: ChartArea
  gap?: number
  lineGap?: number
}

// Символы в SVG-подсказках примерно в 0.56em шириной: точнее без замера текста не обойтись.
const textWidthRatio = 0.56
const ascentRatio = 0.78
const descentRatio = 0.22
const defaultGap = 8
const defaultLineGap = 6

/**
 * Грубая оценка ширины подписи в пользовательских единицах SVG.
 */
export function estimateHintWidth(text: string, fontSize: number) {
  return text.length * fontSize * textWidthRatio
}

/**
 * Сдвигает подсказку так, чтобы она осталась в области графика.
 */
export function fitHintInArea(input: FitHintInput): ChartHintPlacement {
  const { text, anchor, fontSize, area } = input
  const width = estimateHintWidth(text, fontSize)
  const ascent = fontSize * ascentRatio
  const descent = fontSize * descentRatio

  let x = input.x

  if (anchor === 'start') {
    x = clamp(x, area.left, Math.max(area.left, area.right - width))
  } else if (anchor === 'end') {
    x = clamp(x, Math.min(area.right, area.left + width), area.right)
  } else {
    x = clamp(x, area.left + width / 2, Math.max(area.left + width / 2, area.right - width / 2))
  }

  return {
    anchor,
    x,
    y: clamp(input.y, area.top + ascent, Math.max(area.top + ascent, area.bottom - descent)),
  }
}

/**
 * Ставит подсказку значения рядом с точкой: справа, если есть место, иначе слева;
 * над точкой, если есть место, иначе под ней.
 */
export function placePointHint(input: PlacePointHintInput): ChartHintPlacement {
  const { text, pointX, pointY, fontSize, area } = input
  const gap = input.gap ?? defaultGap
  const lineGap = input.lineGap ?? defaultLineGap
  const width = estimateHintWidth(text, fontSize)
  const fitsRight = pointX + gap + width <= area.right
  const fitsLeft = pointX - gap - width >= area.left
  const anchor: ChartHintAnchor = fitsRight || !fitsLeft ? 'start' : 'end'
  const preferredX = anchor === 'start' ? pointX + gap : pointX - gap
  const baselineAbove = pointY - lineGap
  const fitsAbove = baselineAbove - fontSize * ascentRatio >= area.top

  return fitHintInArea({
    text,
    x: preferredX,
    y: fitsAbove ? baselineAbove : pointY + fontSize + lineGap,
    anchor,
    fontSize,
    area,
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
