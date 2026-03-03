import { useState } from 'react'
import type { QueryResult } from '@/hooks/useQueryExecution'

type ExportFormat = 'json' | 'csv'

interface ExportViewProps {
  result: QueryResult
}

function toCSV(result: QueryResult): string {
  const header = 'ID,Name,Type,Description,Connection,Hops'
  const rows = result.resultNodes.map((r) => {
    const desc = (r.node.description ?? '').replace(/"/g, '""')
    return `"${r.node.id}","${r.node.name}","${r.node.type}","${desc}","${r.connection}",${r.depth}`
  })
  return [header, ...rows].join('\n')
}

function toJSON(result: QueryResult): string {
  const data = {
    templateId: result.templateId,
    startNode: result.startNode
      ? { id: result.startNode.id, name: result.startNode.name, type: result.startNode.type }
      : null,
    results: result.resultNodes.map((r) => ({
      id: r.node.id,
      name: r.node.name,
      type: r.node.type,
      description: r.node.description,
      connection: r.connection,
      depth: r.depth,
      props: r.node.props,
    })),
    edges: result.edges.map((e) => ({
      type: e.type,
      from: e.in,
      to: e.out,
    })),
  }
  return JSON.stringify(data, null, 2)
}

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportView({ result }: ExportViewProps) {
  const [format, setFormat] = useState<ExportFormat>('json')

  const content = format === 'json' ? toJSON(result) : toCSV(result)

  function handleDownload() {
    const ext = format === 'json' ? 'json' : 'csv'
    const mime = format === 'json' ? 'application/json' : 'text/csv'
    download(content, `nexo-query-${result.templateId}.${ext}`, mime)
  }

  function handleCopy() {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFormat('json')}
          className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
            format === 'json'
              ? 'bg-surface-2 text-text-primary border border-border-default'
              : 'text-text-dim hover:text-text-secondary'
          }`}
        >
          JSON
        </button>
        <button
          onClick={() => setFormat('csv')}
          className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
            format === 'csv'
              ? 'bg-surface-2 text-text-primary border border-border-default'
              : 'text-text-dim hover:text-text-secondary'
          }`}
        >
          CSV
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-[12px] font-medium rounded border border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-[12px] font-medium rounded bg-node-screen/20 text-node-screen hover:bg-node-screen/30 transition-colors"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="p-3 rounded bg-surface-2 border border-border-subtle text-[12px] text-text-secondary overflow-auto max-h-[60vh] font-mono leading-relaxed">
        {content}
      </pre>
    </div>
  )
}
