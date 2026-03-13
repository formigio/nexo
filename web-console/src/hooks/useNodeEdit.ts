import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNodeApi } from '@/api/nodes'
import { useToast } from '@/hooks/useToast'
import type { Node } from '@/lib/types'
import type { EditDraft } from '@/components/drill-in/PanelEditForm'

interface UseNodeEditOptions {
  nodeId: string
  node: Node | undefined
  queryKeysToUpdate: unknown[][]
}

type PanelMode =
  | { mode: 'view' }
  | { mode: 'edit'; draft: EditDraft; showDiscardPrompt: boolean }

export function useNodeEdit({ nodeId, node, queryKeysToUpdate }: UseNodeEditOptions) {
  const [panelMode, setPanelMode] = useState<PanelMode>({ mode: 'view' })
  const queryClient = useQueryClient()
  const toast = useToast()

  const getOriginal = useCallback((): EditDraft => ({
    name: node?.name ?? '',
    description: node?.description ?? '',
    tags: node?.tags ?? [],
  }), [node])

  const isDirty = useCallback(() => {
    if (panelMode.mode !== 'edit') return false
    const orig = getOriginal()
    const { draft } = panelMode
    return (
      draft.name !== orig.name ||
      draft.description !== orig.description ||
      JSON.stringify(draft.tags) !== JSON.stringify(orig.tags)
    )
  }, [panelMode, getOriginal])

  const enterEdit = useCallback(() => {
    setPanelMode({ mode: 'edit', draft: getOriginal(), showDiscardPrompt: false })
  }, [getOriginal])

  const updateDraft = useCallback((draft: EditDraft) => {
    setPanelMode((prev) =>
      prev.mode === 'edit' ? { ...prev, draft, showDiscardPrompt: false } : prev,
    )
  }, [])

  const exitEdit = useCallback(() => {
    setPanelMode({ mode: 'view' })
  }, [])

  const mutation = useMutation({
    mutationFn: (draft: EditDraft) =>
      updateNodeApi(nodeId, {
        name: draft.name,
        description: draft.description,
        tags: draft.tags,
      }),
    onSuccess: (updatedNode) => {
      // Direct cache updates for panel queries
      for (const key of queryKeysToUpdate) {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) return old
          // Handle both { node, ... } and direct Node shapes
          if (typeof old === 'object' && old !== null && 'node' in old) {
            return { ...old, node: updatedNode }
          }
          // ComponentDetail shape: { component, ... }
          if (typeof old === 'object' && old !== null && 'component' in old) {
            return { ...old, component: updatedNode }
          }
          return updatedNode
        })
      }
      // Broad invalidation for list/search/graph queries
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      toast.success(`Updated "${updatedNode.name}"`)
      exitEdit()
    },
    onError: (err: Error) => {
      toast.error(`Save failed: ${err.message}`)
    },
  })

  const save = useCallback(() => {
    if (panelMode.mode !== 'edit') return
    mutation.mutate(panelMode.draft)
  }, [panelMode, mutation])

  const handleCancel = useCallback(() => {
    if (panelMode.mode !== 'edit') return
    if (isDirty()) {
      setPanelMode((prev) =>
        prev.mode === 'edit' ? { ...prev, showDiscardPrompt: true } : prev,
      )
    } else {
      exitEdit()
    }
  }, [panelMode, isDirty, exitEdit])

  const confirmDiscard = useCallback(() => exitEdit(), [exitEdit])

  const cancelDiscard = useCallback(() => {
    setPanelMode((prev) =>
      prev.mode === 'edit' ? { ...prev, showDiscardPrompt: false } : prev,
    )
  }, [])

  // Escape key handler — capture phase to prevent SlideInPanel from closing
  useEffect(() => {
    if (panelMode.mode !== 'edit') return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        handleCancel()
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [panelMode.mode, handleCancel])

  return {
    panelMode: panelMode.mode,
    enterEdit,
    draft: panelMode.mode === 'edit' ? panelMode.draft : null,
    updateDraft,
    isDirty: isDirty(),
    save,
    isSaving: mutation.isPending,
    saveError: mutation.error?.message ?? null,
    handleCancel,
    showDiscardPrompt: panelMode.mode === 'edit' ? panelMode.showDiscardPrompt : false,
    confirmDiscard,
    cancelDiscard,
  }
}
