import { useState } from 'react'
import { ApiError, accessCode, generateSketch } from '../lib/api'
import { runSketch, SketchError } from '../lib/sketch'
import { measureMotion, measurePalette, type ColourName } from '../lib/measure'

const EXAMPLES = [
  'a night sky with mountains and moving stars',
  'slow drifting particles in warm colours',
  'a pulsing circle on a dark background',
]

type Assertion = { label: string; pass: boolean; detail: string }

type State =
  | { status: 'idle' }
  | { status: 'writing' }
  | { status: 'running'; code: string }
  | {
      status: 'done'
      code: string
      assertions: Assertion[]
      frameA: string
      frameB: string
      motion: number
      palette: ColourName
    }
  | { status: 'broken'; code: string; assertions: Assertion[]; failure: string }
  | { status: 'failed'; failure: string }

function inspect(code: string): Assertion[] {
  const lines = code.split('\n').length
  const canvas = /createCanvas\s*\(\s*600\s*,\s*400\s*\)/.test(code)
  const noLoop = /\bnoLoop\s*\(/.test(code)
  const fenced = code.includes('```')
  const webgl = /\bWEBGL\b/.test(code)

  return [
    {
      label: 'calls createCanvas(600, 400)',
      pass: canvas,
      detail: canvas ? 'found' : 'missing',
    },
    {
      label: 'does not call noLoop()',
      pass: !noLoop,
      detail: noLoop ? 'noLoop() is present' : 'absent',
    },
    {
      label: 'no markdown fences survived',
      pass: !fenced,
      detail: fenced ? 'a fence is still in the code' : 'clean',
    },
    {
      label: 'uses the 2D renderer',
      pass: !webgl,
      detail: webgl ? 'WEBGL requested' : 'default renderer',
    },
    {
      label: 'under 80 lines',
      pass: lines < 80,
      detail: `${lines} lines`,
    },
  ]
}

async function run(prompt: string, report: (state: State) => void) {
  report({ status: 'writing' })

  let code: string
  try {
    code = await generateSketch(prompt)
  } catch (error) {
    report({
      status: 'failed',
      failure:
        error instanceof ApiError
          ? `${error.status}: ${error.message}`
          : String(error),
    })
    return
  }

  const assertions = inspect(code)
  report({ status: 'running', code })

  try {
    const frames = await runSketch(code)
    const motion = await measureMotion(frames.frameA, frames.frameB)
    const palette = await measurePalette(frames.frameA)
    report({
      status: 'done',
      code,
      assertions,
      frameA: frames.frameA,
      frameB: frames.frameB,
      motion,
      palette,
    })
  } catch (error) {
    report({
      status: 'broken',
      code,
      assertions,
      failure:
        error instanceof SketchError
          ? `${error.kind}: ${error.message}`
          : String(error),
    })
  }
}

export default function GenerateCheck() {
  const [prompt, setPrompt] = useState(EXAMPLES[0])
  const [state, setState] = useState<State>({ status: 'idle' })

  const busy = state.status === 'writing' || state.status === 'running'
  const code = 'code' in state ? state.code : null
  const assertions = 'assertions' in state ? state.assertions : null
  const passed = assertions?.filter((a) => a.pass).length ?? 0

  return (
    <div className="work">
      <div>
        <div className="stage">
          {state.status === 'done' ? (
            <>
              <div className="pair">
                <figure>
                  <img src={state.frameA} alt="first frame" />
                  <figcaption>frame A</figcaption>
                </figure>
                <figure>
                  <img src={state.frameB} alt="second frame" />
                  <figcaption>frame B, 500ms later</figcaption>
                </figure>
              </div>
              <div className="stagefoot">
                <span>
                  motion <b>{state.motion.toFixed(4)}</b>
                </span>
                <span>
                  colour <b>{state.palette}</b>
                </span>
              </div>
            </>
          ) : (
            <div className="stagefoot">
              <span>
                {state.status === 'writing'
                  ? 'writing the sketch…'
                  : state.status === 'running'
                    ? 'running the sketch…'
                    : state.status === 'broken'
                      ? 'the generated sketch did not run'
                      : 'nothing generated yet'}
              </span>
            </div>
          )}
        </div>

        {code && (
          <div className="panel" style={{ marginTop: 16 }}>
            <h2>what came back</h2>
            <pre className="code">{code}</pre>
          </div>
        )}
      </div>

      <div>
        <div className="panel">
          <h2>M3 · generate</h2>
          <p className="aside" style={{ marginTop: 0 }}>
            Sends a prompt to <code>/api/generate</code>, checks the code
            against the rules the function asks for, then runs it.
          </p>

          <input
            className="field"
            value={prompt}
            disabled={busy}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="describe an artwork"
            style={{ marginTop: 12 }}
          />

          <div className="row">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                className="chip"
                disabled={busy}
                aria-pressed={prompt === example}
                onClick={() => setPrompt(example)}
              >
                {example}
              </button>
            ))}
          </div>

          <div className="row">
            <button
              className="btn go"
              disabled={busy || !prompt.trim()}
              onClick={() => void run(prompt, setState)}
            >
              {state.status === 'writing'
                ? 'writing the sketch…'
                : state.status === 'running'
                  ? 'running the sketch…'
                  : 'write the sketch'}
            </button>
          </div>

          {!accessCode() && (
            <p className="aside">
              No access code in the URL. Add <code>?k=…</code> or the function
              will refuse the request.
            </p>
          )}
        </div>

        {assertions && (
          <div className="panel">
            <h2>the code it returned</h2>
            {assertions.map((assertion) => (
              <div
                key={assertion.label}
                className={`check ${assertion.pass ? 'pass' : 'fail'}`}
              >
                <span className="name">{assertion.label}</span>
                <span className="num">{assertion.detail}</span>
                <span className="call">{assertion.pass ? 'pass' : 'FAIL'}</span>
              </div>
            ))}
            <p className="aside">
              <strong>
                {passed} of {assertions.length} passed
              </strong>
              {state.status === 'done' && '. The sketch rendered.'}
            </p>
          </div>
        )}

        {state.status === 'broken' && (
          <div className="panel">
            <div className="failure">
              <h3>the generated sketch failed to run</h3>
              <pre>{state.failure}</pre>
            </div>
          </div>
        )}

        {state.status === 'failed' && (
          <div className="panel">
            <div className="failure">
              <h3>the request failed</h3>
              <pre>{state.failure}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
