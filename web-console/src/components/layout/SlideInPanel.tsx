import { useEffect, useRef, type ReactNode } from 'react'
import { usePanelStack, type PanelEntry } from '@/hooks/usePanelStack'

interface SlideInPanelProps {
  children: (current: PanelEntry, push: (entry: PanelEntry) => void) => ReactNode
}

export function SlideInPanel({ children }: SlideInPanelProps) {
  const { stack, current, isOpen, push, pop, popTo, closeAll } = usePanelStack()
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape key closes top panel
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        pop()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, pop])

  if (!isOpen || !current) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 z-10 transition-opacity"
        onClick={closeAll}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="drill-in-panel"
        className="absolute top-0 right-0 bottom-0 w-[480px] max-w-[calc(100%-60px)] bg-surface-1 border-l border-border-default z-20 flex flex-col shadow-2xl animate-slide-in"
      >
        {/* Header with breadcrumb */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default shrink-0">
          <button
            data-testid="drill-in-back-btn"
            onClick={pop}
            className="p-1 rounded hover:bg-surface-2 text-text-secondary transition-colors"
            aria-label="Back"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
          </button>

          <nav data-testid="drill-in-breadcrumb" className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
            {stack.map((entry, idx) => (
              <span key={idx} className="flex items-center gap-1 shrink-0">
                {idx > 0 && (
                  <svg className="w-3 h-3 text-text-dim" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M4.5 2l4 4-4 4" />
                  </svg>
                )}
                <button
                  data-testid={`drill-in-breadcrumb-${idx}-item`}
                  onClick={() => idx < stack.length - 1 ? popTo(idx) : undefined}
                  className={`text-[12px] truncate max-w-[140px] ${
                    idx === stack.length - 1
                      ? 'font-medium text-text-primary'
                      : 'text-text-secondary hover:text-text-primary cursor-pointer'
                  }`}
                >
                  {entry.label}
                </button>
              </span>
            ))}
          </nav>

          <button
            data-testid="drill-in-close-btn"
            onClick={closeAll}
            className="p-1 rounded hover:bg-surface-2 text-text-secondary transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto">
          {children(current, push)}
        </div>
      </div>
    </>
  )
}
