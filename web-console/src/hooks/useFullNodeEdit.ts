import { useState, useCallback, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { updateNodeApi } from '@/api/nodes'
import { useToast } from '@/hooks/useToast'
import { REQUIRED_PROPS } from '@/lib/validation'
import type { Node, NodeType } from '@/lib/types'

export interface FullEditDraft {
  name: string
  description: string
  tags: string[]
  props: Record<string, unknown>
}

interface FieldError {
  field: string
  message: string
}

interface UseFullNodeEditOptions {
  nodeId: string
  node: Node | undefined
}

function draftFromNode(node: Node): FullEditDraft {
  return {
    name: node.name,
    description: node.description ?? '',
    tags: [...(node.tags ?? [])],
    props: { ...(node.props ?? {}) },
  }
}

export function useFullNodeEdit({ nodeId, node }: UseFullNodeEditOptions) {
  const [draft, setDraft] = useState<FullEditDraft | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const initializedRef = useRef(false)

  // Initialize draft from node data (once on first load or when node changes after reset)
  useEffect(() => {
    if (node && !initializedRef.current) {
      setDraft(draftFromNode(node))
      initializedRef.current = true
    }
  }, [node])

  // Dirty detection
  const isDirty = useCallback(() => {
    if (!draft || !node) return false
    return (
      draft.name !== node.name ||
      draft.description !== (node.description ?? '') ||
      JSON.stringify(draft.tags) !== JSON.stringify(node.tags) ||
      JSON.stringify(draft.props) !== JSON.stringify(node.props)
    )
  }, [draft, node])

  const dirty = isDirty()

  // Browser-level beforeunload guard
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const updateDraft = useCallback((partial: Partial<FullEditDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev))
  }, [])

  const updateProps = useCallback((key: string, value: unknown) => {
    setDraft((prev) => (prev ? { ...prev, props: { ...prev.props, [key]: value } } : prev))
    setFieldErrors((prev) => prev.filter((e) => e.field !== key))
  }, [])

  const validateField = useCallback(
    (field: string) => {
      if (!draft || !node) return
      let error: string | null = null

      if (field === 'name') {
        if (!draft.name.trim()) error = 'Name is required'
      } else {
        const required = REQUIRED_PROPS[node.type as NodeType] ?? []
        if (required.includes(field)) {
          const val = draft.props[field]
          if (val === undefined || val === null || val === '') {
            error = 'This field is required'
          }
        }
      }

      setFieldErrors((prev) => {
        const filtered = prev.filter((e) => e.field !== field)
        return error ? [...filtered, { field, message: error }] : filtered
      })
    },
    [draft, node],
  )

  const validateAll = useCallback((): boolean => {
    if (!draft || !node) return false
    const errors: FieldError[] = []

    if (!draft.name.trim()) errors.push({ field: 'name', message: 'Name is required' })

    const required = REQUIRED_PROPS[node.type as NodeType] ?? []
    for (const prop of required) {
      const val = draft.props[prop]
      if (val === undefined || val === null || val === '') {
        errors.push({ field: prop, message: 'This field is required' })
      }
    }

    setFieldErrors(errors)
    return errors.length === 0
  }, [draft, node])

  const mutation = useMutation({
    mutationFn: (d: FullEditDraft) =>
      updateNodeApi(nodeId, {
        name: d.name,
        description: d.description || undefined,
        tags: d.tags,
        props: Object.keys(d.props).length > 0 ? d.props : undefined,
      }),
    onSuccess: (updatedNode) => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['generic-panel', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['node-edit', nodeId] })
      queryClient.invalidateQueries({ queryKey: ['screen-detail'] })
      queryClient.invalidateQueries({ queryKey: ['apps'] })
      toast.success(`Updated "${updatedNode.name}"`)
      navigate(-1)
    },
    onError: (err: Error) => {
      toast.error(`Save failed: ${err.message}`)
    },
  })

  const save = useCallback(() => {
    if (!draft) return
    if (!validateAll()) return
    mutation.mutate(draft)
  }, [draft, validateAll, mutation])

  const reset = useCallback(() => {
    if (node) {
      setDraft(draftFromNode(node))
      setFieldErrors([])
      mutation.reset()
    }
  }, [node, mutation])

  return {
    draft,
    updateDraft,
    updateProps,
    isDirty: dirty,
    fieldErrors,
    validateField,
    save,
    isSaving: mutation.isPending,
    saveError: mutation.error?.message ?? null,
    reset,
  }
}
