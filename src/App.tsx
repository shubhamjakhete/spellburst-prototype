import { useCallback, useEffect, useRef, useState } from 'react'
import BeforeAfter from './components/BeforeAfter'
import ChangePlan from './components/ChangePlan'
import CodeEditor from './components/CodeEditor'
import ErrorPanel from './components/ErrorPanel'
import PromptInput from './components/PromptInput'
import RefinementInput from './components/RefinementInput'
import SketchPreview from './components/SketchPreview'
import VerifyBadge from './components/VerifyBadge'
import Checks from './dev/Checks'
import {
  ApiError,
  accessCode,
  applyModification,
  generateSketch,
  planModification,
  type ApprovedPlan,
  type Plan,
} from './lib/api'
import { readSketch, type Reading } from './lib/measure'
import { SketchError } from './lib/sketch'
import { verify } from './lib/verify'
import { BASE_SKETCHES } from './eval/sketches'

/**
 * The checkpoint is the point of this, and it is invisible until a sketch
 * exists. So one is already here: a fixed sketch rather than a generated one,
 * so the first screen is the same every time and costs nothing to load.
 *
 * Which one is settable, because the six differ in how much of the canvas
 * moves and so in how much a movement promise can actually be checked.
 */
function seedSketch(): (typeof BASE_SKETCHES)[number] {
  const asked = new URLSearchParams(window.location.search).get('seed')
  // Night sky is first in the list, but its movement lives in too small a
  // fraction of the frame to check. Open on one that actually moves.
  return (
    BASE_SKETCHES.find((sketch) => sketch.id === asked) ??
    BASE_SKETCHES.find((sketch) => sketch.id === 'drifting-particles') ??
    BASE_SKETCHES[0]
  )
}

const SEED = seedSketch()

const STEPS = [
  'Describe it',
  'Ask for a change',
  'Review the plan',
  'Apply',
] as const

type Version = {
  code: string
  /** Null when the sketch would not run, so nothing can be measured from it. */
  reading: Reading | null
  runFailure: string | null
}

/** Which of the three model calls is in flight, if any. */
type Busy = null | 'generating' | 'planning' | 'applying'

type Failure = { title: string; detail: string }

function describe(error: unknown): string {
  if (error instanceof ApiError) return `${error.status} · ${error.message}`
  if (error instanceof SketchError) return `${error.kind} · ${error.message}`
  return String(error)
}

/** Runs a sketch and measures it, without letting a bad sketch break the app. */
async function versionOf(code: string): Promise<Version> {
  try {
    return { code, reading: await readSketch(code), runFailure: null }
  } catch (error) {
    return { code, reading: null, runFailure: describe(error) }
  }
}

