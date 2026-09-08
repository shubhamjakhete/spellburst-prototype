import { useState } from 'react'
import ChangePlan, { type Decision } from '../components/ChangePlan'
import { ApiError, planModification, type Plan } from '../lib/api'
import { BASE_SKETCHES } from '../eval/sketches'

const SKETCH = BASE_SKETCHES[0]
const REQUEST = 'make it more dramatic'

/**
 * The point of this check is the object, not the pixels. Edit the plan by
 * hand, press apply, and read what would have gone to the model.
 */
export default function CheckpointCheck() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<Decision | null>(null)

  async function fetchPlan() {
    setLoading(true)
    setFailure(null)
    setPlan(null)
    setSent(null)
    try {
      setPlan(await planModification(SKETCH.code, REQUEST))
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? `${error.status}: ${error.message}`
          : String(error),
      )
    } finally {
      setLoading(false)
    }
  }

  const dropped = plan
    ? [...plan.change, ...plan.preserve].filter(
        (item) =>
          sent !== null &&
          ![...sent.approvedChanges, ...sent.preserved].some(
            (kept) => kept.property === item.property,
          ),
      )
    : []

  return (
    <div className="panel">
      <h2>M5 · the checkpoint</h2>
      <p className="aside" style={{ marginTop: 0 }}>
        Fetch a real plan for “{REQUEST}” against {SKETCH.title}. Untick two
        items, move one across with Keep, type an instruction, then apply. The
        payload below is exactly what would be sent to the model.
      </p>

      <div className="row">
        <button className="btn" disabled={loading} onClick={() => void fetchPlan()}>
          {loading ? 'working out what you mean…' : 'fetch a plan'}
        </button>
      </div>

      {failure && (
        <div className="failure" style={{ marginTop: 16 }}>
          <pre>{failure}</pre>
        </div>
      )}

      {plan && (
        <div style={{ marginTop: 18 }}>
          <ChangePlan
            request={REQUEST}
            plan={plan}
            onCancel={() => setSent(null)}
            onApply={setSent}
          />
        </div>
      )}

      {sent && (
        <>
          <h3 style={{ fontSize: 13, margin: '22px 0 8px' }}>
            what would be sent to /api/apply
          </h3>
          <pre className="code" data-testid="payload">
            {JSON.stringify(sent, null, 2)}
          </pre>
          <p className="aside">
            {dropped.length === 0
              ? 'Nothing was dropped: every item from the plan is still in one of the two lists.'
              : `Dropped entirely, so the model is never told about them: ${dropped
                  .map((item) => item.property)
                  .join(', ')}.`}
          </p>
        </>
      )}
    </div>
  )
}
