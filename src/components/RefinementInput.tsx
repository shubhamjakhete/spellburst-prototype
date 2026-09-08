import { EXAMPLE_REFINEMENTS } from '../lib/examples'

type Props = {
  value: string
  busy: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export default function RefinementInput({
  value,
  busy,
  onChange,
  onSubmit,
}: Props) {
  return (
    <div className="panel">
      <h2>Change something</h2>

      <input
        className="field"
        value={value}
        disabled={busy}
        placeholder="make it more dramatic"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && value.trim() && !busy) onSubmit()
        }}
      />

      <div className="row">
        {EXAMPLE_REFINEMENTS.map((example) => (
          <button
            key={example}
            className="chip"
            disabled={busy}
            aria-pressed={value === example}
            onClick={() => onChange(example)}
          >
            {example}
          </button>
        ))}
      </div>

      <div className="row">
        <button
          className="btn"
          disabled={busy || !value.trim()}
          onClick={onSubmit}
        >
          {busy ? 'working out what you mean…' : 'See the plan'}
        </button>
      </div>

      <p className="aside">
        Nothing is applied from here. The next screen shows how the request was
        read, and you can change it before anything runs.
      </p>
    </div>
  )
}