export default function App() {
  // Left empty on purpose. Prefilling it would suggest the sketch on screen
  // came from that prompt, and it did not.
  const [prompt, setPrompt] = useState('')
  const [refinement, setRefinement] = useState('')
  const [seeded, setSeeded] = useState(true)

  const [current, setCurrent] = useState<Version | null>({
    code: SEED.code,
    reading: null,
    runFailure: null,
  })
  const [previous, setPrevious] = useState<Version | null>(null)
  const [request, setRequest] = useState<string | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [applied, setApplied] = useState<ApprovedPlan | null>(null)

  const [busy, setBusy] = useState<Busy>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const editSeq = useRef(0)

  const dev = new URLSearchParams(window.location.search).get('dev') === '1'

  const commitEdit = useCallback(async (code: string) => {
    const mine = ++editSeq.current
    setPlan(null)
    setApplied(null)
    setRequest(null)
    setSeeded(false)
    const next = await versionOf(code)
    if (mine !== editSeq.current) return
    setCurrent(next)
  }, [])

  // Measuring the seed needs a browser, so it cannot be done up front.
  useEffect(() => {
    let cancelled = false
    void versionOf(SEED.code).then((version) => {
      if (!cancelled) setCurrent((now) => (now?.code === SEED.code ? version : now))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const step =
    busy === 'generating'
      ? 0
      : busy === 'planning'
        ? 1
        : busy === 'applying' || applied
          ? 3
          : plan
            ? 2
            : current
              ? 1
              : 0

  const verdicts =
    applied && previous
      ? verify(applied.preserved, previous.reading, current?.reading ?? null)
      : null

  async function generate() {
    editSeq.current += 1
    setBusy('generating')
    setFailure(null)
    setPlan(null)
    setApplied(null)
    setRequest(null)
    setCurrent(null)
    setPrevious(null)
    setSeeded(false)
    try {
      setCurrent(await versionOf(await generateSketch(prompt)))
    } catch (error) {
      setFailure({ title: 'the sketch could not be written', detail: describe(error) })
    } finally {
      setBusy(null)
    }
  }

  async function makePlan() {
    if (!current) return
    setBusy('planning')
    setFailure(null)
    setApplied(null)
    try {
      setPlan(await planModification(current.code, refinement))
      setRequest(refinement)
    } catch (error) {
      setFailure({ title: 'the request could not be read', detail: describe(error) })
    } finally {
      setBusy(null)
    }
  }

  async function apply(approved: ApprovedPlan) {
    if (!current || !request) return
    editSeq.current += 1
    setBusy('applying')
    setFailure(null)
    try {
      const code = await applyModification(current.code, request, approved)
      const next = await versionOf(code)
      setPrevious(current)
      setCurrent(next)
      setApplied(approved)
      setPlan(null)
    } catch (error) {
      setFailure({ title: 'the changes could not be applied', detail: describe(error) })
    } finally {
      setBusy(null)
    }
  }

  function startOver() {
    setPlan(null)
    setApplied(null)
    setRequest(null)
    setRefinement('')
  }

  function revert() {
    if (!previous) return
    editSeq.current += 1
    setCurrent(previous)
    setPrevious(null)
    startOver()
  }

  const stageStatus = busy === 'generating'
    ? 'writing the sketch…'
    : busy === 'planning'
      ? 'working out what you mean…'
      : busy === 'applying'
      ? 'applying your approved changes…'
        : !current
          ? 'nothing here yet'
          : applied
            ? 'changed'
            : plan
              ? 'unchanged so far'
              : seeded
                ? `${SEED.title} · an example to start from`
                : 'running'

  if (dev) {
    return (
      <div className="shell">
        <header className="masthead">
          <h1>Plan First</h1>
          <p>Module checks</p>
        </header>
        <Checks />
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Plan First</h1>
        <p>Creative coding with a review step</p>
      </header>

      <div className="steps">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={index === step ? 'now' : index < step ? 'done' : ''}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="work">
        <div>
          <SketchPreview
            code={current?.code ?? null}
            reading={current?.reading ?? null}
            status={stageStatus}
          />

          {current?.runFailure && (
            <div style={{ marginTop: 16 }}>
              <ErrorPanel
                title="the sketch did not run"
                detail={current.runFailure}
              />
            </div>
          )}

          {previous && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h2>Before and after</h2>
              <div className="stage" style={{ marginTop: 12 }}>
                <BeforeAfter
                  before={previous.reading}
                  after={current?.reading ?? null}
                />
              </div>
              <div className="row">
                <button className="btn quiet" onClick={revert}>
                  Go back to the previous version
                </button>
              </div>
            </div>
          )}

          {current && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h2>The code</h2>
              <CodeEditor
                value={current.code}
                disabled={busy !== null}
                onCommit={(code) => void commitEdit(code)}
              />
              <p className="aside">
                Edits re-run after a pause. A broken edit shows an error rather
                than crashing.
              </p>
            </div>
          )}
        </div>

        <div>
          {!accessCode() && (
            <div className="panel">
              <ErrorPanel
                title="no access code"
                detail={
                  'Add ?k=… to the address. Without it the model functions ' +
                  'refuse every request.'
                }
              />
            </div>
          )}

          {failure && (
            <div className="panel">
              <ErrorPanel title={failure.title} detail={failure.detail} />
            </div>
          )}

          {plan && request ? (
            <ChangePlan
              request={request}
              plan={plan}
              busy={busy === 'applying'}
              onCancel={startOver}
              onApply={(approved) => void apply(approved)}
            />
          ) : applied && verdicts ? (
            <div className="panel">
              <h2>What held</h2>
              <p className="aside" style={{ margin: '0 0 4px' }}>
                {applied.approvedChanges.length} approved{' '}
                {applied.approvedChanges.length === 1
                  ? 'change was'
                  : 'changes were'}{' '}
                made. These are the things you asked to leave alone.
              </p>

              <div className="verdicts">
                {verdicts.map((verdict) => (
                  <VerifyBadge key={verdict.property} verdict={verdict} />
                ))}
              </div>

              <p className="aside">
                Ticking a box asks the model to leave something alone. It
                does not force it. Movement and colour can be measured
                either side of the change, so those two are checked. The
                rest are not, and saying so is more useful than implying
                they were.
              </p>

              <div className="row">
                <button className="btn" onClick={startOver}>
                  Change something else
                </button>
              </div>
            </div>
          ) : (
            <>
              <PromptInput
                value={prompt}
                busy={busy !== null}
                onChange={setPrompt}
                onSubmit={() => void generate()}
              />

              {current && (
                <RefinementInput
                  value={refinement}
                  busy={busy !== null}
                  onChange={setRefinement}
                  onSubmit={() => void makePlan()}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
