import { useState, useEffect } from 'react'
import { ScreenTree } from './ScreenTree'
import { NodeList } from './NodeList'
import { NODE_TYPE_COLORS, NODE_TYPE_PLURALS } from '@/lib/constants'
import type { Node, NodeType } from '@/lib/types'

const ALL_TYPES: NodeType[] = [
  'Screen',
  'Feature',
  'APIEndpoint',
  'Component',
  'BusinessRule',
  'DataEntity',
  'DataField',
  'UserAction',
  'UserState',
  'InfraResource',
  'SourceFile',
]

interface NavigatorProps {
  app: string
  selectedType: NodeType
  onTypeChange: (type: NodeType) => void
  onNodeSelect: (node: Node) => void
}

export function Navigator({
  app,
  selectedType,
  onTypeChange,
  onNodeSelect,
}: NavigatorProps) {
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('')

  // Clear search when type changes
  useEffect(() => {
    setSidebarSearchQuery('')
  }, [selectedType])

  return (
    <div className="flex flex-col h-full">
      {/* Type selector */}
      <div className="px-3 py-2.5 border-b border-border-default shrink-0">
        <div className="relative">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
            style={{ backgroundColor: NODE_TYPE_COLORS[selectedType] }}
          />
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as NodeType)}
            className="w-full pl-7 pr-3 py-1.5 text-[13px] font-medium rounded bg-surface-2 border border-border-default text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-node-screen transition-colors"
          >
            {ALL_TYPES.map((type) => (
              <option key={type} value={type}>
                {NODE_TYPE_PLURALS[type]}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim pointer-events-none"
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M3 4.5l3 3 3-3" />
          </svg>
        </div>
      </div>

      {/* Sidebar search */}
      <div className="px-3 py-2 border-b border-border-default shrink-0">
        <input
          data-testid="sidebar-search-input"
          type="text"
          placeholder={`Filter ${NODE_TYPE_PLURALS[selectedType].toLowerCase()}...`}
          value={sidebarSearchQuery}
          onChange={(e) => setSidebarSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-[13px] rounded bg-surface-2 border border-border-default text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedType === 'Screen' ? (
          <ScreenTree app={app} searchQuery={sidebarSearchQuery || undefined} />
        ) : (
          <NodeList
            app={app}
            type={selectedType}
            searchQuery={sidebarSearchQuery || undefined}
            onNodeSelect={onNodeSelect}
          />
        )}
      </div>
    </div>
  )
}
