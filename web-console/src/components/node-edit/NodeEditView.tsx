import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchNodeEditDetail } from '@/api/nodes'
import { useFullNodeEdit } from '@/hooks/useFullNodeEdit'
import { usePanelStack } from '@/hooks/usePanelStack'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { DeleteNodeDialog } from '@/components/delete-node/DeleteNodeDialog'
import { NodeEditHeader } from './NodeEditHeader'
import { NodeEditForm } from './NodeEditForm'
import { NodeEditContext } from './NodeEditContext'
import type { NodeType } from '@/lib/types'

export function NodeEditView() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const navigate = useNavigate()
  const panelStack = usePanelStack()

  // Close any open panels on mount
  useEffect(() => {
    panelStack.closeAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, error } = useQuery({
    queryKey: ['node-edit', nodeId],
    queryFn: () => fetchNodeEditDetail(nodeId!),
    enabled: !!nodeId,
    staleTime: 5 * 60 * 1000,
  })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const edit = useFullNodeEdit({
    nodeId: nodeId!,
    node: data?.node,
  })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingState message="Loading node..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <ErrorState message={(error as Error)?.message ?? 'Node not found'} />
      </div>
    )
  }

  const { node, outbound, inbound } = data

  return (
    <div className="h-full flex flex-col">
      <NodeEditHeader
        name={node.name}
        type={node.type as NodeType}
        isDirty={edit.isDirty}
      />

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: form */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {edit.draft && (
            <NodeEditForm
              node={node}
              draft={edit.draft}
              onDraftChange={edit.updateDraft}
              onPropsChange={edit.updateProps}
              fieldErrors={edit.fieldErrors}
              onBlur={edit.validateField}
              isSaving={edit.isSaving}
            />
          )}
        </div>

        {/* Right column: context (hidden below lg) */}
        <div className="hidden lg:block w-[380px] shrink-0 border-l border-border-default overflow-y-auto p-6">
          <NodeEditContext node={node} outbound={outbound} inbound={inbound} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-border-default bg-surface-1 shrink-0">
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="px-4 py-2 rounded text-[12px] text-impact-breaking hover:bg-impact-breaking/10 transition-colors"
        >
          Delete Node
        </button>
        <span className="flex-1" />
        {edit.saveError && (
          <span className="text-[12px] text-impact-breaking mr-2">{edit.saveError}</span>
        )}
        <button
          onClick={() => navigate(-1)}
          disabled={edit.isSaving}
          className="px-4 py-2 rounded text-[12px] bg-surface-2 border border-border-default text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={edit.save}
          disabled={edit.isSaving || !edit.isDirty}
          className="px-5 py-2 rounded text-[12px] font-medium bg-node-screen text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {edit.isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <DeleteNodeDialog
        isOpen={deleteDialogOpen}
        node={data.node}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleted={() => {
          setDeleteDialogOpen(false)
          navigate('/')
        }}
      />
    </div>
  )
}
