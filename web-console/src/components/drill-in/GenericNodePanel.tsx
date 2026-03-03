import { useQuery } from '@tanstack/react-query'
import { fetchNode, fetchNodeEdges, fetchNodesBatch } from '@/api/nodes'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { NodePill } from '@/components/shared/NodePill'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { getEdgeLabel } from '@/lib/edge-labels'
import type { PanelEntry } from '@/hooks/usePanelStack'
import type { Node, Edge, EdgeType, NodeType } from '@/lib/types'

interface GenericNodePanelProps {
  nodeId: string
  onDrillIn: (entry: PanelEntry) => void
}

/**
 * Generic panel that works for any node type.
 * Shows the node's properties and all connected nodes grouped by edge type.
 */
export function GenericNodePanel({ nodeId, onDrillIn }: GenericNodePanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['generic-panel', nodeId],
    queryFn: () => fetchGenericDetail(nodeId),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <LoadingState message="Loading..." />
  if (error) return <ErrorState message={(error as Error).message} />
  if (!data) return null

  const { node, outbound, inbound } = data

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[16px] font-semibold text-text-primary">{node.name}</h2>
          <TypeBadge type={node.type as NodeType} />
        </div>
        {node.description && (
          <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">{node.description}</p>
        )}
        {/* Props */}
        {Object.keys(node.props).length > 0 && (
          <div className="mt-3 space-y-1">
            {Object.entries(node.props).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[11px]">
                <span className="text-text-dim font-medium min-w-[100px]">{key}</span>
                <span className="text-text-secondary font-mono">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outbound connections */}
      {outbound.length > 0 && (
        <div className="space-y-1">
          {groupByEdgeType(outbound, 'outbound').map(({ edgeType, label, nodes }) => (
            <ExpandableSection
              key={`out-${edgeType}`}
              id={`generic-out-${edgeType}`}
              title={label}
              count={nodes.length}
            >
              <div className="space-y-0.5">
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    className="py-1 px-2 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() => onDrillIn({ nodeId: n.id, nodeType: n.type, label: n.name })}
                  >
                    <NodePill id={n.id} name={n.name} type={n.type as NodeType} />
                  </div>
                ))}
              </div>
            </ExpandableSection>
          ))}
        </div>
      )}

      {/* Inbound connections */}
      {inbound.length > 0 && (
        <div className="space-y-1 mt-2">
          {groupByEdgeType(inbound, 'inbound').map(({ edgeType, label, nodes }) => (
            <ExpandableSection
              key={`in-${edgeType}`}
              id={`generic-in-${edgeType}`}
              title={label}
              count={nodes.length}
            >
              <div className="space-y-0.5">
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    className="py-1 px-2 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() => onDrillIn({ nodeId: n.id, nodeType: n.type, label: n.name })}
                  >
                    <NodePill id={n.id} name={n.name} type={n.type as NodeType} />
                  </div>
                ))}
              </div>
            </ExpandableSection>
          ))}
        </div>
      )}
    </div>
  )
}

interface GenericDetail {
  node: Node
  outbound: { edge: Edge; node: Node }[]
  inbound: { edge: Edge; node: Node }[]
}

async function fetchGenericDetail(nodeId: string): Promise<GenericDetail> {
  const [node, edges] = await Promise.all([
    fetchNode(nodeId),
    fetchNodeEdges(nodeId),
  ])

  const connectedIds = new Set<string>()
  for (const e of edges) {
    if (e.in !== nodeId) connectedIds.add(e.in)
    if (e.out !== nodeId) connectedIds.add(e.out)
  }

  const connected = connectedIds.size > 0
    ? await fetchNodesBatch(Array.from(connectedIds))
    : []
  const nodeMap = new Map(connected.map((n) => [n.id, n]))

  const outbound: GenericDetail['outbound'] = []
  const inbound: GenericDetail['inbound'] = []

  for (const edge of edges) {
    if (edge.in === nodeId && nodeMap.has(edge.out)) {
      outbound.push({ edge, node: nodeMap.get(edge.out)! })
    } else if (edge.out === nodeId && nodeMap.has(edge.in)) {
      inbound.push({ edge, node: nodeMap.get(edge.in)! })
    }
  }

  return { node, outbound, inbound }
}

function groupByEdgeType(
  items: { edge: Edge; node: Node }[],
  direction: 'outbound' | 'inbound',
) {
  const groups = new Map<string, { edgeType: string; label: string; nodes: Node[] }>()
  for (const { edge, node } of items) {
    if (!groups.has(edge.type)) {
      groups.set(edge.type, {
        edgeType: edge.type,
        label: getEdgeLabel(edge.type as EdgeType, direction),
        nodes: [],
      })
    }
    groups.get(edge.type)!.nodes.push(node)
  }
  return Array.from(groups.values())
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.join(', ')
  return JSON.stringify(value)
}
