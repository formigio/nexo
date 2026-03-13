import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchNodeEdges, fetchNodesBatch } from '@/api/nodes'
import { useDeleteNode } from '@/hooks/useDeleteNode'
import { EdgeImpactList } from './EdgeImpactList'
import type { Node, Edge } from '@/lib/types'

interface EdgeImpactItem {
  edge: Edge
  node: Node
  direction: 'outbound' | 'inbound'
}

interface DeleteNodeDialogProps {
  isOpen: boolean
  node: Node | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteNodeDialog({ isOpen, node, onClose, onDeleted }: DeleteNodeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<EdgeImpactItem[]>([])
  const [isLoadingEdges, setIsLoadingEdges] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState('')

  const { deleteNode, isDeleting } = useDeleteNode({ onSuccess: onDeleted })

  const needsConfirmation = edges.length >= 5
  const confirmValid = !needsConfirmation || confirmName === node?.name

  // Fetch edges when dialog opens
  useEffect(() => {
    if (!isOpen || !node) return

    setEdges([])
    setConfirmName('')
    setLoadError(null)
    setIsLoadingEdges(true)

    fetchNodeEdges(node.id)
      .then(async (edgeList) => {
        const connectedIds = new Set<string>()
        for (const e of edgeList) {
          if (e.in !== node.id) connectedIds.add(e.in)
          if (e.out !== node.id) connectedIds.add(e.out)
        }

        const connected = connectedIds.size > 0
          ? await fetchNodesBatch(Array.from(connectedIds))
          : []
        const nodeMap = new Map(connected.map((n) => [n.id, n]))

        const items: EdgeImpactItem[] = []
        for (const edge of edgeList) {
          if (edge.in === node.id && nodeMap.has(edge.out)) {
            items.push({ edge, node: nodeMap.get(edge.out)!, direction: 'outbound' })
          } else if (edge.out === node.id && nodeMap.has(edge.in)) {
            items.push({ edge, node: nodeMap.get(edge.in)!, direction: 'inbound' })
          }
        }

        setEdges(items)
      })
      .catch((err) => setLoadError(err.message || 'Failed to load edges'))
      .finally(() => setIsLoadingEdges(false))
  }, [isOpen, node])

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

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [isOpen, onClose])

  if (!isOpen || !node) return null

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
          aria-labelledby="delete-node-title"
          className="w-[520px] max-w-[calc(100vw-2rem)] max-h-[80vh] bg-surface-1 border border-border-default rounded-lg shadow-2xl flex flex-col animate-modal-enter"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default shrink-0">
            <h2 id="delete-node-title" className="text-[14px] font-semibold text-text-primary">
              Delete Node
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-dim hover:text-text-secondary transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Error banner */}
            {loadError && (
              <div className="px-3 py-2 rounded bg-node-rule/10 border border-node-rule/30 text-[12px] text-node-rule">
                {loadError}
              </div>
            )}

            <p className="text-[13px] text-text-secondary">
              Deleting <strong className="text-text-primary">"{node.name}"</strong> will remove this node
              {edges.length > 0 ? ' and cascade-delete the following edges:' : '.'}
            </p>

            {/* Edge impact list */}
            {(isLoadingEdges || edges.length > 0) && (
              <EdgeImpactList edges={edges} isLoading={isLoadingEdges} />
            )}

            {!isLoadingEdges && edges.length > 0 && (
              <p className="text-[12px] text-text-dim">
                {edges.length} edge{edges.length !== 1 ? 's' : ''} will be deleted.
              </p>
            )}

            {/* Name confirmation for >=5 edges */}
            {needsConfirmation && !isLoadingEdges && (
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-secondary">
                  Type <strong className="text-text-primary">"{node.name}"</strong> to confirm
                </label>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  disabled={isDeleting}
                  className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-impact-breaking transition-colors"
                  placeholder={node.name}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-default shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary rounded border border-border-default hover:border-text-dim transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteNode(node.id, node.name)}
              disabled={isDeleting || isLoadingEdges || !confirmValid}
              className="px-4 py-1.5 text-[12px] font-medium text-white bg-impact-breaking rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
