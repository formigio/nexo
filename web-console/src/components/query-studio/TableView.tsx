import { useState } from 'react'
import type { QueryResult, QueryResultNode } from '@/hooks/useQueryExecution'
import { TypeBadge } from '@/components/shared/TypeBadge'
import type { Node, NodeType } from '@/lib/types'
import { NODE_TYPE_LABELS } from '@/lib/constants'

type SortKey = 'name' | 'type' | 'connection' | 'depth'
type SortDir = 'asc' | 'desc'

interface TableViewProps {
  result: QueryResult
  onNodeClick: (node: Node) => void
}

export function TableView({ result, onNodeClick }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('depth')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [typeFilter, setTypeFilter] = useState<NodeType | ''>('')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // Collect unique types for filter
  const types = [...new Set(result.resultNodes.map((r) => r.node.type))]

  let rows = [...result.resultNodes]

  // Filter
  if (typeFilter) {
    rows = rows.filter((r) => r.node.type === typeFilter)
  }

  // Sort
  rows.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'name':
        return dir * a.node.name.localeCompare(b.node.name)
      case 'type':
        return dir * a.node.type.localeCompare(b.node.type)
      case 'connection':
        return dir * a.connection.localeCompare(b.connection)
      case 'depth':
        return dir * (a.depth - b.depth)
      default:
        return 0
    }
  })

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-left hover:text-text-primary transition-colors"
    >
      {label}
      {sortKey === field && (
        <span className="text-[10px]">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
      )}
    </button>
  )

  return (
    <div>
      {/* Type filter */}
      {types.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-subtle">
          <span className="text-[11px] text-text-dim">Filter:</span>
          <button
            onClick={() => setTypeFilter('')}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              !typeFilter ? 'bg-surface-2 text-text-primary' : 'text-text-dim hover:text-text-secondary'
            }`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                typeFilter === t ? 'bg-surface-2 text-text-primary' : 'text-text-dim hover:text-text-secondary'
              }`}
            >
              {NODE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      <table className="w-full">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-dim border-b border-border-subtle">
            <th className="text-left px-4 py-2">
              <SortHeader label="Name" field="name" />
            </th>
            <th className="text-left px-4 py-2">
              <SortHeader label="Type" field="type" />
            </th>
            <th className="text-left px-4 py-2">
              <SortHeader label="Connection" field="connection" />
            </th>
            <th className="text-left px-4 py-2 w-16">
              <SortHeader label="Hops" field="depth" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ResultRow key={r.node.id} item={r} onClick={() => onNodeClick(r.node)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResultRow({ item, onClick }: { item: QueryResultNode; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-border-subtle hover:bg-white/[0.03] cursor-pointer transition-colors"
    >
      <td className="px-4 py-2.5">
        <span className="text-[13px] text-text-primary">{item.node.name}</span>
      </td>
      <td className="px-4 py-2.5">
        <TypeBadge type={item.node.type} />
      </td>
      <td className="px-4 py-2.5">
        <span className="text-[12px] text-text-secondary">{item.connection}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-[12px] text-text-dim">{item.depth}</span>
      </td>
    </tr>
  )
}
