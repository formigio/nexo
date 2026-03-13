import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useCreateEdge } from '@/hooks/useCreateEdge'
import { getValidEdgeTypes, getValidTargetTypes } from '@/lib/edge-constraints'
import { getEdgeLabel } from '@/lib/edge-labels'

import { TypeBadge } from '@/components/shared/TypeBadge'
import { TargetNodePicker } from './TargetNodePicker'
import type { Node, Edge, EdgeType, NodeType } from '@/lib/types'

interface CreateEdgeDialogProps {
  isOpen: boolean
  sourceNode: Node | null
  onClose: () => void
  onEdgeCreated: (edge: Edge) => void
}

export function CreateEdgeDialog({ isOpen, sourceNode, onClose, onEdgeCreated }: CreateEdgeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  const {
    draft,
    setEdgeType,
    setTargetNode,
    canSubmit,
    submit,
    isSubmitting,
    submitError,
    handleClose,
    showDiscardPrompt,
    confirmDiscard,
    cancelDiscard,
    reset,
  } = useCreateEdge({
    sourceNode,
    onSuccess: onEdgeCreated,
    onClose,
  })

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

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

  if (!isOpen || !sourceNode) return null

  const validEdgeTypes = getValidEdgeTypes(sourceNode.type as NodeType)
  const validTargetTypes = draft.edgeType ? getValidTargetTypes(draft.edgeType) : []

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
          aria-labelledby="create-edge-title"
          className="w-[560px] max-w-[calc(100vw-2rem)] max-h-[80vh] bg-surface-1 border border-border-default rounded-lg shadow-2xl flex flex-col animate-modal-enter"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default shrink-0">
            <h2 id="create-edge-title" className="text-[14px] font-semibold text-text-primary">
              Add Edge
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

            {/* Source node (read-only) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-text-secondary">From</label>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-2 border border-border-default opacity-75">
                <TypeBadge type={sourceNode.type} />
                <span className="text-[12px] text-text-primary">{sourceNode.name}</span>
              </div>
            </div>

            {/* Edge type selector */}
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-text-secondary">
                Edge Type<span className="text-node-rule ml-0.5">*</span>
              </label>
              <select
                value={draft.edgeType ?? ''}
                onChange={(e) => setEdgeType((e.target.value || null) as EdgeType | null)}
                disabled={isSubmitting}
                className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary focus:outline-none focus:border-node-screen transition-colors disabled:opacity-50 appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%238b949e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  paddingRight: '28px',
                }}
              >
                <option value="">Select edge type...</option>
                {validEdgeTypes.map((et) => (
                  <option key={et} value={et}>
                    {et} — {getEdgeLabel(et, 'outbound')}
                  </option>
                ))}
              </select>
            </div>

            {/* Target node picker — progressive reveal */}
            {draft.edgeType && (
              <TargetNodePicker
                allowedTypes={validTargetTypes}
                app={sourceNode.app}
                value={draft.targetNode}
                onChange={setTargetNode}
                disabled={isSubmitting}
              />
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
                  disabled={isSubmitting || !canSubmit}
                  className="px-4 py-1.5 text-[12px] font-medium text-white bg-node-screen rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Edge'}
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
