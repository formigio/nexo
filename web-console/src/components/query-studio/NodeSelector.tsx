import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchNodes } from '@/api/nodes'
import { TypeBadge } from '@/components/shared/TypeBadge'
import type { Node, NodeType } from '@/lib/types'

interface NodeSelectorProps {
  label: string
  allowedTypes?: NodeType[]
  app: string
  value: Node | null
  onChange: (node: Node | null) => void
}

export function NodeSelector({ label, allowedTypes, app, value, onChange }: NodeSelectorProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: results = [] } = useQuery({
    queryKey: ['node-search', query, app, allowedTypes],
    queryFn: () =>
      searchNodes(query, {
        app,
        type: allowedTypes?.length === 1 ? allowedTypes[0] : undefined,
      }).then((nodes) =>
        allowedTypes && allowedTypes.length > 1
          ? nodes.filter((n) => allowedTypes.includes(n.type))
          : nodes,
      ),
    enabled: isOpen,
    staleTime: 30_000,
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(node: Node) {
    onChange(node)
    setQuery('')
    setIsOpen(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-dim uppercase tracking-wide shrink-0">{label}:</span>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-surface-2 border border-border-default flex-1 min-w-0">
          <TypeBadge type={value.type} />
          <span className="text-[13px] text-text-primary truncate">{value.name}</span>
          <button
            onClick={handleClear}
            className="ml-auto text-text-dim hover:text-text-primary transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-dim uppercase tracking-wide shrink-0">{label}:</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={`Search ${label.toLowerCase()}s...`}
          className="w-full px-2.5 py-1.5 text-[13px] rounded bg-surface-2 border border-border-default text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-default rounded shadow-lg max-h-60 overflow-y-auto">
          {results.map((node) => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.06] transition-colors"
            >
              <TypeBadge type={node.type} />
              <span className="text-[13px] text-text-primary truncate">{node.name}</span>
              <span className="text-[11px] text-text-dim ml-auto shrink-0">{node.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
