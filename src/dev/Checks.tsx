import { useState } from 'react'
import SketchRunnerCheck from './SketchRunnerCheck'
import MeasureCheck from './MeasureCheck'
import BaseSketchCheck from './BaseSketchCheck'
import GenerateCheck from './GenerateCheck'
import PlanCheck from './PlanCheck'
import CheckpointCheck from './CheckpointCheck'

const CHECKS = [
  { id: 'm1', label: 'M1 · sketch runner' },
  { id: 'm2', label: 'M2 · measurement' },
  { id: 'it1', label: 'IT-1 · base sketches' },
  { id: 'm3', label: 'M3 · generate' },
  { id: 'm4', label: 'M4 · plan' },
  { id: 'm5', label: 'M5 · checkpoint' },
] as const

type CheckId = (typeof CHECKS)[number]['id']

/** The per-module checks from BUILD.md, reachable at ?dev=1. */
export default function Checks() {
  const [shown, setShown] = useState<CheckId>('m5')

  return (
    <>
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

      {shown === 'm1' && <SketchRunnerCheck />}
      {shown === 'm2' && <MeasureCheck />}
      {shown === 'it1' && <BaseSketchCheck />}
      {shown === 'm3' && <GenerateCheck />}
      {shown === 'm4' && <PlanCheck />}
      {shown === 'm5' && <CheckpointCheck />}
    </>
  )
}
