import { useEffect, useRef } from 'react'
import { TypeBadge } from '@/components/shared/TypeBadge'
import type { Node } from '@/lib/types'

interface GraphContextMenuProps {
  node: Node
  position: { x: number; y: number }
  canGoBack: boolean
  onDrillDown: () => void
  onGoBack: () => void
  onNavigate: () => void
  onEditNode: () => void
  onAddEdge: () => void
  onDeleteNode: () => void
  onDismiss: () => void
}

export function GraphContextMenu({
  node,
  position,
  canGoBack,
  onDrillDown,
  onGoBack,
  onNavigate,
  onEditNode,
  onAddEdge,
  onDeleteNode,
  onDismiss,
}: GraphContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Clamp position to viewport
  const clampedX = Math.min(position.x, window.innerWidth - 200)
  const clampedY = Math.min(position.y, window.innerHeight - 300)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onDismiss()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onDismiss])

  const itemClass =
    'w-full text-left px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors'

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-surface-1 border border-border-default rounded-lg shadow-lg overflow-hidden min-w-[180px]"
      style={{ left: clampedX, top: clampedY }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-default flex items-center gap-2">
        <span className="text-[13px] font-medium text-text-primary truncate max-w-[120px]">
          {node.name}
        </span>
        <TypeBadge type={node.type} />
      </div>

      {/* Actions */}
      <div className="py-1">
        <button onClick={onDrillDown} className={itemClass}>
          Drill Down
        </button>
        {canGoBack && (
          <button onClick={onGoBack} className={itemClass}>
            Back
          </button>
        )}
        <button onClick={onNavigate} className={itemClass}>
          Navigate
        </button>

        <div className="border-t border-border-default my-1" />

        <button onClick={onEditNode} className={itemClass}>
          Edit Node
        </button>
        <button onClick={onAddEdge} className={itemClass}>
          Add Edge
        </button>

        <div className="border-t border-border-default my-1" />

        <button
          onClick={onDeleteNode}
          className="w-full text-left px-3 py-1.5 text-[12px] text-impact-breaking hover:bg-white/[0.06] transition-colors"
        >
          Delete Node
        </button>
      </div>
    </div>
  )
}
