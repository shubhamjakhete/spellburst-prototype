import type { PlanItem } from '../lib/api'
import { BASE_SKETCHES } from './sketches'

export type PreservedKind = 'movement' | 'colour'

export type EvalCase = {
  id: number
  sketchId: string
  request: string
  property: PreservedKind
}

/**
 * The twelve cases from EVAL.md, written down before any run.
 * Thresholds live in verify.ts and are not changed against these results.
 */
export const EVAL_CASES: EvalCase[] = [
  { id: 1, sketchId: 'night-sky', request: 'make it more dramatic', property: 'movement' },
  { id: 2, sketchId: 'night-sky', request: 'make it feel colder', property: 'colour' },
  { id: 3, sketchId: 'drifting-particles', request: 'make it more chaotic', property: 'movement' },
  { id: 4, sketchId: 'drifting-particles', request: 'make it warmer', property: 'colour' },
  { id: 5, sketchId: 'pulsing-circle', request: 'make it calmer', property: 'movement' },
  { id: 6, sketchId: 'pulsing-circle', request: 'make it feel futuristic', property: 'colour' },
  { id: 7, sketchId: 'rotating-grid', request: 'make it more alive', property: 'movement' },
  { id: 8, sketchId: 'rotating-grid', request: 'make it more mysterious', property: 'colour' },
  { id: 9, sketchId: 'wave-line', request: 'make it more energetic', property: 'movement' },
  { id: 10, sketchId: 'wave-line', request: 'make it softer', property: 'colour' },
  { id: 11, sketchId: 'scattered-dots', request: 'make it more intense', property: 'movement' },
  { id: 12, sketchId: 'scattered-dots', request: 'make it feel organic', property: 'colour' },
]

export const PLAN_REQUESTS = [
  'make it more dramatic',
  'make it calmer',
  'make it feel futuristic',
  'make it more chaotic',
  'make it warmer',
  'make it more alive',
  'make it more mysterious',
] as const

export const REPETITIONS = 5

export function sketchFor(id: string) {
  const sketch = BASE_SKETCHES.find((item) => item.id === id)
  if (!sketch) throw new Error(`unknown sketch ${id}`)
  return sketch
}

/** The sentence that goes on the keep list in the asked condition. */
export function preserveItem(kind: PreservedKind): PlanItem {
  if (kind === 'movement') {
    return {
      property: 'movement',
      description: 'Leave the speed, motion and animation exactly as they are.',
    }
  }
  return {
    property: 'colour palette',
    description: 'Leave the colours and palette exactly as they are.',
  }
}

/** The one approved change: do the request. Nothing else is named. */
export function changeItem(request: string): PlanItem {
  return {
    property: request,
    description: `Apply this request: ${request}.`,
  }
}
