/**
 * The three-part eval described in the README.
 *
 * Runs in the browser: measurement needs a canvas. A Playwright script
 * drives it and writes src/eval/results.json after every trial so a crash
 * at call 90 does not cost the whole run.
 */

import { applyModification, planModification } from '../lib/api'

async function retry<T>(label: string, work: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      return await work()
    } catch (error) {
      last = error
      if (i === attempts) break
      await new Promise((r) => setTimeout(r, 1500 * i))
    }
  }
  throw last instanceof Error ? last : new Error(`${label} failed`)
}
import { readSketch, type Reading } from '../lib/measure'
import { verify, type Call } from '../lib/verify'
import {
  EVAL_CASES,
  PLAN_REQUESTS,
  changeItem,
  preserveItem,
  sketchFor,
  type EvalCase,
  type PreservedKind,
} from './cases'
import {
  BASE_SKETCHES,
  classifyMotion,
  type MotionClass,
} from './sketches'

export type Condition = 'asked' | 'not-asked'

export type TrialResult = {
  caseId: number
  condition: Condition
  rep: number
  property: PreservedKind
  call: Call
  detail: string
  because: string
  error?: string
}

export type PlanRecord = {
  sketchId: string
  request: string
  change: string[]
  error?: string
}

export type SanityRow = {
  sketchId: string
  title: string
  motionExpected: MotionClass
  motionMeasured: number
  motionClass: MotionClass
  motionPass: boolean
  colourExpected: string
  colourMeasured: string
  colourPass: boolean
}

export type EvalResults = {
  started: string
  finished: string
  model: string
  applyCalls: number
  planCalls: number
  part1: TrialResult[]
  part2: PlanRecord[]
  part3: SanityRow[]
}

function callOf(
  kind: PreservedKind,
  before: Reading,
  after: Reading,
): { call: Call; detail: string; because: string } {
  const [verdict] = verify([preserveItem(kind)], before, after)
  return {
    call: verdict.call,
    detail: verdict.detail,
    because: verdict.because,
  }
}

export async function runPreservationTrial(
  item: EvalCase,
  condition: Condition,
  rep: number,
  before: Reading,
): Promise<TrialResult> {
  const sketch = sketchFor(item.sketchId)
  const base: TrialResult = {
    caseId: item.id,
    condition,
    rep,
    property: item.property,
    call: 'unchecked',
    detail: '',
    because: '',
  }

  try {
    const code = await retry('apply', () =>
      applyModification(sketch.code, item.request, {
        approvedChanges: [changeItem(item.request)],
        preserved: condition === 'asked' ? [preserveItem(item.property)] : [],
        extraInstruction: '',
      }),
    )
    const after = await readSketch(code)
    return { ...base, ...callOf(item.property, before, after) }
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : String(error),
      because: 'the apply or the sketch failed',
    }
  }
}

export async function runPlanRecord(
  sketchId: string,
  request: string,
): Promise<PlanRecord> {
  const sketch = sketchFor(sketchId)
  try {
    const plan = await retry('plan', () => planModification(sketch.code, request))
    return {
      sketchId,
      request,
      change: plan.change.map((item) => item.property.toLowerCase()),
    }
  } catch (error) {
    return {
      sketchId,
      request,
      change: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function runSanity(): Promise<SanityRow[]> {
  const rows: SanityRow[] = []
  for (const sketch of BASE_SKETCHES) {
    const reading = await readSketch(sketch.code)
    const motionClass = classifyMotion(reading.motion)
    rows.push({
      sketchId: sketch.id,
      title: sketch.title,
      motionExpected: sketch.expectedMotion,
      motionMeasured: reading.motion,
      motionClass,
      motionPass: motionClass === sketch.expectedMotion,
      colourExpected: sketch.expectedPalette,
      colourMeasured: reading.palette,
      colourPass: reading.palette === sketch.expectedPalette,
    })
  }
  return rows
}

export async function measureBases(): Promise<Record<string, Reading>> {
  const out: Record<string, Reading> = {}
  for (const sketch of BASE_SKETCHES) {
    out[sketch.id] = await readSketch(sketch.code)
  }
  return out
}

export function jaccard(left: string[], right: string[]): number {
  const a = new Set(left)
  const b = new Set(right)
  const union = new Set([...a, ...b])
  if (union.size === 0) return 0
  let shared = 0
  for (const name of a) if (b.has(name)) shared += 1
  return shared / union.size
}

/** Mean pairwise Jaccard of change-property lists for one sketch. */
export function meanOverlap(records: PlanRecord[]): number {
  let total = 0
  let pairs = 0
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      total += jaccard(records[i].change, records[j].change)
      pairs += 1
    }
  }
  return pairs === 0 ? 0 : total / pairs
}

/**
 * Whether calmer and more chaotic named different changes.
 * Sharing most of the same properties means the plan ignored the request.
 */
export function oppositeConflict(records: PlanRecord[]): 'yes' | 'no' | 'n/a' {
  const calmer = records.find((r) => r.request.includes('calmer'))
  const chaotic = records.find((r) => r.request.includes('chaotic'))
  if (!calmer || !chaotic || calmer.error || chaotic.error) return 'n/a'
  return jaccard(calmer.change, chaotic.change) === 0 ? 'yes' : 'no'
}

export { EVAL_CASES, PLAN_REQUESTS, BASE_SKETCHES }
