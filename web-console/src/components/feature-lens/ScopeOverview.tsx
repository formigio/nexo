import { NODE_TYPE_LABELS, NODE_TYPE_COLORS } from '@/lib/constants'
import type { Node, NodeType } from '@/lib/types'

const FLOW_ORDER: NodeType[] = [
  'Screen', 'Component', 'UserAction', 'APIEndpoint',
  'DataEntity', 'DataField', 'BusinessRule',
]

interface ScopeOverviewProps {
  grouped: Map<NodeType, Node[]>
}

export function ScopeOverview({ grouped }: ScopeOverviewProps) {
  const total = Array.from(grouped.values()).reduce((sum, arr) => sum + arr.length, 0)

  // Filter to types that have members
  const activeTypes = FLOW_ORDER.filter((t) => (grouped.get(t)?.length ?? 0) > 0)

  // Also include types not in FLOW_ORDER
  const otherTypes = Array.from(grouped.keys()).filter(
    (t) => !FLOW_ORDER.includes(t) && (grouped.get(t)?.length ?? 0) > 0,
  )

  return (
    <div className="p-4 rounded-lg border border-border-subtle bg-surface-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-dim">
          Scope Overview
        </span>
        <span className="text-[11px] text-text-dim">({total} nodes)</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {[...activeTypes, ...otherTypes].map((type, idx) => {
          const count = grouped.get(type)?.length ?? 0
          const color = NODE_TYPE_COLORS[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              {idx > 0 && (
                <svg className="w-3 h-3 text-border-default shrink-0 -ml-0.5 mr-0.5" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M4.5 2l4 4-4 4" />
                </svg>
              )}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
                style={{ backgroundColor: `${color}15` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[12px] font-medium" style={{ color }}>
                  {NODE_TYPE_LABELS[type]}
                </span>
                <span className="text-[12px] font-semibold text-text-primary">{count}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
