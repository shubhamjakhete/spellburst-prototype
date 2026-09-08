import { useState } from 'react'
import { measureMotion, measurePalette, type ColourName } from '../lib/measure'

const W = 600
const H = 400

function paint(draw: (context: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const context = canvas.getContext('2d')
  if (!context) throw new Error('no 2d canvas context available')
  draw(context)
  return canvas.toDataURL('image/png')
}

function solid(colour: string): string {
  return paint((context) => {
    context.fillStyle = colour
    context.fillRect(0, 0, W, H)
  })
}

function block(background: string, colour: string, coverage: number): string {
  return paint((context) => {
    context.fillStyle = background
    context.fillRect(0, 0, W, H)
    context.fillStyle = colour
    context.fillRect(0, 0, W, H * coverage)
  })
}

function speckle(background: string, colour: string): string {
  return paint((context) => {
    context.fillStyle = background
    context.fillRect(0, 0, W, H)
    context.fillStyle = colour
    for (let x = 5; x < W; x += 20) {
      for (let y = 5; y < H; y += 20) context.fillRect(x, y, 10, 10)
    }
  })
}

type Outcome = {
  label: string
  expected: string
  actual: string
  pass: boolean
}

async function motionCase(
  label: string,
  a: string,
  b: string,
  low: number,
  high: number,
): Promise<Outcome> {
  const value = await measureMotion(a, b)
  return {
    label,
    expected: `${low.toFixed(3)} to ${high.toFixed(3)}`,
    actual: value.toFixed(4),
    pass: value >= low && value <= high,
  }
}

async function paletteCase(
  label: string,
  frame: string,
  want: ColourName,
): Promise<Outcome> {
  const value = await measurePalette(frame)
  return { label, expected: want, actual: value, pass: value === want }
}

const BLACK = '#000000'
const WHITE = '#ffffff'
const NIGHT = '#101a2e'

async function runAll(report: (outcomes: Outcome[]) => void) {
  const outcomes: Outcome[] = []

  // Motion. Identical frames must read as nothing moved, and black against
  // white must read as everything moved.
  outcomes.push(
    await motionCase('identical frames', solid(NIGHT), solid(NIGHT), 0, 0.005),
  )
  outcomes.push(
    await motionCase('black against white', solid(BLACK), solid(WHITE), 0.98, 1),
  )
  outcomes.push(
    await motionCase(
      'black against mid grey',
      solid(BLACK),
      solid('#808080'),
      0.48,
      0.52,
    ),
  )
  outcomes.push(
    await motionCase(
      'a quarter of the frame turns white',
      solid(BLACK),
      block(BLACK, WHITE, 0.25),
      0.23,
      0.27,
    ),
  )

  // Palette. One case per bucket the hue ranges can produce.
  outcomes.push(await paletteCase('solid red', solid('#d22b2b'), 'red'))
  outcomes.push(await paletteCase('solid orange', solid('#d97a2b'), 'orange'))
  outcomes.push(await paletteCase('solid yellow', solid('#e8d44a'), 'yellow'))
  outcomes.push(await paletteCase('solid green', solid('#2f6b4a'), 'green'))
  outcomes.push(await paletteCase('solid cyan', solid('#3fd0d8'), 'cyan'))
  outcomes.push(await paletteCase('night sky navy', solid(NIGHT), 'blue'))
  outcomes.push(await paletteCase('solid purple', solid('#241033'), 'purple'))
  outcomes.push(await paletteCase('solid pink', solid('#e0409a'), 'pink'))
  outcomes.push(await paletteCase('solid white', solid(WHITE), 'white'))
  outcomes.push(await paletteCase('solid grey', solid('#6b6f68'), 'grey'))
  outcomes.push(await paletteCase('solid black', solid(BLACK), 'black'))

  // Background is skipped, so a red shape over black still reads red even
  // though most of the frame is not red.
  outcomes.push(
    await paletteCase(
      'red shape on black, 20% of the frame',
      block(BLACK, '#d22b2b', 0.2),
      'red',
    ),
  )

  // Detail finer than the 64x64 sample averages into its background. Stars on
  // a night sky behave this way, which is why the sky colour wins.
  outcomes.push(
    await paletteCase(
      'fine white speckle on black',
      speckle(BLACK, WHITE),
      'grey',
    ),
  )

  report(outcomes)
}

export default function MeasureCheck() {
  const [outcomes, setOutcomes] = useState<Outcome[] | null>(null)
  const [running, setRunning] = useState(false)

  const passed = outcomes?.filter((o) => o.pass).length ?? 0
  const total = outcomes?.length ?? 0

  return (
    <div className="panel" style={{ maxWidth: 680 }}>
      <h2>M2 · measurement</h2>
      <p className="aside" style={{ marginTop: 0 }}>
        No model is involved here, so every case is an exact assertion rather
        than something to judge by eye. Frames are drawn to a canvas with known
        colours and fed straight to <code>measureMotion</code> and{' '}
        <code>measurePalette</code>.
      </p>

      <div className="row">
        <button
          className="btn"
          disabled={running}
          onClick={() => {
            setRunning(true)
            void runAll((result) => {
              setOutcomes(result)
              setRunning(false)
            })
          }}
        >
          {running ? 'measuring…' : 'run the measurement checks'}
        </button>
      </div>

      {outcomes && (
        <>
          <div style={{ marginTop: 18 }}>
            {outcomes.map((outcome) => (
              <div
                key={outcome.label}
                className={`check ${outcome.pass ? 'pass' : 'fail'}`}
              >
                <span className="name">{outcome.label}</span>
                <span className="num">
                  want {outcome.expected} · got {outcome.actual}
                </span>
                <span className="call">{outcome.pass ? 'pass' : 'FAIL'}</span>
              </div>
            ))}
          </div>
          <p className="aside">
            <strong>
              {passed} of {total} passed
            </strong>
            {passed === total
              ? '. Measurement behaves as specified.'
              : '. A failure here is a bug or a wrong threshold, not variance.'}
          </p>
        </>
      )}
    </div>
  )
}
