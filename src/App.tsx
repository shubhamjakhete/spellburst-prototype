import { useEffect, useState } from 'react'
import SketchRunnerCheck from './dev/SketchRunnerCheck'

type Ping = {
  ok: boolean
  env: { anthropicKey: boolean; demoKey: boolean }
}

export default function App() {
  const [ping, setPing] = useState<Ping | null>(null)

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

      <SketchRunnerCheck />
    </div>
  )
}
