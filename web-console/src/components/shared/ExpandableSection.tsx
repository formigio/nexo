import { useState, type ReactNode } from 'react'

interface ExpandableSectionProps {
  id: string
  title: string
  count: number
  children: ReactNode
  defaultExpanded?: boolean
}

export function ExpandableSection({
  id,
  title,
  count,
  children,
  defaultExpanded = true,
}: ExpandableSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section data-testid={id}>
      <button
        data-testid={`expandable-${id}-toggle`}
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left py-2 group"
      >
        <svg
          className={`w-3 h-3 text-text-dim transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4.5 2l4 4-4 4" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary">
          {title}
        </span>
        <span className="text-[11px] text-text-dim">({count})</span>
      </button>
      {expanded && <div className="pl-5">{children}</div>}
    </section>
  )
}
