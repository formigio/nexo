import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { fetchAllNodes, searchNodes } from '@/api/nodes'
import { SidebarGroup } from './SidebarGroup'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { NODE_TYPE_COLORS, NODE_TYPE_PLURALS } from '@/lib/constants'
import type { Node, NodeType } from '@/lib/types'

interface NodeListProps {
  app: string
  type: NodeType
  searchQuery?: string
  onNodeSelect: (node: Node) => void
}

// Grouping config per type
const GROUP_BY: Partial<Record<NodeType, { prop: string; order: string[] }>> = {
  APIEndpoint: { prop: 'method', order: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  Feature: { prop: 'status', order: ['deployed', 'in-progress', 'proposed', 'deprecated'] },
  Component: { prop: 'componentType', order: ['interactive', 'presentational', 'layout', 'navigation'] },
}

const GROUP_LABELS: Record<string, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  deployed: 'Deployed',
  'in-progress': 'In Progress',
  proposed: 'Proposed',
  deprecated: 'Deprecated',
  interactive: 'Interactive',
  presentational: 'Presentational',
  layout: 'Layout',
  navigation: 'Navigation',
}

export function NodeList({ app, type, searchQuery, onNodeSelect }: NodeListProps) {
  const deferredQuery = useDeferredValue(searchQuery || '')
  const location = useLocation()

  const { data: nodes, isLoading, error, refetch } = useQuery({
    queryKey: ['node-list', app, type, deferredQuery],
    queryFn: () =>
      deferredQuery
        ? searchNodes(deferredQuery, { app, type })
        : fetchAllNodes({ app, type }),
    staleTime: 30_000,
  })

  if (isLoading) return <LoadingState message={`Loading ${NODE_TYPE_PLURALS[type].toLowerCase()}...`} />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
  if (!nodes || nodes.length === 0) {
    return <EmptyState message={`No ${NODE_TYPE_PLURALS[type].toLowerCase()} found`} />
  }

  const color = NODE_TYPE_COLORS[type]
  const groupConfig = GROUP_BY[type]

  // Determine active node from URL
  const panelParam = new URLSearchParams(location.search).get('panel')
  const activeNodeId = panelParam?.split(',').pop()?.split(':')[0] || null

  if (groupConfig) {
    const groups = new Map<string, Node[]>()
    const ungrouped: Node[] = []

    for (const node of nodes) {
      const val = node.props[groupConfig.prop] as string | undefined
      if (val) {
        if (!groups.has(val)) groups.set(val, [])
        groups.get(val)!.push(node)
      } else {
        ungrouped.push(node)
      }
    }

    const orderedKeys = groupConfig.order.filter((k) => groups.has(k))
    // Add any keys not in order
    for (const key of groups.keys()) {
      if (!orderedKeys.includes(key)) orderedKeys.push(key)
    }

    return (
      <nav className="py-2">
        {orderedKeys.map((key) => {
          const groupNodes = groups.get(key)!
          return (
            <SidebarGroup
              key={key}
              label={GROUP_LABELS[key] || key}
              count={groupNodes.length}
              defaultExpanded
            >
              {groupNodes
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((node) => (
                  <NodeItem
                    key={node.id}
                    node={node}
                    color={color}
                    isActive={node.id === activeNodeId}
                    searchQuery={searchQuery}
                    onClick={() => onNodeSelect(node)}
                  />
                ))}
            </SidebarGroup>
          )
        })}
        {ungrouped.length > 0 && (
          <SidebarGroup label="Other" count={ungrouped.length} defaultExpanded>
            {ungrouped
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((node) => (
                <NodeItem
                  key={node.id}
                  node={node}
                  color={color}
                  isActive={node.id === activeNodeId}
                  searchQuery={searchQuery}
                  onClick={() => onNodeSelect(node)}
                />
              ))}
          </SidebarGroup>
        )}
      </nav>
    )
  }

  // Flat alphabetical list
  const sorted = [...nodes].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <nav className="py-2">
      {sorted.map((node) => (
        <NodeItem
          key={node.id}
          node={node}
          color={color}
          isActive={node.id === activeNodeId}
          searchQuery={searchQuery}
          onClick={() => onNodeSelect(node)}
        />
      ))}
    </nav>
  )
}

interface NodeItemProps {
  node: Node
  color: string
  isActive: boolean
  searchQuery?: string
  onClick: () => void
}

function NodeItem({ node, color, isActive, searchQuery, onClick }: NodeItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full text-left px-3 py-1.5 transition-colors ${
        isActive
          ? 'text-text-primary'
          : 'text-text-primary hover:bg-white/[0.04]'
      }`}
      style={isActive ? { backgroundColor: `${color}26`, color } : undefined}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-[13px] font-medium truncate">
        {searchQuery ? highlightMatch(node.name, searchQuery) : node.name}
      </span>
    </button>
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
