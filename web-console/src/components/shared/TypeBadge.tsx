import type { NodeType } from '@/lib/types'
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/constants'

interface TypeBadgeProps {
  type: NodeType
  className?: string
}

export function TypeBadge({ type, className = '' }: TypeBadgeProps) {
  const color = NODE_TYPE_COLORS[type]
  const label = NODE_TYPE_LABELS[type]

  return (
    <span
      data-testid={`type-badge-${type}`}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${className}`}
      style={{
        backgroundColor: `${color}26`,
        color,
      }}
    >
      {label}
    </span>
  )
}
