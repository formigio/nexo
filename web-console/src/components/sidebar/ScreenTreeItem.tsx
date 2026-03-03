import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ScreenTreeNode } from '@/hooks/useScreenTree'
import type { ScreenProps } from '@/lib/types'
import { NODE_TYPE_COLORS } from '@/lib/constants'

interface ScreenTreeItemProps {
  node: ScreenTreeNode
  depth?: number
  searchQuery?: string
}

export function ScreenTreeItem({ node, depth = 0, searchQuery }: ScreenTreeItemProps) {
  const { screenId } = useParams()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)

  const { screen, children } = node
  const isActive = screenId === screen.id
  const hasChildren = children.length > 0
  const props = screen.props as ScreenProps
  const route = props.route

  // If searching, highlight matching text
  const matchesSearch = searchQuery
    ? screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (route?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    : true

  // If searching and this doesn't match, check children
  const childMatches = searchQuery
    ? children.some((c) => doesTreeMatch(c, searchQuery))
    : false

  if (searchQuery && !matchesSearch && !childMatches) {
    return null
  }

  return (
    <div data-testid={`sidebar-screen-${screen.id}-item`}>
      <div
        className={`flex items-center gap-1 pr-3 cursor-pointer transition-colors ${
          isActive
            ? 'bg-node-screen/[0.15] text-node-screen'
            : 'text-text-primary hover:bg-white/[0.04]'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            data-testid={`sidebar-screen-${screen.id}-expand-btn`}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-1 hover:bg-white/[0.08] rounded transition-colors"
          >
            <svg
              className={`w-2.5 h-2.5 text-text-dim transition-transform ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M4.5 2l4 4-4 4" />
            </svg>
          </button>
        ) : (
          <span className="w-[18px]" />
        )}
        <button
          onClick={() => navigate(`/screens/${screen.id}`)}
          className="flex-1 flex items-center gap-2 py-1.5 text-left min-w-0"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: NODE_TYPE_COLORS.Screen }}
          />
          <span className="text-[13px] font-medium truncate">
            {searchQuery ? highlightMatch(screen.name, searchQuery) : screen.name}
          </span>
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <ScreenTreeItem
              key={child.screen.id}
              node={child}
              depth={depth + 1}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function doesTreeMatch(node: ScreenTreeNode, query: string): boolean {
  const q = query.toLowerCase()
  const props = node.screen.props as ScreenProps
  if (
    node.screen.name.toLowerCase().includes(q) ||
    (props.route?.toLowerCase().includes(q) ?? false)
  ) {
    return true
  }
  return node.children.some((c) => doesTreeMatch(c, q))
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-node-screen/30 text-node-screen rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}
