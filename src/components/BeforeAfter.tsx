import type { Reading } from '../lib/measure'

type Props = {
  before: Reading | null
  after: Reading | null
}

function Side({
  reading,
  label,
}: {
  reading: Reading | null
  label: string
}) {
  return (
    <figure>
      {reading ? (
        <img src={reading.frameA} alt={`the sketch ${label} the change`} />
      ) : (
        <div className="empty" />
      )}
      <figcaption>
        {label}
        {reading && (
          <>
            {' · '}
            {reading.motion.toFixed(3)} {' · '} {reading.palette}
          </>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * Two still frames, not two live sketches. Six p5 instances on one page is
 * more than the point is worth, and a frozen frame is easier to compare.
 */
export default function BeforeAfter({ before, after }: Props) {
  return (
    <div className="pair">
      <Side reading={before} label="before" />
      <Side reading={after} label="after" />
    </div>
  )
}
