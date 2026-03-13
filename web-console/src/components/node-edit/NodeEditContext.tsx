import { NodePill } from '@/components/shared/NodePill'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { groupByEdgeType } from '@/api/nodes'
import type { Node, Edge, NodeType } from '@/lib/types'

interface NodeEditContextProps {
  node: Node
  outbound: { edge: Edge; node: Node }[]
  inbound: { edge: Edge; node: Node }[]
}

export function NodeEditContext({ node, outbound, inbound }: NodeEditContextProps) {
  return (
    <div className="space-y-6">
      {/* Edges */}
      {(outbound.length > 0 || inbound.length > 0) && (
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-3">
            Connections
          </h3>
          <div className="space-y-1">
            {outbound.length > 0 &&
              groupByEdgeType(outbound, 'outbound').map(({ edgeType, label, nodes }) => (
                <ExpandableSection
                  key={`out-${edgeType}`}
                  id={`edit-out-${edgeType}`}
                  title={label}
                  count={nodes.length}
                >
                  <div className="space-y-0.5">
                    {nodes.map((n) => (
                      <div key={n.id} className="py-1 px-2">
                        <NodePill id={n.id} name={n.name} type={n.type as NodeType} />
                      </div>
                    ))}
                  </div>
                </ExpandableSection>
              ))}
            {inbound.length > 0 &&
              groupByEdgeType(inbound, 'inbound').map(({ edgeType, label, nodes }) => (
                <ExpandableSection
                  key={`in-${edgeType}`}
                  id={`edit-in-${edgeType}`}
                  title={label}
                  count={nodes.length}
                >
                  <div className="space-y-0.5">
                    {nodes.map((n) => (
                      <div key={n.id} className="py-1 px-2">
                        <NodePill id={n.id} name={n.name} type={n.type as NodeType} />
                      </div>
                    ))}
                  </div>
                </ExpandableSection>
              ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-3">
          Metadata
        </h3>
        <dl className="space-y-2 text-[12px]">
          <MetaRow label="Node ID">
            <span className="font-mono text-text-secondary">{node.id}</span>
          </MetaRow>
          <MetaRow label="App">
            <span className="text-text-secondary">{node.app}</span>
          </MetaRow>
          <MetaRow label="Type">
            <TypeBadge type={node.type as NodeType} />
          </MetaRow>
          {node.createdAt && (
            <MetaRow label="Created">
              <span className="text-text-secondary">{timeAgo(node.createdAt)}</span>
            </MetaRow>
          )}
          {node.updatedAt && (
            <MetaRow label="Updated">
              <span className="text-text-secondary">{timeAgo(node.updatedAt)}</span>
            </MetaRow>
          )}
          <MetaRow label="Version">
            <span className="text-text-secondary">v{node.version}</span>
          </MetaRow>
        </dl>
      </div>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-text-dim min-w-[80px] shrink-0">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
