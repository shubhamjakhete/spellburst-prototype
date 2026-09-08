import { EXAMPLE_PROMPTS } from '../lib/examples'

type Props = {
  value: string
  busy: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}

export default function PromptInput({
  value,
  busy,
  onChange,
  onSubmit,
}: Props) {
  return (
    <div className="panel">
      <h2>Describe an artwork</h2>

      <input
        className="field"
        value={value}
        disabled={busy}
        placeholder="a night sky with mountains and moving stars"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && value.trim() && !busy) onSubmit()
        }}
      />

      <div className="row">
        {EXAMPLE_PROMPTS.map((example) => (
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
          className="btn go"
          disabled={busy || !value.trim()}
          onClick={onSubmit}
        >
          {busy ? 'writing the sketch…' : 'Write the sketch'}
        </button>
      </div>
    </div>
  )
}
