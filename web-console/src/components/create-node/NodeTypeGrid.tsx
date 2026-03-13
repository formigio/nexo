import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/constants'
import type { NodeType } from '@/lib/types'

interface NodeTypeGridProps {
  value: NodeType | null
  onChange: (type: NodeType) => void
}

const TYPE_ORDER: NodeType[] = [
  'Screen',
  'Component',
  'UserAction',
  'APIEndpoint',
  'DataEntity',
  'DataField',
  'BusinessRule',
  'Feature',
  'InfraResource',
  'SourceFile',
  'UserState',
]

export function NodeTypeGrid({ value, onChange }: NodeTypeGridProps) {
  return (
    <div role="radiogroup" aria-label="Node type" className="grid grid-cols-4 gap-2">
      {TYPE_ORDER.map((type) => {
        const selected = value === type
        const color = NODE_TYPE_COLORS[type]
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded border text-[12px] text-left transition-colors ${
              selected
                ? 'border-current bg-current/10 text-text-primary'
                : 'border-border-default text-text-secondary hover:border-text-dim'
            }`}
            style={selected ? { borderColor: color, backgroundColor: `${color}15` } : undefined}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{NODE_TYPE_LABELS[type]}</span>
          </button>
        )
      })}
    </div>
  )
}
