import { useEffect, useState } from 'react'
import SketchRunnerCheck from './dev/SketchRunnerCheck'
import MeasureCheck from './dev/MeasureCheck'

type Ping = {
  ok: boolean
  env: { anthropicKey: boolean; demoKey: boolean }
}

const CHECKS = [
  { id: 'm1', label: 'M1 · sketch runner' },
  { id: 'm2', label: 'M2 · measurement' },
] as const

type CheckId = (typeof CHECKS)[number]['id']

export default function App() {
  const [ping, setPing] = useState<Ping | null>(null)
  const [shown, setShown] = useState<CheckId>('m2')

  useEffect(() => {
    let cancelled = false

    fetch('/api/ping')
      .then((res) => (res.ok ? (res.json() as Promise<Ping>) : null))
      .then((data) => {
        if (!cancelled) setPing(data)
      })
      .catch(() => {
        if (!cancelled) setPing(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const apiLine = !ping
    ? 'api unreachable'
    : `api ok · key ${ping.env.anthropicKey ? 'set' : 'missing'} · demo ${
        ping.env.demoKey ? 'set' : 'missing'
      }`

  return (
    <div className="shell">
      <header className="masthead">
        <h1>Plan First</h1>
        <p>Creative coding with a review step</p>
        <p className="mono">{apiLine}</p>
      </header>

      <div className="row" style={{ marginTop: 0, marginBottom: 22 }}>
        {CHECKS.map((check) => (
          <button
            key={check.id}
            className="chip"
            aria-pressed={shown === check.id}
            onClick={() => setShown(check.id)}
          >
            {check.label}
          </button>
        ))}
      </div>

      {shown === 'm1' ? <SketchRunnerCheck /> : <MeasureCheck />}
    </div>
  )
}
