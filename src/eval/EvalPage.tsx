import { accessCode } from '../lib/api'
import {
  EVAL_CASES,
  meanOverlap,
  oppositeConflict,
  type EvalResults,
  type TrialResult,
} from './run'
import committed from './results.json' with { type: 'json' }

const REPS = 5

function count(trials: TrialResult[], caseId: number, condition: TrialResult['condition']) {
  const rows = trials.filter((t) => t.caseId === caseId && t.condition === condition)
  const drifted = rows.filter((t) => t.call === 'changed').length
  const checked = rows.filter((t) => t.call !== 'unchecked' && !t.error).length
  return { drifted, checked, n: rows.length }
}

function Part1Table({ results }: { results: EvalResults }) {
  const rows = EVAL_CASES.map((item) => {
    const notAsked = count(results.part1, item.id, 'not-asked')
    const asked = count(results.part1, item.id, 'asked')
    return {
      id: item.id,
      property: item.property,
      notAsked,
      asked,
      gap: notAsked.drifted - asked.drifted,
    }
  })

  const overallNot = rows.reduce((n, r) => n + r.notAsked.drifted, 0)
  const overallAsked = rows.reduce((n, r) => n + r.asked.drifted, 0)

  return (
    <>
      <div>
        {rows.map((row) => (
          <div key={row.id} className="check">
            <span className="name">
              {row.id}. {row.property}
            </span>
            <span className="num">
              not asked {row.notAsked.drifted}/{REPS} · asked {row.asked.drifted}/
              {REPS} · gap {row.gap > 0 ? '+' : ''}
              {row.gap}
            </span>
          </div>
        ))}
      </div>
      <p className="aside">
        <strong>
          Drift without asking {overallNot} / 60 · when asked {overallAsked} / 60
        </strong>
        . Gap {overallNot - overallAsked} of 60. Unchecked trials are not
        counted as drift.
      </p>
    </>
  )
}

export default function EvalPage() {
  const results = committed as EvalResults
  const ran = results.part1.length > 0
  const gated = Boolean(accessCode())

  const sketches = [...new Set(results.part2.map((r) => r.sketchId))]

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Plan First</h1>
        <p>Eval results</p>
      </header>

      <div className="panel">
        <h2>Committed numbers</h2>
        <p className="aside" style={{ marginTop: 0 }}>
          {ran
            ? `Run ${results.started.slice(0, 10) || 'undated'} · ${results.model} · ${results.applyCalls} apply calls, ${results.planCalls} plan calls.`
            : 'No run has been committed yet.'}{' '}
          Visitors see these numbers. They do not pay for them.
        </p>
        {gated && (
          <p className="aside">
            Re-runs are a local script, not a button on this page. The public
            link must not fire 120 apply calls.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Part 1 · preservation</h2>
        {ran ? (
          <Part1Table results={results} />
        ) : (
          <p className="aside">Waiting on a run.</p>
        )}
      </div>

      <div className="panel">
        <h2>Part 2 · do the plans discriminate?</h2>
        {results.part2.length === 0 ? (
          <p className="aside">Waiting on a run.</p>
        ) : (
          <div>
            {sketches.map((id) => {
              const rows = results.part2.filter((r) => r.sketchId === id)
              return (
                <div key={id} className="check">
                  <span className="name">{id}</span>
                  <span className="num">
                    overlap {meanOverlap(rows).toFixed(2)} · calmer vs chaotic{' '}
                    {oppositeConflict(rows)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Part 3 · measurement sanity</h2>
        {results.part3.length === 0 ? (
          <p className="aside">Waiting on a run.</p>
        ) : (
          <>
            <div>
              {results.part3.map((row) => (
                <div
                  key={row.sketchId}
                  className={`check ${row.motionPass && row.colourPass ? 'pass' : 'fail'}`}
                >
                  <span className="name">{row.title}</span>
                  <span className="num">
                    motion {row.motionMeasured.toFixed(4)} ({row.motionClass}, want{' '}
                    {row.motionExpected}) · colour {row.colourMeasured}, want{' '}
                    {row.colourExpected}
                  </span>
                  <span className="call">
                    {row.motionPass && row.colourPass ? 'pass' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
            <p className="aside">
              {results.part3.filter((r) => r.motionPass).length}/6 motion ·{' '}
              {results.part3.filter((r) => r.colourPass).length}/6 colour.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
