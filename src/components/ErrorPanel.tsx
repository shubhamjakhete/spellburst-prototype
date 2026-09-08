type Props = {
  title: string
  detail: string
  action?: { label: string; onClick: () => void }
}

export default function ErrorPanel({ title, detail, action }: Props) {
  return (
    <div className="failure">
      <h3>{title}</h3>
      <pre>{detail}</pre>
      {action && (
        <div className="row">
          <button className="btn quiet" onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}
