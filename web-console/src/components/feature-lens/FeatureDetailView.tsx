import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchFeatureScope } from '@/api/features'
import { LoadingState } from '@/components/shared/LoadingState'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { NODE_TYPE_PLURALS, NODE_TYPE_COLORS } from '@/lib/constants'
import { getEdgeLabel } from '@/lib/edge-labels'
import type { Node, Edge, FeatureProps, NodeType, EdgeType } from '@/lib/types'
import { ScopeOverview } from './ScopeOverview'

// Display order for node type sections
const SECTION_ORDER: NodeType[] = [
  'Screen', 'Component', 'UserAction', 'APIEndpoint',
  'DataEntity', 'DataField', 'BusinessRule', 'UserState',
  'InfraResource', 'SourceFile',
]

const STATUS_COLORS: Record<string, string> = {
  deployed: '#3fb950',
  'in-progress': '#ffa657',
  proposed: '#8b949e',
  deprecated: '#6e7681',
}

interface FeatureDetailViewProps {
  onDrillIn: (nodeId: string, nodeType: string, label: string) => void
}

export function FeatureDetailView({ onDrillIn }: FeatureDetailViewProps) {
  const { featureId } = useParams<{ featureId: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['feature-scope', featureId],
    queryFn: () => fetchFeatureScope(featureId!),
    enabled: !!featureId,
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingState message="Loading feature scope..." />
  if (error) {
    return (
      <div className="p-6 text-[13px] text-red-400">
        Error: {error instanceof Error ? error.message : 'Failed to load feature'}
      </div>
    )
  }
  if (!data) return null

  const { feature, members, edges } = data
  const props = feature.props as FeatureProps
  const status = props.status ?? 'proposed'
  const statusColor = STATUS_COLORS[status] ?? '#8b949e'

  // Group members by type
  const grouped = new Map<NodeType, Node[]>()
  for (const m of members) {
    const list = grouped.get(m.type) ?? []
    list.push(m)
    grouped.set(m.type, list)
  }

  // Build edge lookup for showing connections in node rows
  const edgesByNode = new Map<string, Edge[]>()
  for (const e of edges) {
    for (const nid of [e.in, e.out]) {
      const list = edgesByNode.get(nid) ?? []
      list.push(e)
      edgesByNode.set(nid, list)
    }
  }

  // Build node lookup
  const nodeMap = new Map<string, Node>()
  nodeMap.set(feature.id, feature)
  for (const m of members) nodeMap.set(m.id, m)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back link */}
      <a
        href="/features"
        className="inline-flex items-center gap-1.5 text-[12px] text-text-dim hover:text-text-secondary transition-colors mb-4"
      >
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M7.5 10l-4-4 4-4" />
        </svg>
        Features
      </a>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {props.featureId && (
              <span className="text-[12px] text-text-dim font-mono">{props.featureId}</span>
            )}
            <h1 className="text-[20px] font-semibold text-text-primary">{feature.name}</h1>
          </div>
          {feature.description && (
            <p className="text-[13px] text-text-secondary leading-relaxed mt-1">{feature.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {props.priority && (
            <span className="text-[11px] font-semibold text-text-dim bg-surface-2 px-2 py-0.5 rounded">
              {props.priority}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium uppercase tracking-wide"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            {status.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Scope overview */}
      <ScopeOverview grouped={grouped} />

      {/* Node sections */}
      <div className="mt-6 flex flex-col gap-4">
        {SECTION_ORDER.map((type) => {
          const nodes = grouped.get(type)
          if (!nodes || nodes.length === 0) return null
          return (
            <ExpandableSection
              key={type}
              id={`feature-${type}`}
              title={NODE_TYPE_PLURALS[type]}
              count={nodes.length}
              defaultExpanded={true}
            >
              <div className="flex flex-col gap-1">
                {nodes.map((node) => (
                  <NodeRow
                    key={node.id}
                    node={node}
                    edges={edgesByNode.get(node.id) ?? []}
                    nodeMap={nodeMap}
                    onDrillIn={onDrillIn}
                  />
                ))}
              </div>
            </ExpandableSection>
          )
        })}
      </div>
    </div>
  )
}

function NodeRow({
  node,
  edges,
  nodeMap,
  onDrillIn,
}: {
  node: Node
  edges: Edge[]
  nodeMap: Map<string, Node>
  onDrillIn: (nodeId: string, nodeType: string, label: string) => void
}) {
  // Find notable connections to show inline
  const connections: { label: string; targetName: string; targetType: NodeType }[] = []
  for (const e of edges) {
    const isOutbound = e.in === node.id
    const targetId = isOutbound ? e.out : e.in
    const target = nodeMap.get(targetId)
    if (target && target.type !== 'Feature') {
      connections.push({
        label: getEdgeLabel(e.type as EdgeType, isOutbound ? 'outbound' : 'inbound'),
        targetName: target.name,
        targetType: target.type,
      })
    }
  }

  return (
    <button
      onClick={() => onDrillIn(node.id, node.type, node.name)}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded hover:bg-white/[0.04] transition-colors group"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: NODE_TYPE_COLORS[node.type] }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-primary font-medium truncate">{node.name}</span>
          {node.description && (
            <span className="text-[11px] text-text-dim truncate hidden group-hover:inline">
              {node.description}
            </span>
          )}
        </div>
        {connections.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {connections.slice(0, 3).map((c, i) => (
              <span key={i} className="text-[11px] text-text-dim">
                {c.label}{' '}
                <span style={{ color: NODE_TYPE_COLORS[c.targetType] }}>{c.targetName}</span>
              </span>
            ))}
            {connections.length > 3 && (
              <span className="text-[11px] text-text-dim">+{connections.length - 3} more</span>
            )}
          </div>
        )}
      </div>
      <svg
        className="w-3 h-3 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M4.5 2l4 4-4 4" />
      </svg>
    </button>
  )
}
