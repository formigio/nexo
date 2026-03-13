import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchApps } from '@/api/apps'
import { useCreateNode } from '@/hooks/useCreateNode'
import { NodeTypeGrid } from './NodeTypeGrid'
import { TypeSpecificFields } from './TypeSpecificFields'
import { TagInput } from '@/components/shared/TagInput'
import type { Node } from '@/lib/types'

interface CreateNodeDialogProps {
  isOpen: boolean
  defaultApp: string
  onClose: () => void
  onNodeCreated: (node: Node) => void
}

export function CreateNodeDialog({ isOpen, defaultApp, onClose, onNodeCreated }: CreateNodeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const appInputRef = useRef<HTMLInputElement>(null)

  const {
    draft,
    updateDraft,
    updateProps,
    fieldErrors,
    validateField,
    submit,
    isSubmitting,
    submitError,
    handleClose,
    showDiscardPrompt,
    confirmDiscard,
    cancelDiscard,
    reset,
  } = useCreateNode({
    defaultApp,
    onSuccess: onNodeCreated,
    onClose,
  })

  const { data: apps } = useQuery({
    queryKey: ['apps'],
    queryFn: fetchApps,
    enabled: isOpen,
  })

  // Reset form + focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset(defaultApp)
      requestAnimationFrame(() => appInputRef.current?.focus())
    }
  }, [isOpen, defaultApp, reset])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  const nameError = fieldErrors.find((e) => e.field === 'name')?.message
  const appError = fieldErrors.find((e) => e.field === 'app')?.message

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-modal-backdrop" />
      {/* Dialog */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-node-title"
          className="w-[560px] max-w-[calc(100vw-2rem)] max-h-[80vh] bg-surface-1 border border-border-default rounded-lg shadow-2xl flex flex-col animate-modal-enter"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default shrink-0">
            <h2 id="create-node-title" className="text-[14px] font-semibold text-text-primary">
              Create Node
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-text-dim hover:text-text-secondary transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Error banner */}
            {submitError && (
              <div className="px-3 py-2 rounded bg-node-rule/10 border border-node-rule/30 text-[12px] text-node-rule">
                {submitError}
              </div>
            )}

            {/* App field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-text-secondary">
                App<span className="text-node-rule ml-0.5">*</span>
              </label>
              <input
                ref={appInputRef}
                type="text"
                list="create-node-apps"
                value={draft.app}
                onChange={(e) => updateDraft({ app: e.target.value })}
                onBlur={() => validateField('app')}
                className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors"
                placeholder="App name"
              />
              {apps && (
                <datalist id="create-node-apps">
                  {apps.map((a) => (
                    <option key={a.app} value={a.app} />
                  ))}
                </datalist>
              )}
              {appError && <p className="text-[11px] text-node-rule">{appError}</p>}
            </div>

            {/* Type selector */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-text-secondary">
                Type<span className="text-node-rule ml-0.5">*</span>
              </label>
              <NodeTypeGrid
                value={draft.type}
                onChange={(type) => updateDraft({ type, props: {} })}
              />
              {fieldErrors.find((e) => e.field === 'type') && (
                <p className="text-[11px] text-node-rule">Type is required</p>
              )}
            </div>

            {/* Progressive reveal: only show after type is selected */}
            {draft.type && (
              <>
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-secondary">
                    Name<span className="text-node-rule ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    onBlur={() => validateField('name')}
                    disabled={isSubmitting}
                    className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors"
                    placeholder="Node name"
                  />
                  {nameError && <p className="text-[11px] text-node-rule">{nameError}</p>}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-secondary">Description</label>
                  <textarea
                    value={draft.description}
                    onChange={(e) => updateDraft({ description: e.target.value })}
                    disabled={isSubmitting}
                    rows={2}
                    className="w-full px-3 py-2 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors resize-y"
                    placeholder="Optional description"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-text-secondary">Tags</label>
                  <TagInput
                    tags={draft.tags}
                    onChange={(tags) => updateDraft({ tags })}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Type-specific fields */}
                <div className="space-y-3 pt-1 border-t border-border-subtle">
                  <TypeSpecificFields
                    type={draft.type}
                    props={draft.props}
                    onPropsChange={updateProps}
                    fieldErrors={fieldErrors}
                    onBlur={validateField}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sticky footer */}
          <div className="px-5 py-3 border-t border-border-default shrink-0">
            {showDiscardPrompt ? (
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-text-secondary">Discard unsaved changes?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelDiscard}
                    className="px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary rounded border border-border-default hover:border-text-dim transition-colors"
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={confirmDiscard}
                    className="px-3 py-1.5 text-[12px] text-white bg-node-rule rounded hover:opacity-90 transition-opacity"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary rounded border border-border-default hover:border-text-dim transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting || !draft.type}
                  className="px-4 py-1.5 text-[12px] font-medium text-white bg-node-screen rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Node'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
