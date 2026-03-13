import { TypeBadge } from '@/components/shared/TypeBadge'
import { getEdgeLabel } from '@/lib/edge-labels'
import type { Node, Edge, EdgeType, NodeType } from '@/lib/types'

interface EdgeImpactItem {
  edge: Edge
  node: Node
  direction: 'outbound' | 'inbound'
}

interface EdgeImpactListProps {
  edges: EdgeImpactItem[]
  isLoading: boolean
}

export function EdgeImpactList({ edges, isLoading }: EdgeImpactListProps) {
  if (isLoading) {
    return (
      <div className="rounded border border-border-default bg-surface-2 p-3">
        <div className="flex items-center gap-2 text-[12px] text-text-dim">
          <span className="animate-pulse">Loading affected edges...</span>
        </div>
      </div>
    )
  }

  if (edges.length === 0) {
    return (
      <div className="rounded border border-border-default bg-surface-2 p-3">
        <span className="text-[12px] text-text-dim">No connected edges.</span>
      </div>
    )
  }

  return (
    <div className="rounded border border-border-default bg-surface-2 overflow-hidden">
      <div className="max-h-[200px] overflow-y-auto divide-y divide-border-subtle">
        {edges.map(({ edge, node, direction }) => (
          <div key={edge.id} className="flex items-center gap-2 px-3 py-2 text-[12px]">
            <span className="text-text-dim shrink-0">
              {direction === 'outbound' ? '\u2192' : '\u2190'}
            </span>
            <span className="text-text-secondary font-medium uppercase text-[10px] tracking-wide shrink-0">
              {getEdgeLabel(edge.type as EdgeType, direction)}
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <TypeBadge type={node.type as NodeType} />
              <span className="text-text-primary truncate">{node.name}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
