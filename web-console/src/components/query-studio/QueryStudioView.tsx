import { useState, useCallback } from 'react'
import { QUERY_TEMPLATES, type QueryTemplate } from '@/lib/query-templates'
import { useQueryExecution } from '@/hooks/useQueryExecution'
import { NodeSelector } from './NodeSelector'
import { NodeTypeSelector } from './NodeTypeSelector'
import { TemplateCard } from './TemplateCard'
import { ResultsView } from './ResultsView'
import { LoadingState } from '@/components/shared/LoadingState'
import type { Node, NodeType } from '@/lib/types'

interface QueryStudioViewProps {
  app: string
}

interface HistoryEntry {
  templateId: string
  nodeId: string | null
  nodeType: NodeType | null
  nodeName: string | null
  timestamp: number
}

export function QueryStudioView({ app }: QueryStudioViewProps) {
  const [activeTemplate, setActiveTemplate] = useState<QueryTemplate | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedType, setSelectedType] = useState<NodeType | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nexo-query-history') ?? '[]')
    } catch {
      return []
    }
  })
  const [showHistory, setShowHistory] = useState(false)

  // Determine what to pass to the execution hook
  const nodeId = selectedNode?.id ?? null
  const nodeType = selectedType

  const { data: result, isLoading, error } = useQueryExecution(
    activeTemplate,
    nodeId,
    nodeType,
    app,
  )

  // Track query in history when result arrives
  const addToHistory = useCallback(
    (template: QueryTemplate, node: Node | null, type: NodeType | null) => {
      const entry: HistoryEntry = {
        templateId: template.id,
        nodeId: node?.id ?? null,
        nodeType: type,
        nodeName: node?.name ?? type ?? null,
        timestamp: Date.now(),
      }
      setHistory((prev) => {
        const next = [entry, ...prev.filter(
          (h) => !(h.templateId === entry.templateId && h.nodeId === entry.nodeId && h.nodeType === entry.nodeType),
        )].slice(0, 20)
        localStorage.setItem('nexo-query-history', JSON.stringify(next))
        return next
      })
    },
    [],
  )

  function handleSelectTemplate(template: QueryTemplate) {
    if (activeTemplate?.id === template.id) {
      setActiveTemplate(null)
      setSelectedNode(null)
      setSelectedType(null)
    } else {
      setActiveTemplate(template)
      setSelectedNode(null)
      setSelectedType(null)
    }
  }

  function handleRun() {
    if (activeTemplate) {
      addToHistory(activeTemplate, selectedNode, selectedType)
    }
  }

  function handleNodeClick(node: Node) {
    // Pivot: run impact analysis with the clicked node
    const impactTemplate = QUERY_TEMPLATES.find((t) => t.id === 'impact-analysis')!
    setActiveTemplate(impactTemplate)
    setSelectedNode(node)
    setSelectedType(null)
    addToHistory(impactTemplate, node, null)
  }

  function handleHistoryClick(entry: HistoryEntry) {
    const template = QUERY_TEMPLATES.find((t) => t.id === entry.templateId)
    if (!template) return
    setActiveTemplate(template)
    setSelectedType(entry.nodeType)
    // For node-based entries, we need to re-select — use nodeId if available
    if (entry.nodeId) {
      // Create a minimal node for the selector display
      setSelectedNode({ id: entry.nodeId, name: entry.nodeName ?? entry.nodeId, type: 'Screen' as NodeType } as Node)
    } else {
      setSelectedNode(null)
    }
    setShowHistory(false)
  }

  const isInputReady = activeTemplate
    ? activeTemplate.execution.type === 'listByType'
      ? !!selectedType
      : !!selectedNode
    : false

  return (
    <div className="flex h-full">
      {/* Left panel: templates */}
      <div className="w-[300px] shrink-0 border-r border-border-default overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-text-primary">Query Templates</h2>
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                  showHistory
                    ? 'bg-surface-2 text-text-primary'
                    : 'text-text-dim hover:text-text-secondary'
                }`}
              >
                History ({history.length})
              </button>
            )}
          </div>

          {showHistory ? (
            <div className="flex flex-col gap-1.5">
              {history.map((entry, i) => {
                const template = QUERY_TEMPLATES.find((t) => t.id === entry.templateId)
                return (
                  <button
                    key={i}
                    onClick={() => handleHistoryClick(entry)}
                    className="text-left p-2.5 rounded border border-border-subtle hover:border-border-default hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="text-[12px] text-text-primary">{template?.name ?? entry.templateId}</div>
                    <div className="text-[11px] text-text-dim mt-0.5">
                      {entry.nodeName ?? 'Unknown'}
                      <span className="ml-2">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {QUERY_TEMPLATES.map((template) => (
                <div key={template.id}>
                  <TemplateCard
                    template={template}
                    isActive={activeTemplate?.id === template.id}
                    onClick={() => handleSelectTemplate(template)}
                  />

                  {/* Expanded input area */}
                  {activeTemplate?.id === template.id && (
                    <div className="mt-2 ml-1 mr-1 p-3 rounded bg-surface-2/50 border border-border-subtle flex flex-col gap-3">
                      {template.inputs.map((input, idx) => (
                        <div key={idx}>
                          {input.type === 'node' ? (
                            <NodeSelector
                              label={input.label}
                              allowedTypes={input.allowedTypes}
                              app={app}
                              value={selectedNode}
                              onChange={setSelectedNode}
                            />
                          ) : (
                            <NodeTypeSelector
                              value={selectedType}
                              onChange={setSelectedType}
                            />
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleRun}
                        disabled={!isInputReady}
                        className={`w-full py-2 text-[13px] font-medium rounded transition-colors ${
                          isInputReady
                            ? 'bg-node-screen/20 text-node-screen hover:bg-node-screen/30'
                            : 'bg-surface-2 text-text-dim cursor-not-allowed'
                        }`}
                      >
                        Run Query
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: results */}
      <div className="flex-1 min-w-0">
        {isLoading && <LoadingState message="Running query..." />}
        {error && (
          <div className="p-6 text-[13px] text-red-400">
            Error: {error instanceof Error ? error.message : 'Query failed'}
          </div>
        )}
        {result && !isLoading && (
          <ResultsView result={result} onNodeClick={handleNodeClick} />
        )}
        {!result && !isLoading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="text-[15px] font-medium text-text-secondary mb-2">Query Studio</div>
              <p className="text-[13px] text-text-dim leading-relaxed">
                Select a query template from the left panel, choose a node, and run the query to explore the graph.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
