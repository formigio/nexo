import type { QueryResult } from '@/hooks/useQueryExecution'
import type { Node } from '@/lib/types'
import { ForceGraph } from '@/components/shared/ForceGraph'

interface GraphViewProps {
  result: QueryResult
  onNodeClick: (node: Node) => void
}

export function GraphView({ result, onNodeClick }: GraphViewProps) {
  if (result.edges.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-[13px]">
        No edges to visualize — try a query that returns connected nodes.
      </div>
    )
  }

  return (
    <ForceGraph
      nodes={result.allNodes}
      edges={result.edges}
      highlightNodeId={result.startNode?.id}
      onNodeClick={(node) => onNodeClick(node)}
    />
  )
}
