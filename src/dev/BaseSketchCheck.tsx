import { useState } from 'react'
import { runSketch, SketchError } from '../lib/sketch'
import { measureMotion, measurePalette, type ColourName } from '../lib/measure'
import {
  BASE_SKETCHES,
  classifyMotion,
  type BaseSketch,
  type MotionClass,
} from '../eval/sketches'

type Row = {
  sketch: BaseSketch
  frameA?: string
  motion?: number
  motionClass?: MotionClass
  palette?: ColourName
  motionPass: boolean
  palettePass: boolean
  failure?: string
}

async function runAll(
  report: (rows: Row[], done: boolean) => void,
): Promise<void> {
  const rows: Row[] = []

  for (const sketch of BASE_SKETCHES) {
    try {
      const frames = await runSketch(sketch.code)
      const motion = await measureMotion(frames.frameA, frames.frameB)
      const palette = await measurePalette(frames.frameA)
      const motionClass = classifyMotion(motion)

      rows.push({
        sketch,
        frameA: frames.frameA,
        motion,
        motionClass,
        palette,
        motionPass: motionClass === sketch.expectedMotion,
        palettePass: palette === sketch.expectedPalette,
      })
    } catch (error) {
      rows.push({
        sketch,
        motionPass: false,
        palettePass: false,
        failure:
          error instanceof SketchError
            ? `${error.kind}: ${error.message}`
            : String(error),
      })
    }

    report([...rows], rows.length === BASE_SKETCHES.length)
  }
}

export default function BaseSketchCheck() {
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)

  const motionPassed = rows.filter((r) => r.motionPass).length
  const palettePassed = rows.filter((r) => r.palettePass).length
  const total = BASE_SKETCHES.length

  return (
    <div className="panel">
      <h2>IT-1 · runner plus measurement</h2>
      <p className="aside" style={{ marginTop: 0 }}>
        The six base sketches through <code>runSketch</code>, then both
        measures. No model is involved, so a miss here is a bug or a wrong
        threshold rather than variance. Expected values were written down before
        this was first run.
      </p>

      <div className="row">
        <button
          className="btn"
          disabled={running}
          onClick={() => {
            setRunning(true)
            setRows([])
            void runAll((next, done) => {
              setRows(next)
              if (done) setRunning(false)
            })
          }}
        >
          {running
            ? `running ${rows.length + 1} of ${total}…`
            : 'run the six base sketches'}
        </button>
      </div>

      {rows.length > 0 && (
        <>
          <div style={{ marginTop: 18 }}>
            {rows.map((row) => (
              <div key={row.sketch.id} className="basecheck">
                {row.frameA ? (
                  <img src={row.frameA} alt={row.sketch.title} />
                ) : (
                  <div className="thumb-missing" />
                )}

                <div className="basecheck-body">
                  <span className="name">{row.sketch.title}</span>
                  {row.failure ? (
                    <span className="num">{row.failure}</span>
                  ) : (
                    <span className="num">
                      motion {row.motion?.toFixed(4)} · {row.motionClass}, want{' '}
                      {row.sketch.expectedMotion} — colour {row.palette}, want{' '}
                      {row.sketch.expectedPalette}
                    </span>
                  )}
                </div>

                <span
                  className={`call ${row.motionPass ? 'ok' : 'bad'}`}
                  title="motion"
                >
                  {row.motionPass ? 'motion' : 'MOTION'}
                </span>
                <span
                  className={`call ${row.palettePass ? 'ok' : 'bad'}`}
                  title="colour"
                >
                  {row.palettePass ? 'colour' : 'COLOUR'}
                </span>
              </div>
            ))}
          </div>

          <p className="aside">
            <strong>
              motion {motionPassed} of {total} · colour {palettePassed} of{' '}
              {total}
            </strong>
            {motionPassed === total && palettePassed === total
              ? '. Both pass conditions met.'
              : '. Not yet passing.'}
          </p>
        </>
      )}
    </div>
  )
}
