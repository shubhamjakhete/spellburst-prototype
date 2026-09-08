/**
 * Whether the preserved properties actually held.
 *
 * Only two of them can be checked without a model: movement and colour.
 * Everything else is reported as unchecked, which is the whole point. Ticking
 * a box asks the model to leave something alone; it does not make it so, and
 * saying "not checked" is more useful than implying otherwise.
 */

import type { PlanItem } from './api'
import { STILL_MOTION, type Reading } from './measure'

const MOVEMENT_WORDS =
  /\b(move|moves|movement|moving|motion|speed|fast|slow|pace|anima\w*|drift\w*|travel\w*|velocity|flow\w*|rotation|rotating|spin\w*|pulse|pulsing|twinkl\w*|orbit\w*)\b/i

const COLOUR_WORDS =
  /\b(colour\w*|color\w*|palette|hue|tone|tint|shade|saturation|red|orange|yellow|green|cyan|blue|purple|violet|pink|magenta|teal|amber|gold|silver|warm|cool|monochrome)\b/i

export function mentionsMovement(text: string): boolean {
  return MOVEMENT_WORDS.test(text)
}

export function mentionsColour(text: string): boolean {
  return COLOUR_WORDS.test(text)
}

/** What, if anything, we could measure about an item either side of a change. */
export type Measurable = 'motion' | 'colour' | null

export function measurableAs(item: {
  property: string
  description: string
}): Measurable {
  // The property name is the decision. "particle count" is not a motion
  // promise just because its description happens to say "drifting bits".
  if (mentionsMovement(item.property)) return 'motion'
  if (mentionsColour(item.property)) return 'colour'

  // Fall back to the words CLAUDE.md named, not the wider scene-verb list.
  // Those verbs ("drifting", "pulsing") name what the artwork is, not what
  // is being held.
  if (/\b(movement|motion|speed|animation|animat\w*)\b/i.test(item.description)) {
    return 'motion'
  }
  if (/\b(colour\w*|color\w*|palette)\b/i.test(item.description)) {
    return 'colour'
  }
  return null
}

/** How far motion may drift before the promise counts as broken. */
const DRIFT = 0.25

/** Keeps the division safe on a frame with almost nothing in it. */
const MIN_CONTRAST = 0.01

/**
 * Motion, divided out by how much contrast the frame has.
 *
 * Without this, changing a sketch's colours changes its motion reading. A
 * recolour of the drifting particles that touched nothing but two colour
 * literals moved the raw reading from 0.026 to 0.018, and would have been
 * reported as the drift speed changing when the drift speed is identical.
 */
function relativeMotion(reading: Reading): number {
  return reading.motion / Math.max(reading.contrast, MIN_CONTRAST)
}

export type Call = 'kept' | 'changed' | 'unchecked'

export type Verdict = {
  property: string
  kind: Measurable
  call: Call
  /** The two readings, when there are two readings worth showing. */
  detail: string
  /** Why nothing could be said. Only set when the call is unchecked. */
  because: string
}

/** The proportional shift in movement, or null when there is none to measure. */
function motionShift(before: Reading, after: Reading): number | null {
  // Comparing two numbers that are both indistinguishable from zero produces
  // enormous relative changes out of nothing. A sketch that does not move
  // cannot have its movement checked, however emphatically it was preserved.
  if (Math.max(before.motion, after.motion) < STILL_MOTION) return null

  const from = relativeMotion(before)
  const to = relativeMotion(after)
  return (to - from) / Math.max(from, STILL_MOTION)
}

/** Rounded first, so a shift of a fraction of a percent does not read "−0%". */
function asPercentage(shift: number): string {
  const whole = Math.round(shift * 100)
  if (whole === 0) return 'unchanged'
  return `${whole > 0 ? '+' : '−'}${Math.abs(whole)}% movement`
}

export function verify(
  preserved: PlanItem[],
  before: Reading | null,
  after: Reading | null,
): Verdict[] {
  return preserved.map((item) => {
    const kind = measurableAs(item)
    const base = { property: item.property, kind }

    if (kind === null) {
      return {
        ...base,
        call: 'unchecked' as const,
        detail: '',
        because: 'nothing here can be read off two frames',
      }
    }

    if (!before || !after) {
      return {
        ...base,
        call: 'unchecked' as const,
        detail: '',
        because: 'one of the two sketches did not run',
      }
    }

    if (kind === 'colour') {
      return {
        ...base,
        call:
          before.palette === after.palette
            ? ('kept' as const)
            : ('changed' as const),
        detail: `${before.palette} → ${after.palette}`,
        because: '',
      }
    }

    const shift = motionShift(before, after)

    if (shift === null) {
      return {
        ...base,
        call: 'unchecked' as const,
        detail: `${before.motion.toFixed(3)} → ${after.motion.toFixed(3)}`,
        because:
          'the sketch barely moves either way, so there is nothing to compare',
      }
    }

    return {
      ...base,
      call: Math.abs(shift) < DRIFT ? ('kept' as const) : ('changed' as const),
      // A proportion rather than the two readings, because the comparison is
      // made on contrast-adjusted numbers that would not match the raw motion
      // shown under the artwork.
      detail: asPercentage(shift),
      because: '',
    }
  })
}
