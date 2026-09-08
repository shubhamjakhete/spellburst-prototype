import { useState } from 'react'
import { ApiError, applyModification, type PlanItem } from '../lib/api'
import { readSketch, type Reading } from '../lib/measure'
import { verify, type Call, type Verdict } from '../lib/verify'
import VerifyBadge from '../components/VerifyBadge'
import { BASE_SKETCHES } from '../eval/sketches'

// Clear of the still threshold, so the comparison is not noise, but not so
// fast that the two captured frames are already unrelated to each other. A
// sketch in the lively band has no headroom left: rotating-grid measured
// 0.172 both before and after being told to move much faster.
const SKETCH = BASE_SKETCHES.find((s) => s.id === 'drifting-particles')!

const HOLD_MOVEMENT: PlanItem = {
  property: 'drift speed',
  description: 'The particles should keep drifting at the speed they do now.',
}

const HOLD_SHAPE: PlanItem = {
  property: 'particle count',
  description: 'Same number of particles on screen.',
}

type Case = {
  id: string
  request: string
  change: PlanItem
  expect: Call
  why: string
}

const CASES: Case[] = [
  {
    id: 'kept',
    request: 'give it a warmer colour',
    change: {
      property: 'colour',
      description: 'Recolour the particles in warm reds and oranges.',
    },
    expect: 'kept',
    why: 'Recolouring has no reason to touch the drift.',
  },
  {
    id: 'changed',
    request: 'make it chaotic',
    change: {
      property: 'chaos',
      description:
        'Make the movement erratic and unpredictable rather than steady.',
    },
    expect: 'changed',
    why:
      'Asked outright to move faster the model refuses and returns the ' +
      'program unaltered. Chaos is the harder case: it leaves the drift ' +
      'speed alone and adds jitter on top, so the promise holds word for ' +
      'word while the artwork plainly moves more.',
  },
]

type Result = {
  id: string
  verdicts?: Verdict[]
  before?: Reading
  after?: Reading
  failure?: string
}

async function runCase(item: Case, before: Reading): Promise<Result> {
  try {
    const code = await applyModification(SKETCH.code, item.request, {
      approvedChanges: [item.change],
      preserved: [HOLD_MOVEMENT, HOLD_SHAPE],
      extraInstruction: '',
    })
    const after = await readSketch(code)
    return {
      id: item.id,
      before,
      after,
      verdicts: verify([HOLD_MOVEMENT, HOLD_SHAPE], before, after),
    }
  } catch (error) {
    return {
      id: item.id,
      failure:
        error instanceof ApiError
          ? `${error.status}: ${error.message}`
          : String(error),
    }
  }
}

export default function VerifyCheck() {
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    setResults([])
    const before = await readSketch(SKETCH.code)
    const collected: Result[] = []
    for (const item of CASES) {
      collected.push(await runCase(item, before))
      setResults([...collected])
    }
    setRunning(false)
  }

  return (
    <div className="panel">
      <h2>M7 · verification</h2>
      <p className="aside" style={{ marginTop: 0 }}>
        Two applies against {SKETCH.title}, both holding the drift speed. One
        has no reason to touch it, the other pulls hard against it. If the
        second does not say <em>changed anyway</em>, the checker is not
        checking anything.
      </p>

      <div className="row">
        <button className="btn" disabled={running} onClick={() => void run()}>
          {running
            ? 'applying your approved changes…'
            : 'force it both ways'}
        </button>
      </div>

      {CASES.map((item) => {
        const result = results.find((r) => r.id === item.id)
        const motion = result?.verdicts?.find((v) => v.kind === 'motion')
        const passed = motion?.call === item.expect

        return (
          <div key={item.id} style={{ marginTop: 22 }}>
            <h3 style={{ fontSize: 14 }}>“{item.request}”</h3>
            <p className="aside" style={{ marginTop: 4 }}>
              {item.why} Expecting <strong>{item.expect}</strong>.
            </p>

            {result?.failure && (
              <div className="failure" style={{ marginTop: 8 }}>
                <pre>{result.failure}</pre>
              </div>
            )}

            {result?.verdicts && (
              <>
                <div className="verdicts">
                  {result.verdicts.map((verdict) => (
                    <VerifyBadge key={verdict.property} verdict={verdict} />
                  ))}
                </div>
                <div className={`check ${passed ? 'pass' : 'fail'}`}>
                  <span className="name">movement verdict</span>
                  <span className="num">
                    {motion?.call} · {motion?.detail}
                  </span>
                  <span className="call">{passed ? 'pass' : 'FAIL'}</span>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
