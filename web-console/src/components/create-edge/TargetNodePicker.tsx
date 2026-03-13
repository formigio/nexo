import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchNodes } from '@/api/nodes'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { NODE_TYPE_LABELS } from '@/lib/constants'
import type { Node, NodeType } from '@/lib/types'

interface TargetNodePickerProps {
  allowedTypes: NodeType[]
  app: string
  value: Node | null
  onChange: (node: Node | null) => void
  disabled: boolean
  error?: string
}

export function TargetNodePicker({ allowedTypes, app, value, onChange, disabled, error }: TargetNodePickerProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data: results = [] } = useQuery({
    queryKey: ['edge-target-search', query, app, allowedTypes],
    queryFn: () =>
      searchNodes(query, {
        app,
        type: allowedTypes.length === 1 ? allowedTypes[0] : undefined,
      }).then((nodes) =>
        allowedTypes.length > 1
          ? nodes.filter((n) => allowedTypes.includes(n.type))
          : nodes,
      ),
    enabled: isOpen && !disabled,
    staleTime: 30_000,
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(-1)
  }, [results])

  function handleSelect(node: Node) {
    onChange(node)
    setQuery('')
    setIsOpen(false)
    setHighlightIndex(-1)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      handleSelect(results[highlightIndex])
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const placeholderTypes = allowedTypes.map((t) => NODE_TYPE_LABELS[t]).join(', ')
  const placeholder = `Search for ${placeholderTypes}...`

  // Selected state — show chip
  if (value) {
    return (
      <div className="space-y-1">
        <label className="block text-[11px] font-medium text-text-secondary">
          To<span className="text-node-rule ml-0.5">*</span>
        </label>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-2 border border-border-default">
          <TypeBadge type={value.type} />
          <span className="text-[12px] text-text-primary truncate">{value.name}</span>
          <span className="text-[10px] text-text-dim ml-auto shrink-0">{value.id}</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-text-dim hover:text-text-primary transition-colors shrink-0"
              aria-label="Clear selection"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Search state
  return (
    <div ref={containerRef} className="space-y-1">
      <label className="block text-[11px] font-medium text-text-secondary">
        To<span className="text-node-rule ml-0.5">*</span>
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 bg-surface-2 border border-border-default rounded text-[12px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors disabled:opacity-50"
        />
        {isOpen && results.length > 0 && (
          <div
            ref={listRef}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-default rounded shadow-lg max-h-48 overflow-y-auto"
          >
            {results.map((node, i) => (
              <button
                key={node.id}
                type="button"
                onClick={() => handleSelect(node)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  i === highlightIndex ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
                }`}
              >
                <TypeBadge type={node.type} />
                <span className="text-[12px] text-text-primary truncate">{node.name}</span>
                <span className="text-[10px] text-text-dim ml-auto shrink-0">{node.id}</span>
              </button>
            ))}
          </div>
        )}
        {isOpen && results.length === 0 && query.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-default rounded shadow-lg px-3 py-2">
            <span className="text-[12px] text-text-dim">No matching nodes</span>
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-node-rule">{error}</p>}
    </div>
  )
}
