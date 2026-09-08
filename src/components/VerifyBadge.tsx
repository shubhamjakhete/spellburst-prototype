import type { Verdict } from '../lib/verify'

const CLASS: Record<Verdict['call'], string> = {
  kept: 'held',
  changed: 'broke',
  unchecked: 'skip',
}

const WORDING: Record<Verdict['call'], string> = {
  kept: 'kept',
  changed: 'changed anyway',
  unchecked: 'not checked',
}

export default function VerifyBadge({ verdict }: { verdict: Verdict }) {
  return (
    <div className={`v ${CLASS[verdict.call]}`}>
      <span className="name">
        {verdict.property}
        {verdict.because && <span className="why">{verdict.because}</span>}
      </span>
      <span className="num">{verdict.detail}</span>
      <span className="call">{WORDING[verdict.call]}</span>
    </div>
  )
}
