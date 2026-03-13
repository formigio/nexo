import { useNavigate } from 'react-router-dom'
import { TypeBadge } from '@/components/shared/TypeBadge'
import type { NodeType } from '@/lib/types'

interface NodeEditHeaderProps {
  name: string
  type: NodeType
  isDirty: boolean
}

export function NodeEditHeader({ name, type, isDirty }: NodeEditHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-border-default bg-surface-1 shrink-0">
      <button
        onClick={() => navigate(-1)}
        className="text-[13px] text-text-secondary hover:text-text-primary transition-colors"
      >
        &larr; Back
      </button>
      <span className="text-text-dim">/</span>
      <TypeBadge type={type} />
      <span className="text-[14px] font-medium text-text-primary truncate">{name}</span>
      <span className="text-[13px] text-text-dim">&rsaquo; Edit</span>
      <span className="flex-1" />
      {isDirty && (
        <span className="flex items-center gap-1.5 text-[12px] text-node-action">
          <span className="w-1.5 h-1.5 rounded-full bg-node-action" />
          Unsaved
        </span>
      )}
    </div>
  )
}
