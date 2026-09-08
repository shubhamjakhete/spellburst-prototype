/**
 * Motion and palette, measured with arithmetic and no model.
 *
 * Both measures are coarse on purpose. They exist to catch "the sky got much
 * brighter" or "the stars sped up", not to adjudicate teal against cyan.
 */

import { runSketch } from './sketch'

/** Frames are reduced to this before anything is counted. */
const SAMPLE_SIZE = 64

/** A pixel whose brightest channel is at or below this counts as background. */
const NEAR_BLACK = 24

/** Below this saturation a pixel has no useful hue and is called a neutral. */
const MIN_SATURATION = 0.15

/** A neutral at or above this brightness is white rather than grey. */
const WHITE_VALUE = 200

export type ColourName =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'white'
  | 'grey'
  | 'black'

export class MeasureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MeasureError'
  }
}

const HUE_BUCKETS: ReadonlyArray<{ below: number; name: ColourName }> = [
  { below: 15, name: 'red' },
  { below: 45, name: 'orange' },
  { below: 70, name: 'yellow' },
  { below: 165, name: 'green' },
  { below: 195, name: 'cyan' },
  { below: 255, name: 'blue' },
  { below: 290, name: 'purple' },
  { below: 345, name: 'pink' },
  { below: 360, name: 'red' },
]

async function samplePixels(frame: string): Promise<Uint8ClampedArray> {
  const image = new Image()
  image.src = frame

  try {
    await image.decode()
  } catch {
    throw new MeasureError('the frame could not be decoded')
  }

  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new MeasureError('no 2d canvas context available')

  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  return context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
}

/**
 * Mean absolute RGB difference between two frames, scaled to 0..1.
 * Identical frames give 0; black against white gives 1.
 */
export async function measureMotion(a: string, b: string): Promise<number> {
  const [first, second] = await Promise.all([samplePixels(a), samplePixels(b)])

  if (first.length !== second.length) {
    throw new MeasureError('the two frames sampled to different sizes')
  }

  let total = 0
  for (let i = 0; i < first.length; i += 4) {
    total +=
      Math.abs(first[i] - second[i]) +
      Math.abs(first[i + 1] - second[i + 1]) +
      Math.abs(first[i + 2] - second[i + 2])
  }

  return total / (SAMPLE_SIZE * SAMPLE_SIZE * 3 * 255)
}

function bucketOf(red: number, green: number, blue: number): ColourName {
  const high = Math.max(red, green, blue)
  const low = Math.min(red, green, blue)
  const saturation = high === 0 ? 0 : (high - low) / high

  if (saturation < MIN_SATURATION) {
    return high >= WHITE_VALUE ? 'white' : 'grey'
  }

  const span = high - low
  let sixth: number
  if (high === red) sixth = ((green - blue) / span) % 6
  else if (high === green) sixth = (blue - red) / span + 2
  else sixth = (red - green) / span + 4

  const hue = (sixth * 60 + 360) % 360
  for (const bucket of HUE_BUCKETS) {
    if (hue < bucket.below) return bucket.name
  }
  return 'red'
}

/**
 * The most common colour bucket in a frame, ignoring near-black background.
 * Returns 'black' when there is nothing but background to look at.
 */
export async function measurePalette(frame: string): Promise<ColourName> {
  const pixels = await samplePixels(frame)
  const counts = new Map<ColourName, number>()

  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i]
    const green = pixels[i + 1]
    const blue = pixels[i + 2]

    if (Math.max(red, green, blue) <= NEAR_BLACK) continue

    const name = bucketOf(red, green, blue)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  if (counts.size === 0) return 'black'

  // Sorted by name as well as count so a tie always resolves the same way.
  return [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0][0]
}

/** Everything known about one version of a sketch, from one run of it. */
export type Reading = {
  frameA: string
  frameB: string
  motion: number
  palette: ColourName
}

/**
 * Run a sketch once and take both measurements from that single run, so a
 * before and after comparison is never made across two different runs of the
 * same code.
 */
export async function readSketch(code: string): Promise<Reading> {
  const { frameA, frameB } = await runSketch(code)
  const [motion, palette] = await Promise.all([
    measureMotion(frameA, frameB),
    measurePalette(frameA),
  ])
  return { frameA, frameB, motion, palette }
}
