import { useState } from 'react'
import { runSketch, SketchError, type SketchFrames } from '../lib/sketch'

type Case = {
  id: string
  label: string
  expectation: string
  code: string
}

const MOVING = `let t = 0;

function setup() {
  createCanvas(600, 400);
  noStroke();
}

function draw() {
  background(16, 26, 46);
  fill(232, 238, 247);
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + t * 220) % 600;
    const y = 40 + ((i * 53) % 320);
    circle(x, y, 5);
  }
  t += 0.05;
}`

const STILL = `function setup() {
  createCanvas(600, 400);
  noStroke();
  noLoop();
}

function draw() {
  background(16, 26, 46);
  fill(232, 238, 247);
  for (let i = 0; i < 40; i++) {
    circle((i * 97) % 600, 40 + ((i * 53) % 320), 5);
  }
}`

const SYNTAX_ERROR = `function setup( {
  createCanvas(600, 400);
}

function draw() {
  background(0);
}`

const RUNTIME_ERROR = `function setup() {
  createCanvas(600, 400);
}

function draw() {
  background(16, 26, 46);
  thisFunctionDoesNotExist();
}`

const CASES: Case[] = [
  {
    id: 'moving',
    label: 'moving sketch',
    expectation: 'two frames that differ',
    code: MOVING,
  },
  {
    id: 'still',
    label: 'still sketch',
    expectation: 'two identical frames',
    code: STILL,
  },
  {
    id: 'syntax',
    label: 'broken: syntax error',
    expectation: 'an error, not a blank box',
    code: SYNTAX_ERROR,
  },
  {
    id: 'runtime',
    label: 'broken: undefined call',
    expectation: 'an error, not a blank box',
    code: RUNTIME_ERROR,
  },
]

type Result =
  | { status: 'idle' }
  | { status: 'running'; test: Case }
  | { status: 'ok'; test: Case; frames: SketchFrames; elapsedMs: number }
  | { status: 'failed'; test: Case; kind: string; message: string }

async function run(test: Case, report: (result: Result) => void) {
  report({ status: 'running', test })
  const startedAt = performance.now()

  try {
    const frames = await runSketch(test.code)
    report({
      status: 'ok',
      test,
      frames,
      elapsedMs: Math.round(performance.now() - startedAt),
    })
  } catch (error) {
    if (error instanceof SketchError) {
      report({ status: 'failed', test, kind: error.kind, message: error.message })
      return
    }
    report({ status: 'failed', test, kind: 'unexpected', message: String(error) })
  }
}

export default function SketchRunnerCheck() {
  const [result, setResult] = useState<Result>({ status: 'idle' })
  const running = result.status === 'running'

  return (
    <div className="work">
      <div>
        {result.status === 'ok' ? (
          <div className="stage">
            <div className="pair">
              <figure>
                <img src={result.frames.frameA} alt="first captured frame" />
                <figcaption>frame A</figcaption>
              </figure>
              <figure>
                <img src={result.frames.frameB} alt="second captured frame" />
                <figcaption>frame B, 500ms later</figcaption>
              </figure>
            </div>
            <div className="stagefoot">
              <span>
                frames{' '}
                <b>
                  {result.frames.frameA === result.frames.frameB
                    ? 'identical'
                    : 'differ'}
                </b>
              </span>
              <span>
                captured in <b>{result.elapsedMs}ms</b>
              </span>
            </div>
          </div>
        ) : (
          <div className="stage">
            <div className="stagefoot">
              <span>
                {running
                  ? `running the ${result.test.label}`
                  : 'nothing captured yet'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="panel">
          <h2>M1 · sketch runner</h2>
          <p className="aside" style={{ marginTop: 0 }}>
            Each button runs hand-written p5 through <code>runSketch</code> in a
            sandboxed iframe and captures two frames 500ms apart. The two broken
            cases should produce a readable error while the page stays alive.
          </p>
          <div className="row">
            {CASES.map((test) => (
              <button
                key={test.id}
                className="chip"
                disabled={running}
                aria-pressed={result.status !== 'idle' && result.test.id === test.id}
                onClick={() => void run(test, setResult)}
              >
                {test.label}
              </button>
            ))}
          </div>
        </div>

        {result.status !== 'idle' && (
          <div className="panel">
            <h2>{result.test.label}</h2>
            <p className="mono">expected: {result.test.expectation}</p>

            {result.status === 'running' && (
              <p className="aside">running the sketch…</p>
            )}

            {result.status === 'ok' && (
              <p className="aside">
                Captured two frames. They are{' '}
                <strong>
                  {result.frames.frameA === result.frames.frameB
                    ? 'byte-for-byte identical'
                    : 'different'}
                </strong>
                .
              </p>
            )}

            {result.status === 'failed' && (
              <div style={{ marginTop: 14 }}>
                <div className="failure">
                  <h3>the sketch failed · {result.kind}</h3>
                  <pre>{result.message}</pre>
                </div>
                <p className="aside">
                  The app is still running, which is the point of this case.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
