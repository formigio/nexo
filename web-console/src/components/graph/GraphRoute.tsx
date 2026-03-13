import { useState, useRef, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchGraph } from '@/api/graph'
import { fetchTraversal } from '@/api/traversal'
import { fetchFeatureScope } from '@/api/features'
import { deleteEdgeApi } from '@/api/edges'
import { ForceGraph } from '@/components/shared/ForceGraph'
import { GraphContextMenu } from './GraphContextMenu'
import { CreateEdgeDialog } from '@/components/create-edge/CreateEdgeDialog'
import { DeleteNodeDialog } from '@/components/delete-node/DeleteNodeDialog'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { useToast } from '@/hooks/useToast'
import type { ForceGraphHandle } from '@/components/shared/ForceGraph'
import type { Node, NodeType } from '@/lib/types'
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/constants'

const ALL_NODE_TYPES: NodeType[] = [
  'Feature',
  'Screen',
  'APIEndpoint',
  'BusinessRule',
  'Component',
  'DataEntity',
  'DataField',
  'UserAction',
  'UserState',
  'InfraResource',
  'SourceFile',
]

const DEFAULT_HIDDEN: Set<NodeType> = new Set(['SourceFile'])

interface GraphRouteProps {
  app: string
}

interface ContextMenuState {
  node: Node
  position: { x: number; y: number }
}

export function GraphRoute({ app }: GraphRouteProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const nodeId = searchParams.get('node')
  const featureId = searchParams.get('feature')
  const graphRef = useRef<ForceGraphHandle>(null)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [edgeDialogNode, setEdgeDialogNode] = useState<Node | null>(null)
  const [deleteDialogNode, setDeleteDialogNode] = useState<Node | null>(null)

  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(
    () => new Set(ALL_NODE_TYPES.filter((t) => !DEFAULT_HIDDEN.has(t))),
  )

  // Determine context + fetch
  const contextLabel = nodeId
    ? `Node: ${nodeId}`
    : featureId
      ? `Feature: ${featureId}`
      : 'Full Graph'

  const { data, isLoading, error } = useQuery({
    queryKey: ['graph-view', nodeId, featureId, app],
    queryFn: async () => {
      if (nodeId) {
        const result = await fetchTraversal(nodeId, { depth: 2 })
        return { nodes: result.nodes, edges: result.edges, highlightId: nodeId }
      }
      if (featureId) {
        const result = await fetchFeatureScope(featureId)
        return {
          nodes: [result.feature, ...result.members],
          edges: [...result.edges, ...result.belongsToEdges],
          highlightId: featureId,
        }
      }
      const result = await fetchGraph(app)
      return { nodes: result.nodes, edges: result.edges, highlightId: undefined }
    },
    staleTime: 60_000,
  })

  const toggleType = (type: NodeType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // Count types in data
  const typeCounts = useMemo(() => {
    const counts = new Map<NodeType, number>()
    data?.nodes.forEach((n: Node) => counts.set(n.type, (counts.get(n.type) || 0) + 1))
    return counts
  }, [data])

  const canGoBack = !!(nodeId || featureId)

  const handleNodeClick = useCallback((node: Node, position: { x: number; y: number }) => {
    setContextMenu({ node, position })
  }, [])

  const handleDrillDown = useCallback(() => {
    if (!contextMenu) return
    setSearchParams({ node: contextMenu.node.id })
    setContextMenu(null)
  }, [contextMenu, setSearchParams])

  const handleGoBack = useCallback(() => {
    navigate(-1)
    setContextMenu(null)
  }, [navigate])

  const handleNavigate = useCallback(() => {
    if (!contextMenu) return
    const { node } = contextMenu
    if (node.type === 'Screen') {
      navigate(`/screens/${node.id}`)
    } else if (node.type === 'Feature') {
      navigate(`/features/${node.id}`)
    } else {
      navigate(`/?panel=${encodeURIComponent(`${node.id}:${node.type}:${node.name}`)}`)
    }
    setContextMenu(null)
  }, [contextMenu, navigate])

  const handleDismiss = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleEditNode = useCallback(() => {
    if (!contextMenu) return
    navigate(`/nodes/${contextMenu.node.id}/edit`)
    setContextMenu(null)
  }, [contextMenu, navigate])

  const handleAddEdge = useCallback(() => {
    if (!contextMenu) return
    setEdgeDialogNode(contextMenu.node)
    setContextMenu(null)
  }, [contextMenu])

  const handleDeleteNode = useCallback(() => {
    if (!contextMenu) return
    setDeleteDialogNode(contextMenu.node)
    setContextMenu(null)
  }, [contextMenu])

  const handleEdgeDelete = useCallback(
    async (edgeId: string) => {
      try {
        await deleteEdgeApi(edgeId)
        toast.success('Edge deleted')
        queryClient.invalidateQueries({ queryKey: ['graph-view'] })
      } catch (err) {
        toast.error((err as Error).message || 'Failed to delete edge')
      }
    },
    [queryClient, toast],
  )

  if (isLoading) return <LoadingState message="Loading graph..." />
  if (error) return <ErrorState message={(error as Error).message} />
  if (!data) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-default shrink-0 overflow-x-auto">
        <span className="text-[13px] font-medium text-text-primary shrink-0">
          {contextLabel}
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {ALL_NODE_TYPES.map((type) => {
            const count = typeCounts.get(type) || 0
            if (count === 0) return null
            const isActive = activeTypes.has(type)
            const color = NODE_TYPE_COLORS[type]
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors"
                style={{
                  color,
                  borderColor: isActive ? color : 'transparent',
                  backgroundColor: isActive ? color + '18' : 'transparent',
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: color }}
                />
                {NODE_TYPE_LABELS[type]} {count}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => graphRef.current?.fitView()}
          className="ml-auto shrink-0 px-2 py-1 text-[11px] font-medium rounded bg-surface-2 border border-border-default text-text-secondary hover:text-text-primary transition-colors"
        >
          Fit View
        </button>
      </div>

      {/* Graph area */}
      <div className="flex-1 overflow-hidden relative">
        <ForceGraph
          ref={graphRef}
          nodes={data.nodes}
          edges={data.edges}
          highlightNodeId={data.highlightId}
          activeTypes={activeTypes}
          onNodeClick={handleNodeClick}
          onEdgeDelete={handleEdgeDelete}
        />
        {contextMenu && (
          <GraphContextMenu
            node={contextMenu.node}
            position={contextMenu.position}
            canGoBack={canGoBack}
            onDrillDown={handleDrillDown}
            onGoBack={handleGoBack}
            onNavigate={handleNavigate}
            onEditNode={handleEditNode}
            onAddEdge={handleAddEdge}
            onDeleteNode={handleDeleteNode}
            onDismiss={handleDismiss}
          />
        )}
      </div>

      <CreateEdgeDialog
        isOpen={!!edgeDialogNode}
        sourceNode={edgeDialogNode}
        onClose={() => setEdgeDialogNode(null)}
        onEdgeCreated={() => {
          setEdgeDialogNode(null)
          queryClient.invalidateQueries({ queryKey: ['graph-view'] })
        }}
      />

      <DeleteNodeDialog
        isOpen={!!deleteDialogNode}
        node={deleteDialogNode}
        onClose={() => setDeleteDialogNode(null)}
        onDeleted={() => {
          setDeleteDialogNode(null)
          queryClient.invalidateQueries({ queryKey: ['graph-view'] })
        }}
      />
    </div>
  )
}
