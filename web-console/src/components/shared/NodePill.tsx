import type { NodeType } from '@/lib/types'
import { NODE_TYPE_COLORS } from '@/lib/constants'

interface NodePillProps {
  id: string
  name: string
  type: NodeType
  onClick?: () => void
}

export function NodePill({ id, name, type, onClick }: NodePillProps) {
  const color = NODE_TYPE_COLORS[type]
  const Component = onClick ? 'button' : 'span'

  return (
    <Component
      data-testid={`node-pill-${id}`}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[13px] font-medium ${
        onClick
          ? 'cursor-pointer hover:bg-white/[0.08] transition-colors'
          : ''
      }`}
      style={{ color }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </Component>
  )
}
