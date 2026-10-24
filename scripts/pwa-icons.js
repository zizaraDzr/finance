import { deflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const COLORS = {
  backgroundTop: [36, 21, 54],
  backgroundBottom: [16, 11, 26],
  glow: [124, 92, 255],
  coinTop: [178, 152, 255],
  coinBottom: [112, 74, 240],
  bars: [22, 15, 35],
}

const ICON_RADIUS = 0.322
const BAR_WIDTH = 0.066
const BAR_GAP = 0.051
const BARS_BASELINE = 0.647
const BAR_HEIGHTS = [0.137, 0.215, 0.293]

const CRC_TABLE = new Uint32Array(256)

for (let index = 0; index < 256; index += 1) {
  let value = index

  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  CRC_TABLE[index] = value >>> 0
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mix(from, to, amount) {
  return from + (to - from) * amount
}

function crc32(buffer) {
  let crc = 0xffffffff

  for (let index = 0; index < buffer.length; index += 1) {
    crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'latin1')
  const lengthBuffer = Buffer.alloc(4)
  const checksumBuffer = Buffer.alloc(4)

  lengthBuffer.writeUInt32BE(data.length, 0)
  checksumBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)

  return Buffer.concat([lengthBuffer, typeBuffer, data, checksumBuffer])
}

function encodePng(size, rgba) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)

  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }

  const header = Buffer.alloc(13)

  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function roundedRectDistance(px, py, x0, y0, x1, y1, radius) {
  const halfWidth = (x1 - x0) / 2
  const halfHeight = (y1 - y0) / 2
  const qx = Math.abs(px - (x0 + halfWidth)) - (halfWidth - radius)
  const qy = Math.abs(py - (y0 + halfHeight)) - (halfHeight - radius)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))

  return outside + Math.min(Math.max(qx, qy), 0) - radius
}

function renderIcon(size, contentScale = 1) {
  const pixels = new Uint8Array(size * size * 4)
  const center = size / 2
  const scale = size * contentScale
  const radius = ICON_RADIUS * scale
  const barWidth = BAR_WIDTH * scale
  const barGap = BAR_GAP * scale
  const baseline = center + (BARS_BASELINE - 0.5) * scale
  const groupWidth = barWidth * 3 + barGap * 2
  const left = center - groupWidth / 2
  const bars = BAR_HEIGHTS.map((height, index) => {
    const x0 = left + index * (barWidth + barGap)

    return {
      x0,
      x1: x0 + barWidth,
      y0: baseline - height * scale,
      y1: baseline,
    }
  })

  for (let y = 0; y < size; y += 1) {
    const vertical = y / (size - 1)

    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4

      let red = mix(COLORS.backgroundTop[0], COLORS.backgroundBottom[0], vertical)
      let green = mix(COLORS.backgroundTop[1], COLORS.backgroundBottom[1], vertical)
      let blue = mix(COLORS.backgroundTop[2], COLORS.backgroundBottom[2], vertical)

      const glowDistance = Math.hypot(x - size * 0.3, y - size * 0.22) / (size * 0.95)
      const glow = Math.max(0, 1 - glowDistance) ** 2 * 0.35

      red = mix(red, COLORS.glow[0], glow)
      green = mix(green, COLORS.glow[1], glow)
      blue = mix(blue, COLORS.glow[2], glow)

      const distance = Math.hypot(x + 0.5 - center, y + 0.5 - center) - radius
      const coverage = clamp(0.5 - distance, 0, 1)

      if (coverage > 0) {
        const gradient = clamp(
          (x - (center - radius) + (y - (center - radius))) / (4 * radius),
          0,
          1,
        )

        red = mix(red, mix(COLORS.coinTop[0], COLORS.coinBottom[0], gradient), coverage)
        green = mix(green, mix(COLORS.coinTop[1], COLORS.coinBottom[1], gradient), coverage)
        blue = mix(blue, mix(COLORS.coinTop[2], COLORS.coinBottom[2], gradient), coverage)

        let barCoverage = 0

        for (const bar of bars) {
          const barDistance = roundedRectDistance(
            x + 0.5,
            y + 0.5,
            bar.x0,
            bar.y0,
            bar.x1,
            bar.y1,
            barWidth / 2,
          )

          barCoverage = Math.max(barCoverage, clamp(0.5 - barDistance, 0, 1))
        }

        if (barCoverage > 0) {
          red = mix(red, COLORS.bars[0], barCoverage)
          green = mix(green, COLORS.bars[1], barCoverage)
          blue = mix(blue, COLORS.bars[2], barCoverage)
        }
      }

      pixels[index] = Math.round(red)
      pixels[index + 1] = Math.round(green)
      pixels[index + 2] = Math.round(blue)
      pixels[index + 3] = 255
    }
  }

  return pixels
}

function encodeIcoBitmap(size, rgba) {
  const rowSize = Math.ceil(size / 32) * 4
  const imageSize = size * size * 4 + rowSize * size
  const header = Buffer.alloc(40)
  const bitmap = Buffer.alloc(size * size * 4)

  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8)
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  header.writeUInt32LE(imageSize, 20)

  for (let y = 0; y < size; y += 1) {
    const sourceRow = y * size * 4
    const targetRow = (size - 1 - y) * size * 4

    for (let x = 0; x < size; x += 1) {
      const source = sourceRow + x * 4
      const target = targetRow + x * 4

      bitmap[target] = rgba[source + 2]
      bitmap[target + 1] = rgba[source + 1]
      bitmap[target + 2] = rgba[source]
      bitmap[target + 3] = rgba[source + 3]
    }
  }

  return Buffer.concat([header, bitmap, Buffer.alloc(rowSize * size)])
}

function buildIco(images) {
  const header = Buffer.alloc(6)
  const entries = []
  let offset = 6 + images.length * 16

  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  for (const image of images) {
    const entry = Buffer.alloc(16)

    entry[0] = image.size >= 256 ? 0 : image.size
    entry[1] = image.size >= 256 ? 0 : image.size
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(image.data.length, 8)
    entry.writeUInt32LE(offset, 12)

    entries.push(entry)
    offset += image.data.length
  }

  return Buffer.concat([header, ...entries, ...images.map(image => image.data)])
}

function writeIfChanged(filePath, data) {
  try {
    if (readFileSync(filePath).equals(data)) {
      return
    }
  } catch {
    // The icon is generated for the first time.
  }

  writeFileSync(filePath, data)
}

export function ensurePwaIcons(root = process.cwd()) {
  const publicDir = join(root, 'public')

  mkdirSync(publicDir, { recursive: true })

  writeIfChanged(join(publicDir, 'pwa-192x192.png'), encodePng(192, renderIcon(192)))
  writeIfChanged(join(publicDir, 'pwa-512x512.png'), encodePng(512, renderIcon(512)))
  writeIfChanged(
    join(publicDir, 'pwa-maskable-512x512.png'),
    encodePng(512, renderIcon(512, 0.9)),
  )
  writeIfChanged(join(publicDir, 'apple-touch-icon.png'), encodePng(180, renderIcon(180)))
  writeIfChanged(
    join(publicDir, 'favicon.ico'),
    buildIco(
      [16, 32, 48].map(size => ({
        size,
        data: encodeIcoBitmap(size, renderIcon(size)),
      })),
    ),
  )
}
