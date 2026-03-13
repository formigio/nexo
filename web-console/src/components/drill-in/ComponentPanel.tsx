import { useState } from 'react'
import { useComponentDetail } from '@/hooks/useComponentDetail'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { NodePill } from '@/components/shared/NodePill'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { useNodeEdit } from '@/hooks/useNodeEdit'
import { usePanelStack } from '@/hooks/usePanelStack'
import { NodeActionRow } from './NodeActionRow'
import { PanelEditForm } from './PanelEditForm'
import { CreateEdgeDialog } from '@/components/create-edge/CreateEdgeDialog'
import { DeleteNodeDialog } from '@/components/delete-node/DeleteNodeDialog'
import type { PanelEntry } from '@/hooks/usePanelStack'
import type { ComponentProps, DataFieldProps, UserActionProps, APIEndpointProps, SourceFileProps, FeatureProps } from '@/lib/types'

interface ComponentPanelProps {
  nodeId: string
  onDrillIn: (entry: PanelEntry) => void
}

export function ComponentPanel({ nodeId, onDrillIn }: ComponentPanelProps) {
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const panelStack = usePanelStack()
  const { data, isLoading, error } = useComponentDetail(nodeId)

  const edit = useNodeEdit({
    nodeId,
    node: data?.component,
    queryKeysToUpdate: [['component-detail', nodeId]],
  })

  if (isLoading) return <LoadingState message="Loading component..." />
  if (error) return <ErrorState message={(error as Error).message} />
  if (!data) return null

  const { component, displays, acceptsInput, triggers, sourceFile, feature } = data
  const props = component.props as ComponentProps

  return (
    <div data-testid="drill-in-component-root" className="p-4">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[16px] font-semibold text-text-primary">{component.name}</h2>
          <TypeBadge type="Component" />
        </div>
        {props.componentType && edit.panelMode === 'view' && (
          <span className="text-[12px] text-text-secondary capitalize">{props.componentType}</span>
        )}
        {component.description && edit.panelMode === 'view' && (
          <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">{component.description}</p>
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

      <div className="space-y-1">
        {/* Displays */}
        {displays.length > 0 && (
          <ExpandableSection
            id="drill-in-component-displays-section"
            title="Displays"
            count={displays.length}
          >
            <div className="space-y-0.5">
              {groupByEntity(displays).map(({ entity, fields }) => (
                <div key={entity?.id ?? 'unknown'} className="mb-2">
                  {entity && (
                    <button
                      onClick={() => onDrillIn({ nodeId: entity.id, nodeType: entity.type, label: entity.name })}
                      className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-node-entity hover:underline"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-node-entity" />
                      {entity.name}
                    </button>
                  )}
                  {fields.map(({ field }) => {
                    const fp = field.props as DataFieldProps
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 py-1 px-2 ml-3 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                        onClick={() => onDrillIn({ nodeId: field.id, nodeType: field.type, label: field.name })}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-node-field" />
                        <span className="text-[12px] text-node-field">{field.name}</span>
                        {fp.fieldType && (
                          <span className="text-[10px] text-text-dim">{fp.fieldType}</span>
                        )}
                        {fp.required && (
                          <span className="text-[10px] text-node-action">required</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Accepts Input */}
        {acceptsInput.length > 0 && (
          <ExpandableSection
            id="drill-in-component-inputs-section"
            title="Accepts Input"
            count={acceptsInput.length}
          >
            <div className="space-y-0.5">
              {groupByEntity(acceptsInput).map(({ entity, fields }) => (
                <div key={entity?.id ?? 'unknown'} className="mb-2">
                  {entity && (
                    <button
                      onClick={() => onDrillIn({ nodeId: entity.id, nodeType: entity.type, label: entity.name })}
                      className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-node-entity hover:underline"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-node-entity" />
                      {entity.name}
                    </button>
                  )}
                  {fields.map(({ field }) => {
                    const fp = field.props as DataFieldProps
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 py-1 px-2 ml-3 rounded hover:bg-white/[0.04] cursor-pointer transition-colors"
                        onClick={() => onDrillIn({ nodeId: field.id, nodeType: field.type, label: field.name })}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-node-field" />
                        <span className="text-[12px] text-node-field">{field.name}</span>
                        {fp.fieldType && (
                          <span className="text-[10px] text-text-dim">{fp.fieldType}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Triggers */}
        {triggers.length > 0 && (
          <ExpandableSection
            id="drill-in-component-triggers-section"
            title="Triggers"
            count={triggers.length}
          >
            <div className="space-y-1">
              {triggers.map(({ action, endpoint }) => {
                const ap = action.props as UserActionProps
                const ep = endpoint?.props as APIEndpointProps | undefined
                return (
                  <div key={action.id} className="py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => onDrillIn({ nodeId: action.id, nodeType: action.type, label: action.name })}
                    >
                      <NodePill id={action.id} name={action.name} type="UserAction" />
                      {ap.actionType && <span className="text-[10px] text-text-dim">{ap.actionType}</span>}
                    </div>
                    {endpoint && (
                      <div
                        className="ml-6 mt-1 flex items-center gap-2 cursor-pointer hover:bg-white/[0.04] rounded px-1 py-0.5"
                        onClick={() => onDrillIn({ nodeId: endpoint.id, nodeType: endpoint.type, label: endpoint.name })}
                      >
                        <span className="text-[10px] text-text-dim">calls</span>
                        <span className="text-[11px] font-mono text-node-api">
                          {ep?.method} {ep?.path}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ExpandableSection>
        )}

        {/* Source File */}
        {sourceFile && (
          <div data-testid="drill-in-component-source-section" className="py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-2">
              Source File
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-2">
              <span className="w-2 h-2 rounded-full bg-node-file shrink-0" />
              <span className="text-[12px] font-mono text-node-file">
                {(sourceFile.props as SourceFileProps).repo && (
                  <span className="text-text-dim">{(sourceFile.props as SourceFileProps).repo}/</span>
                )}
                {(sourceFile.props as SourceFileProps).relativePath}
              </span>
            </div>
          </div>
        )}

        {/* Feature */}
        {feature && (
          <div className="py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-2">
              Feature
            </div>
            <div
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-2 cursor-pointer hover:bg-white/[0.06] transition-colors"
              onClick={() => onDrillIn({ nodeId: feature.id, nodeType: feature.type, label: feature.name })}
            >
              <span className="w-2 h-2 rounded-full bg-node-feature shrink-0" />
              <span className="text-[13px] font-medium text-node-feature">
                {(feature.props as FeatureProps).featureId && (
                  <span className="text-text-dim">{(feature.props as FeatureProps).featureId} </span>
                )}
                {feature.name}
              </span>
            </div>
          </div>
        )}
      </div>

      <CreateEdgeDialog
        isOpen={edgeDialogOpen}
        sourceNode={data.component}
        onClose={() => setEdgeDialogOpen(false)}
        onEdgeCreated={() => setEdgeDialogOpen(false)}
      />

      <DeleteNodeDialog
        isOpen={deleteDialogOpen}
        node={data.component}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={() => {
          setDeleteDialogOpen(false)
          panelStack.pop()
        }}
      />
    </div>
  )
}

function groupByEntity(items: { field: import('@/lib/types').Node; entity: import('@/lib/types').Node | null }[]) {
  const groups = new Map<string, { entity: import('@/lib/types').Node | null; fields: typeof items }>()
  for (const item of items) {
    const key = item.entity?.id ?? '_none'
    if (!groups.has(key)) {
      groups.set(key, { entity: item.entity, fields: [] })
    }
    groups.get(key)!.fields.push(item)
  }
  return Array.from(groups.values())
}
