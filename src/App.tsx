import { useEffect, useState } from 'react'

type Ping = {
  ok: boolean
  service: string
  time: string
  env: { anthropicKey: boolean; demoKey: boolean }
}

type PingState =
  | { status: 'checking' }
  | { status: 'ok'; ping: Ping }
  | { status: 'failed'; message: string }

export default function App() {
  const [ping, setPing] = useState<PingState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false

    fetch('/api/ping')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as Ping
      })
      .then((data) => {
        if (!cancelled) setPing({ status: 'ok', ping: data })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPing({ status: 'failed', message: String(err) })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main>
      <h1>Plan First</h1>
      <p className="tagline">
        Describe an artwork, ask for a change, and see how the request was read
        before anything is modified.
      </p>

      <section className="status">
        <h2>API</h2>
        {ping.status === 'checking' && <p>checking /api/ping</p>}
        {ping.status === 'failed' && (
          <p className="bad">/api/ping unreachable — {ping.message}</p>
        )}
        {ping.status === 'ok' && (
          <>
            <p className="good">
              /api/ping responded at {ping.ping.time}
            </p>
            <ul>
              <li className={ping.ping.env.anthropicKey ? 'good' : 'bad'}>
                ANTHROPIC_API_KEY {ping.ping.env.anthropicKey ? 'set' : 'missing'}
              </li>
              <li className={ping.ping.env.demoKey ? 'good' : 'bad'}>
                DEMO_KEY {ping.ping.env.demoKey ? 'set' : 'missing'}
              </li>
            </ul>
          </>
        )}
      </section>
    </main>
  )
}
