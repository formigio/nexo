import { useState, type ReactNode } from 'react'

interface SidebarGroupProps {
  label: string
  count: number
  children: ReactNode
  defaultExpanded?: boolean
}

export function SidebarGroup({
  label,
  count,
  children,
  defaultExpanded = true,
}: SidebarGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-white/[0.04] transition-colors"
      >
        <svg
          className={`w-2.5 h-2.5 text-text-dim transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4.5 2l4 4-4 4" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary">
          {label}
        </span>
        <span className="text-[10px] text-text-dim">{count}</span>
      </button>
      {expanded && <div>{children}</div>}
    </div>
  )
}
