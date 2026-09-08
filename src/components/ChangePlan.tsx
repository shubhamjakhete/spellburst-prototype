import { useId, useMemo, useState } from 'react'
import type { Plan, PlanItem } from '../lib/api'
import { measurableAs } from '../lib/verify'

/**
 * Exactly what gets sent to apply once the plan has been edited. Nothing is
 * inferred downstream: if an item is not in one of these two lists, the model
 * is never told about it.
 */
export type Decision = {
  approvedChanges: PlanItem[]
  preserved: PlanItem[]
  extraInstruction: string
}

type Side = 'change' | 'preserve'

type Row = PlanItem & {
  /** Position identifies a row. Two items can share a property name. */
  key: string
  /** Which column the item started in, so a move can be undone. */
  origin: Side
  /**
   * As the model wrote it. A moved item is described differently to the user
   * and to apply, but it is still the same property, so this is what decides
   * whether it can be measured.
   */
  wrote: string
  side: Side
  checked: boolean
}

/**
 * A Change item reads as an instruction: "make the stars pulse". Dropped into
 * Preserve unaltered it would ask the model to both do and not do the thing.
 */
const HELD = 'Moved here from Change. Leave this exactly as it is.'

function rowsFrom(plan: Plan): Row[] {
  return [
    ...plan.change.map((item, i) => ({
      ...item,
      key: `change-${i}`,
      origin: 'change' as const,
      wrote: item.description,
      side: 'change' as const,
      checked: true,
    })),
    ...plan.preserve.map((item, i) => ({
      ...item,
      key: `preserve-${i}`,
      origin: 'preserve' as const,
      wrote: item.description,
      side: 'preserve' as const,
      checked: true,
    })),
  ]
}

function decisionFrom(rows: Row[], extraInstruction: string): Decision {
  const live = rows.filter((row) => row.checked)
  const strip = ({ property, description }: Row): PlanItem => ({
    property,
    description,
  })
  return {
    approvedChanges: live.filter((r) => r.side === 'change').map(strip),
    preserved: live.filter((r) => r.side === 'preserve').map(strip),
    extraInstruction: extraInstruction.trim(),
  }
}

function Tag({ row }: { row: Row }) {
  // Classified on what the model wrote, so moving an item does not change
  // whether it can be checked.
  const kind = measurableAs({ property: row.property, description: row.wrote })
  return (
    <span className="tag">
      {kind ? `${kind} · measured` : 'not measurable'}
    </span>
  )
}

type Props = {
  request: string
  plan: Plan
  busy?: boolean
  onCancel: () => void
  onApply: (decision: Decision) => void
}

export default function ChangePlan({
  request,
  plan,
  busy = false,
  onCancel,
  onApply,
}: Props) {
  const base = useId()
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(plan))
  const [extra, setExtra] = useState('')

  const change = rows.filter((row) => row.side === 'change')
  const preserve = rows.filter((row) => row.side === 'preserve')
  const approvedCount = change.filter((row) => row.checked).length

  const checkable = useMemo(
    () =>
      preserve.filter(
        (row) =>
          row.checked &&
          measurableAs({ property: row.property, description: row.wrote }),
      ).length,
    [preserve],
  )

  function update(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )
  }

  function renderItem(row: Row) {
    const id = `${base}-${row.key}`
    return (
      <div className={`item${row.checked ? '' : ' off'}`} key={row.key}>
        <input
          type="checkbox"
          id={id}
          checked={row.checked}
          disabled={busy}
          onChange={(event) =>
            update(row.key, { checked: event.target.checked })
          }
        />
        <div>
          <label htmlFor={id}>{row.property}</label>
          <span className="why">{row.description}</span>
          <Tag row={row} />
        </div>

        {row.side === 'change' ? (
          <button
            className="move"
            disabled={busy}
            onClick={() =>
              update(row.key, { side: 'preserve', description: HELD })
            }
          >
            Keep &rarr;
          </button>
        ) : (
          row.origin === 'change' && (
            <button
              className="move"
              disabled={busy}
              onClick={() =>
                update(row.key, { side: 'change', description: row.wrote })
              }
            >
              &larr; Change
            </button>
          )
        )}
      </div>
    )
  }

  return (
    <div className="sheet">
      <header>
        <h2>
          You asked to <em>{request}</em>
        </h2>
        <p>
          Here is how that was read. Untick anything you did not mean, move
          anything you want left alone, then apply. Nothing has changed yet.
        </p>
      </header>

      <div className="cols">
        <div className="col">
          <h3>Change</h3>
          <p>
            {approvedCount === 0
              ? 'Nothing will be altered.'
              : `${approvedCount} of these will be altered.`}
          </p>
          {change.length === 0 ? (
            <p className="why">Everything was moved across to Keep.</p>
          ) : (
            change.map(renderItem)
          )}
        </div>

        <div className="col">
          <h3>Keep</h3>
          <p>These are asked to stay as they are.</p>
          {preserve.length === 0 ? (
            <p className="why">Nothing is being held.</p>
          ) : (
            preserve.map(renderItem)
          )}
        </div>
      </div>

      <div className="extra">
        <label htmlFor={`${base}-extra`}>Anything else</label>
        <input
          className="field"
          id={`${base}-extra`}
          value={extra}
          disabled={busy}
          placeholder="keep the calm movement"
          onChange={(event) => setExtra(event.target.value)}
        />
      </div>

      <footer>
        <p className="note">
          {checkable} of {preserve.filter((r) => r.checked).length} held items
          can be checked afterwards. The rest cannot.
        </p>
        <button className="btn quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn go"
          disabled={busy || approvedCount === 0}
          onClick={() => onApply(decisionFrom(rows, extra))}
        >
          {busy ? 'applying your approved changes…' : 'Apply changes'}
        </button>
      </footer>
    </div>
  )
}
