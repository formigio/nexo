import { useState } from 'react'
import type { QueryResult } from '@/hooks/useQueryExecution'
import { TableView } from './TableView'
import { CardsView } from './CardsView'
import { GraphView } from './GraphView'
import { ExportView } from './ExportView'
import type { Node } from '@/lib/types'

type ViewMode = 'table' | 'cards' | 'graph' | 'export'

interface ResultsViewProps {
  result: QueryResult
  onNodeClick: (node: Node) => void
}

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'cards', label: 'Cards' },
  { id: 'graph', label: 'Graph' },
  { id: 'export', label: 'Export' },
]

export function ResultsView({ result, onNodeClick }: ResultsViewProps) {
  const [mode, setMode] = useState<ViewMode>('table')

  return (
    <div className="flex flex-col h-full">
      {/* Header with result count and mode selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
        <span className="text-[13px] text-text-secondary">
          {result.resultNodes.length} result{result.resultNodes.length !== 1 ? 's' : ''}
          {result.startNode && (
            <span className="text-text-dim"> from {result.startNode.name}</span>
          )}
        </span>
        <div className="flex gap-1">
          {VIEW_MODES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
                mode === id
                  ? 'bg-surface-2 text-text-primary border border-border-default'
                  : 'text-text-dim hover:text-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results area */}
      <div className={`flex-1 ${mode === 'graph' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {mode === 'table' && <TableView result={result} onNodeClick={onNodeClick} />}
        {mode === 'cards' && <CardsView result={result} onNodeClick={onNodeClick} />}
        {mode === 'graph' && <GraphView result={result} onNodeClick={onNodeClick} />}
        {mode === 'export' && <ExportView result={result} />}
      </div>
    </div>
  )
}
