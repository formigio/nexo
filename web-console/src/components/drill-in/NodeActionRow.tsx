interface NodeActionRowProps {
  onEdit: () => void
  onAddEdge?: () => void
  onDelete?: () => void
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M8.5 1.5l2 2-7 7H1.5V8.5l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 3h8M4.5 3V2h3v1M3 3v7.5h6V3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

const btnBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] transition-colors'

export function NodeActionRow({ onEdit, onAddEdge, onDelete }: NodeActionRowProps) {
  return (
    <div className="flex items-center gap-2 border-t border-b border-border-default py-2 my-3">
      <button
        onClick={onEdit}
        className={`${btnBase} bg-surface-2 hover:bg-white/[0.08] text-text-secondary hover:text-text-primary`}
      >
        <PencilIcon /> Edit
      </button>
      <button
        onClick={onAddEdge}
        disabled={!onAddEdge}
        className={`${btnBase} bg-surface-2 text-text-secondary ${
          onAddEdge ? 'hover:bg-white/[0.08] hover:text-text-primary' : 'opacity-50 cursor-not-allowed'
        }`}
      >
        <PlusIcon /> Add Edge
      </button>
      <button
        onClick={onDelete}
        disabled={!onDelete}
        className={`${btnBase} ${
          onDelete ? 'text-impact-breaking hover:bg-impact-breaking/10' : 'text-impact-breaking opacity-50 cursor-not-allowed'
        }`}
      >
        <TrashIcon /> Delete
      </button>
    </div>
  )
}
