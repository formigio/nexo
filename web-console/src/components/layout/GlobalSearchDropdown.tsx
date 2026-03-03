import { useState, useEffect, useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchNodes } from '@/api/nodes'
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/constants'
import type { Node } from '@/lib/types'

interface GlobalSearchDropdownProps {
  query: string
  app: string
  onSelect: (node: Node) => void
  onClose: () => void
}

export function GlobalSearchDropdown({ query, app, onSelect, onClose }: GlobalSearchDropdownProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const deferredQuery = useDeferredValue(query)

  const { data: results } = useQuery({
    queryKey: ['global-search', app, deferredQuery],
    queryFn: () => searchNodes(deferredQuery, { app }),
    enabled: deferredQuery.length > 0,
    staleTime: 10_000,
  })

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!results || results.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => (i + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => (i - 1 + results.length) % results.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSelect(results[highlightedIndex])
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results, highlightedIndex, onSelect, onClose])

  if (!results || results.length === 0) {
    if (deferredQuery.length > 0) {
      return (
        <div
          data-testid="global-search-dropdown"
          className="absolute top-full right-0 mt-1 w-80 bg-surface-1 border border-border-default rounded-lg shadow-lg z-50 p-3"
        >
          <p className="text-[13px] text-text-dim">No results found</p>
        </div>
      )
    }
    return null
  }

  return (
    <div
      data-testid="global-search-dropdown"
      className="absolute top-full right-0 mt-1 w-80 bg-surface-1 border border-border-default rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <ul className="py-1 max-h-80 overflow-y-auto">
        {results.map((node, index) => (
          <li key={node.id}>
            <button
              data-testid={`global-search-result-${node.id}`}
              onClick={() => {
                onSelect(node)
                onClose()
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2 transition-colors ${
                index === highlightedIndex
                  ? 'bg-white/[0.08]'
                  : 'hover:bg-white/[0.04]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: NODE_TYPE_COLORS[node.type] }}
              />
              <span className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-text-primary truncate block">
                  {highlightMatch(node.name, query)}
                </span>
              </span>
              <span
                className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                style={{
                  backgroundColor: `${NODE_TYPE_COLORS[node.type]}20`,
                  color: NODE_TYPE_COLORS[node.type],
                }}
              >
                {NODE_TYPE_LABELS[node.type]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-white/20 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}
