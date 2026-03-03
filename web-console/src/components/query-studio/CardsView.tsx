import type { QueryResult } from '@/hooks/useQueryExecution'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { NODE_TYPE_COLORS } from '@/lib/constants'
import type { Node } from '@/lib/types'

interface CardsViewProps {
  result: QueryResult
  onNodeClick: (node: Node) => void
}

export function CardsView({ result, onNodeClick }: CardsViewProps) {
  return (
    <div className="grid gap-2 p-4">
      {result.resultNodes.map((r) => {
        const color = NODE_TYPE_COLORS[r.node.type]
        return (
          <button
            key={r.node.id}
            onClick={() => onNodeClick(r.node)}
            className="text-left p-3 rounded-lg border border-border-default hover:border-border-subtle bg-surface-1 hover:bg-white/[0.03] transition-colors"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <TypeBadge type={r.node.type} />
              <span className="text-[13px] font-medium text-text-primary">{r.node.name}</span>
            </div>
            {r.node.description && (
              <p className="text-[12px] text-text-secondary mb-1.5 line-clamp-2">
                {r.node.description}
              </p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-dim">{r.connection}</span>
              {r.depth > 0 && (
                <span className="text-[11px] text-text-dim">
                  {r.depth} hop{r.depth !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
