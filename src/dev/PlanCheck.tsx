import { useState } from 'react'
import { ApiError, planModification, type Plan } from '../lib/api'
import { mentionsColour, mentionsMovement } from '../lib/verify'
import { BASE_SKETCHES } from '../eval/sketches'

const REQUESTS = ['make it more dramatic', 'make it calmer', 'make it feel futuristic']

const SKETCH = BASE_SKETCHES[0]

const CODE_SMELL = /(function\s|=>|createCanvas|;\s*$|\bconst\b|\blet\b)/

type Result = { request: string; plan?: Plan; failure?: string }

type Assessment = {
  label: string
  pass: boolean
  detail: string
}

function assess(plan: Plan): Assessment[] {
  const everything = [
    plan.summary,
    ...plan.change.map((i) => `${i.property} ${i.description}`),
    ...plan.preserve.map((i) => `${i.property} ${i.description}`),
  ].join(' ')

  const codeish = [...plan.change, ...plan.preserve].some(
    (item) => CODE_SMELL.test(item.property) || CODE_SMELL.test(item.description),
  )

  return [
    {
      label: 'three to five things to change',
      pass: plan.change.length >= 3 && plan.change.length <= 5,
      detail: `${plan.change.length} items`,
    },
    {
      label: 'three to five things to keep',
      pass: plan.preserve.length >= 3 && plan.preserve.length <= 5,
      detail: `${plan.preserve.length} items`,
    },
    {
      label: 'something about movement',
      pass: mentionsMovement(everything),
      detail: mentionsMovement(everything) ? 'present' : 'missing',
    },
    {
      label: 'something about colour',
      pass: mentionsColour(everything),
      detail: mentionsColour(everything) ? 'present' : 'missing',
    },
    {
      label: 'no code came back',
      pass: !codeish,
      detail: codeish ? 'looks like code' : 'clean',
    },
  ]
}

const STOPWORDS = new Set(['the', 'a', 'of', 'and', 'in', 'to'])

function wordsOf(plan: Plan): Set<string> {
  return new Set(
    plan.change
      .flatMap((item) => item.property.toLowerCase().split(/\W+/))
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  )
}

function overlap(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((word) => b.has(word)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : shared / union
}

async function runAll(report: (results: Result[], done: boolean) => void) {
  const results: Result[] = []
  for (const request of REQUESTS) {
    try {
      results.push({ request, plan: await planModification(SKETCH.code, request) })
    } catch (error) {
      results.push({
        request,
        failure:
          error instanceof ApiError
            ? `${error.status}: ${error.message}`
            : String(error),
      })
    }
    report([...results], results.length === REQUESTS.length)
  }
}

export default function PlanCheck() {
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)

  const plans = results.filter((r) => r.plan).map((r) => r.plan as Plan)
  const overlaps: number[] = []
  for (let i = 0; i < plans.length; i++) {
    for (let j = i + 1; j < plans.length; j++) {
      overlaps.push(overlap(wordsOf(plans[i]), wordsOf(plans[j])))
    }
  }
  const meanOverlap = overlaps.length
    ? overlaps.reduce((a, b) => a + b, 0) / overlaps.length
    : 0

  return (
    <div className="panel">
      <h2>M4 · plan</h2>
      <p className="aside" style={{ marginTop: 0 }}>
        Three different requests against the same sketch ({SKETCH.title}). The
        plans have to differ from each other, cover movement and colour, and
        contain no code at all.
      </p>

      <div className="row">
        <button
          className="btn"
          disabled={running}
          onClick={() => {
            setRunning(true)
            setResults([])
            void runAll((next, done) => {
              setResults(next)
              if (done) setRunning(false)
            })
          }}
        >
          {running
            ? `working out what you mean (${results.length + 1} of ${REQUESTS.length})…`
            : 'read all three requests'}
        </button>
      </div>

      {results.map((result) => (
        <div key={result.request} style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: 14 }}>“{result.request}”</h3>

          {result.failure ? (
            <div className="failure" style={{ marginTop: 8 }}>
              <pre>{result.failure}</pre>
            </div>
          ) : (
            result.plan && (
              <>
                <p className="aside" style={{ marginTop: 6 }}>
                  {result.plan.summary}
                </p>

                <div className="cols" style={{ marginTop: 10 }}>
                  <div className="col">
                    <h3>Change</h3>
                    {result.plan.change.map((item) => (
                      <div className="item" key={item.property}>
                        <div>
                          <label>{item.property}</label>
                          <span className="why">{item.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="col">
                    <h3>Keep</h3>
                    {result.plan.preserve.map((item) => (
                      <div className="item" key={item.property}>
                        <div>
                          <label>{item.property}</label>
                          <span className="why">{item.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  {assess(result.plan).map((a) => (
                    <div
                      key={a.label}
                      className={`check ${a.pass ? 'pass' : 'fail'}`}
                    >
                      <span className="name">{a.label}</span>
                      <span className="num">{a.detail}</span>
                      <span className="call">{a.pass ? 'pass' : 'FAIL'}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      ))}

      {plans.length > 1 && (
        <p className="aside">
          <strong>
            mean overlap between the change lists:{' '}
            {(meanOverlap * 100).toFixed(0)}%
          </strong>
          . Low means the plan reflects what was asked rather than repeating
          boilerplate.
        </p>
      )}
    </div>
  )
}
