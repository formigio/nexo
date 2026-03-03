import type { NodeType } from '@/lib/types'
import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '@/lib/constants'

const ALL_NODE_TYPES: NodeType[] = [
  'Screen', 'Component', 'UserAction', 'APIEndpoint',
  'DataEntity', 'DataField', 'BusinessRule', 'Feature',
  'UserState', 'InfraResource', 'SourceFile',
]

interface NodeTypeSelectorProps {
  value: NodeType | null
  onChange: (type: NodeType | null) => void
}

export function NodeTypeSelector({ value, onChange }: NodeTypeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-text-dim uppercase tracking-wide shrink-0">Type:</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || null) as NodeType | null)}
        className="w-full px-2.5 py-1.5 text-[13px] rounded bg-surface-2 border border-border-default text-text-primary focus:outline-none focus:border-node-screen transition-colors"
      >
        <option value="">Select a type...</option>
        {ALL_NODE_TYPES.map((t) => (
          <option key={t} value={t}>
            {NODE_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      {value && (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: NODE_TYPE_COLORS[value] }}
        />
      )}
    </div>
  )
}
