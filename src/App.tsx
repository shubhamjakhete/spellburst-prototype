import { useState } from 'react'
import ChangePlan from './components/ChangePlan'
import ErrorPanel from './components/ErrorPanel'
import PromptInput from './components/PromptInput'
import RefinementInput from './components/RefinementInput'
import SketchPreview from './components/SketchPreview'
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
  const [prompt, setPrompt] = useState('')
  const [refinement, setRefinement] = useState('')

  const [current, setCurrent] = useState<Version | null>(null)
  const [request, setRequest] = useState<string | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [applied, setApplied] = useState<ApprovedPlan | null>(null)

  const [busy, setBusy] = useState<Busy>(null)
  const [failure, setFailure] = useState<Failure | null>(null)

  const dev = new URLSearchParams(window.location.search).get('dev') === '1'

  const step = plan ? 2 : applied ? 3 : current ? 1 : 0

  async function generate() {
    setBusy('generating')
    setFailure(null)
    setPlan(null)
    setApplied(null)
    setRequest(null)
    setCurrent(null)
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
    setBusy('applying')
    setFailure(null)
    try {
      const code = await applyModification(current.code, request, approved)
      setCurrent(await versionOf(code))
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

  const stageStatus = busy === 'generating'
    ? 'writing the sketch…'
    : busy === 'applying'
      ? 'applying your approved changes…'
      : !current
        ? 'nothing here yet'
        : applied
          ? 'changed'
          : plan
            ? 'unchanged so far'
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

          {current && (
            <div className="panel" style={{ marginTop: 16 }}>
              <h2>The code</h2>
              <pre className="code">{current.code}</pre>
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

              {applied && (
                <div className="panel">
                  <h2>Applied</h2>
                  <p className="aside" style={{ marginTop: 0 }}>
                    {applied.approvedChanges.length} approved{' '}
                    {applied.approvedChanges.length === 1 ? 'change' : 'changes'}{' '}
                    made. {applied.preserved.length} things were asked to stay
                    as they were.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
