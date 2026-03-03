import type { EdgeType } from '@/lib/types'
import { getEdgeLabel } from '@/lib/edge-labels'

interface EdgeLabelProps {
  type: EdgeType
  direction: 'outbound' | 'inbound'
  className?: string
}

export function EdgeLabel({ type, direction, className = '' }: EdgeLabelProps) {
  const label = getEdgeLabel(type, direction)

  return (
    <span className={`text-[10px] font-medium text-text-secondary ${className}`}>
      {label}
    </span>
  )
}
