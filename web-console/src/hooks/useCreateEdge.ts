import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEdgeApi } from '@/api/edges'
import { useToast } from '@/hooks/useToast'
import { getEdgeLabel } from '@/lib/edge-labels'
import type { Node, Edge, EdgeType } from '@/lib/types'

interface CreateEdgeDraft {
  edgeType: EdgeType | null
  targetNode: Node | null
}

interface UseCreateEdgeOptions {
  sourceNode: Node | null
  onSuccess: (edge: Edge) => void
  onClose: () => void
}

function emptyDraft(): CreateEdgeDraft {
  return { edgeType: null, targetNode: null }
}

export function useCreateEdge({ sourceNode, onSuccess, onClose }: UseCreateEdgeOptions) {
  const [draft, setDraft] = useState<CreateEdgeDraft>(emptyDraft())
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const setEdgeType = useCallback((edgeType: EdgeType | null) => {
    setDraft({ edgeType, targetNode: null })
    setShowDiscardPrompt(false)
  }, [])

  const setTargetNode = useCallback((targetNode: Node | null) => {
    setDraft((prev) => ({ ...prev, targetNode }))
    setShowDiscardPrompt(false)
  }, [])

  const isDirty = draft.edgeType !== null || draft.targetNode !== null

  const canSubmit = draft.edgeType !== null && draft.targetNode !== null && sourceNode !== null

  const mutation = useMutation({
    mutationFn: (d: { edgeType: EdgeType; from: string; to: string }) =>
      createEdgeApi({ type: d.edgeType, from: d.from, to: d.to }),
    onSuccess: (edge) => {
      const sourceId = sourceNode?.id
      if (sourceId) {
        queryClient.invalidateQueries({ queryKey: ['generic-panel', sourceId] })
        queryClient.invalidateQueries({ queryKey: ['node-edit', sourceId] })
        queryClient.invalidateQueries({ queryKey: ['component-detail', sourceId] })
      }
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })

      const label = draft.edgeType ? getEdgeLabel(draft.edgeType, 'outbound') : ''
      toast.success(`${sourceNode?.name} ${label} ${draft.targetNode?.name}`)

      onSuccess(edge)
    },
    onError: (_err: Error) => {
      // Error displayed in dialog via submitError
    },
  })

  const submit = useCallback(() => {
    if (!canSubmit) return
    mutation.mutate({
      edgeType: draft.edgeType!,
      from: sourceNode!.id,
      to: draft.targetNode!.id,
    })
  }, [canSubmit, draft, sourceNode, mutation])

  const reset = useCallback(() => {
    setDraft(emptyDraft())
    setShowDiscardPrompt(false)
    mutation.reset()
  }, [mutation])

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardPrompt(true)
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  const confirmDiscard = useCallback(() => {
    setShowDiscardPrompt(false)
    onClose()
  }, [onClose])

  const cancelDiscard = useCallback(() => {
    setShowDiscardPrompt(false)
  }, [])

  // Escape key handler — capture phase
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        handleClose()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [handleClose])

  return {
    draft,
    setEdgeType,
    setTargetNode,
    isDirty,
    canSubmit,
    submit,
    isSubmitting: mutation.isPending,
    submitError: mutation.error?.message ?? null,
    handleClose,
    showDiscardPrompt,
    confirmDiscard,
    cancelDiscard,
    reset,
  }
}
