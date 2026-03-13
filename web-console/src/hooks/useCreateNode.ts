import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNodeApi } from '@/api/nodes'
import { useToast } from '@/hooks/useToast'
import { REQUIRED_PROPS } from '@/lib/validation'
import type { Node, NodeType } from '@/lib/types'

interface CreateNodeDraft {
  app: string
  type: NodeType | null
  name: string
  description: string
  tags: string[]
  props: Record<string, unknown>
}

interface FieldError {
  field: string
  message: string
}

interface UseCreateNodeOptions {
  defaultApp: string
  onSuccess: (node: Node) => void
  onClose: () => void
}

function emptyDraft(app: string): CreateNodeDraft {
  return { app, type: null, name: '', description: '', tags: [], props: {} }
}

export function useCreateNode({ defaultApp, onSuccess, onClose }: UseCreateNodeOptions) {
  const [draft, setDraft] = useState<CreateNodeDraft>(emptyDraft(defaultApp))
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([])
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const updateDraft = useCallback((partial: Partial<CreateNodeDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
    setShowDiscardPrompt(false)
  }, [])

  const updateProps = useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, props: { ...prev.props, [key]: value } }))
    // Clear error for this field on change
    setFieldErrors((prev) => prev.filter((e) => e.field !== key))
  }, [])

  const isDirty = draft.name !== '' || draft.description !== '' || draft.type !== null || draft.tags.length > 0 || Object.keys(draft.props).length > 0

  const validateField = useCallback(
    (field: string): string | null => {
      if (field === 'name') {
        if (!draft.name.trim()) return 'Name is required'
        return null
      }
      if (field === 'type') {
        if (!draft.type) return 'Type is required'
        return null
      }
      // Check type-specific required props
      if (draft.type) {
        const required = REQUIRED_PROPS[draft.type] ?? []
        if (required.includes(field)) {
          const val = draft.props[field]
          if (val === undefined || val === null || val === '') {
            return 'This field is required'
          }
        }
      }
      return null
    },
    [draft],
  )

  const handleBlur = useCallback(
    (field: string) => {
      const error = validateField(field)
      setFieldErrors((prev) => {
        const filtered = prev.filter((e) => e.field !== field)
        return error ? [...filtered, { field, message: error }] : filtered
      })
    },
    [validateField],
  )

  const validateAll = useCallback((): boolean => {
    const errors: FieldError[] = []

    if (!draft.type) errors.push({ field: 'type', message: 'Type is required' })
    if (!draft.name.trim()) errors.push({ field: 'name', message: 'Name is required' })
    if (!draft.app.trim()) errors.push({ field: 'app', message: 'App is required' })

    if (draft.type) {
      const required = REQUIRED_PROPS[draft.type] ?? []
      for (const prop of required) {
        const val = draft.props[prop]
        if (val === undefined || val === null || val === '') {
          errors.push({ field: prop, message: 'This field is required' })
        }
      }
    }

    setFieldErrors(errors)
    return errors.length === 0
  }, [draft])

  const mutation = useMutation({
    mutationFn: (d: CreateNodeDraft) =>
      createNodeApi({
        type: d.type!,
        app: d.app,
        name: d.name,
        description: d.description || undefined,
        tags: d.tags.length > 0 ? d.tags : undefined,
        props: Object.keys(d.props).length > 0 ? d.props : undefined,
      }),
    onSuccess: (node) => {
      queryClient.invalidateQueries({ queryKey: ['node-list'] })
      queryClient.invalidateQueries({ queryKey: ['nodes'] })
      queryClient.invalidateQueries({ queryKey: ['graph'] })
      queryClient.invalidateQueries({ queryKey: ['apps'] })
      queryClient.invalidateQueries({ queryKey: ['screens'] })
      onSuccess(node)
    },
    onError: (err: Error) => {
      toast.error(`Create failed: ${err.message}`)
    },
  })

  const submit = useCallback(() => {
    if (!validateAll()) return
    mutation.mutate(draft)
  }, [draft, validateAll, mutation])

  const reset = useCallback(
    (app?: string) => {
      setDraft(emptyDraft(app ?? defaultApp))
      setFieldErrors([])
      setShowDiscardPrompt(false)
      mutation.reset()
    },
    [defaultApp, mutation],
  )

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
    updateDraft,
    updateProps,
    fieldErrors,
    validateField: handleBlur,
    isDirty,
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
