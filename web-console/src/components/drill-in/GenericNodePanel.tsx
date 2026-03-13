import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNodeEditDetail, groupByEdgeType } from '@/api/nodes'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { NodePill } from '@/components/shared/NodePill'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { DeletableEdgeRow } from '@/components/shared/DeletableEdgeRow'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { useNodeEdit } from '@/hooks/useNodeEdit'
import { usePanelStack } from '@/hooks/usePanelStack'
import { NodeActionRow } from './NodeActionRow'
import { PanelEditForm } from './PanelEditForm'
import { CreateEdgeDialog } from '@/components/create-edge/CreateEdgeDialog'
import { DeleteNodeDialog } from '@/components/delete-node/DeleteNodeDialog'
import type { PanelEntry } from '@/hooks/usePanelStack'
import type { NodeType } from '@/lib/types'

interface GenericNodePanelProps {
  nodeId: string
  onDrillIn: (entry: PanelEntry) => void
}

/**
 * Generic panel that works for any node type.
 * Shows the node's properties and all connected nodes grouped by edge type.
 */
export function GenericNodePanel({ nodeId, onDrillIn }: GenericNodePanelProps) {
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const panelStack = usePanelStack()
  const queryClient = useQueryClient()

  const handleEdgeDeleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['generic-panel', nodeId] })
  }, [queryClient, nodeId])

  const { data, isLoading, error } = useQuery({
    queryKey: ['generic-panel', nodeId],
    queryFn: () => fetchNodeEditDetail(nodeId),
    staleTime: 5 * 60 * 1000,
  })

  const edit = useNodeEdit({
    nodeId,
    node: data?.node,
    queryKeysToUpdate: [['generic-panel', nodeId]],
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
        {node.description && edit.panelMode === 'view' && (
          <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">{node.description}</p>
        )}
        {/* Props */}
        {edit.panelMode === 'view' && Object.keys(node.props).length > 0 && (
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

      {/* Action row / Edit form */}
      {edit.panelMode === 'view' ? (
        <NodeActionRow onEdit={edit.enterEdit} onAddEdge={() => setEdgeDialogOpen(true)} onDelete={() => setDeleteDialogOpen(true)} />
      ) : edit.draft ? (
        <PanelEditForm
          nodeId={nodeId}
          draft={edit.draft}
          onChange={edit.updateDraft}
          onSave={edit.save}
          onCancel={edit.handleCancel}
          isSaving={edit.isSaving}
          error={edit.saveError}
          isDirty={edit.isDirty}
          showDiscardPrompt={edit.showDiscardPrompt}
          onConfirmDiscard={edit.confirmDiscard}
          onCancelDiscard={edit.cancelDiscard}
        />
      ) : null}

      {/* Outbound connections */}
      {outbound.length > 0 && (
        <div className="space-y-1">
          {groupByEdgeType(outbound, 'outbound').map(({ edgeType, label, items }) => (
            <ExpandableSection
              key={`out-${edgeType}`}
              id={`generic-out-${edgeType}`}
              title={label}
              count={items.length}
            >
              <div className="space-y-0.5">
                {items.map(({ edge, node: n }) => (
                  <DeletableEdgeRow key={edge.id} edge={edge} panelNodeId={nodeId} onDeleted={handleEdgeDeleted}>
                    <div
                      className="py-1 px-2 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                      onClick={() => onDrillIn({ nodeId: n.id, nodeType: n.type, label: n.name })}
                    >
                      <NodePill id={n.id} name={n.name} type={n.type as NodeType} />
                    </div>
                  </DeletableEdgeRow>
                ))}
              </div>
            </ExpandableSection>
          ))}
        </div>
      )}

      {/* Inbound connections */}
      {inbound.length > 0 && (
        <div className="space-y-1 mt-2">
          {groupByEdgeType(inbound, 'inbound').map(({ edgeType, label, items }) => (
            <ExpandableSection
              key={`in-${edgeType}`}
              id={`generic-in-${edgeType}`}
              title={label}
              count={items.length}
            >
              <div className="space-y-0.5">
                {items.map(({ edge, node: n }) => (
                  <DeletableEdgeRow key={edge.id} edge={edge} panelNodeId={nodeId} onDeleted={handleEdgeDeleted}>
                    <div
                      className="py-1 px-2 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                      onClick={() => onDrillIn({ nodeId: n.id, nodeType: n.type, label: n.name })}
                    >
                      <NodePill id={n.id} name={n.name} type={n.type as NodeType} />
                    </div>
                  </DeletableEdgeRow>
                ))}
              </div>
            </ExpandableSection>
          ))}
        </div>
      )}

      <CreateEdgeDialog
        isOpen={edgeDialogOpen}
        sourceNode={data.node}
        onClose={() => setEdgeDialogOpen(false)}
        onEdgeCreated={() => setEdgeDialogOpen(false)}
      />

      <DeleteNodeDialog
        isOpen={deleteDialogOpen}
        node={data.node}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={() => {
          setDeleteDialogOpen(false)
          panelStack.pop()
        }}
      />
    </div>
  )
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.join(', ')
  return JSON.stringify(value)
}
