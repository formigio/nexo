import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFeatureSummaries, type FeatureSummary } from '@/api/features'
import { LoadingState } from '@/components/shared/LoadingState'
import { NODE_TYPE_LABELS, NODE_TYPE_PLURALS, NODE_TYPE_COLORS } from '@/lib/constants'
import type { FeatureProps } from '@/lib/types'

interface FeatureListViewProps {
  app: string
}

type StatusFilter = 'all' | 'deployed' | 'in-progress' | 'proposed' | 'deprecated'

const STATUS_FILTERS: { id: StatusFilter; label: string; color: string }[] = [
  { id: 'all', label: 'All', color: '#e1e4e8' },
  { id: 'deployed', label: 'Deployed', color: '#3fb950' },
  { id: 'in-progress', label: 'In Progress', color: '#ffa657' },
  { id: 'proposed', label: 'Proposed', color: '#8b949e' },
  { id: 'deprecated', label: 'Deprecated', color: '#6e7681' },
]

const STATUS_COLORS: Record<string, string> = {
  deployed: '#3fb950',
  'in-progress': '#ffa657',
  proposed: '#8b949e',
  deprecated: '#6e7681',
}

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3']

// Types to show in the summary line, in display order
const SUMMARY_TYPES = [
  'Screen', 'Component', 'APIEndpoint', 'DataEntity', 'BusinessRule',
  'UserAction', 'DataField',
] as const

export function FeatureListView({ app }: FeatureListViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['feature-summaries', app],
    queryFn: () => fetchFeatureSummaries(app),
    staleTime: 60_000,
  })

  if (isLoading) return <LoadingState message="Loading features..." />

  // Filter by status
  const filtered = statusFilter === 'all'
    ? features
    : features.filter((f) => (f.props as FeatureProps).status === statusFilter)

  // Group by priority
  const grouped = new Map<string, FeatureSummary[]>()
  for (const p of PRIORITY_ORDER) grouped.set(p, [])
  for (const f of filtered) {
    const priority = (f.props as FeatureProps).priority ?? 'P3'
    const list = grouped.get(priority) ?? []
    list.push(f)
    grouped.set(priority, list)
  }

  // Count per status for filter badges
  const statusCounts: Record<string, number> = {}
  for (const f of features) {
    const s = (f.props as FeatureProps).status ?? 'proposed'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[18px] font-semibold text-text-primary">Features</h1>
        <span className="text-[13px] text-text-dim">{features.length} features</span>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {STATUS_FILTERS.map(({ id, label, color }) => {
          const count = id === 'all' ? features.length : (statusCounts[id] ?? 0)
          if (id !== 'all' && count === 0) return null
          return (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors ${
                statusFilter === id
                  ? 'bg-surface-2 text-text-primary border border-border-default'
                  : 'text-text-dim hover:text-text-secondary hover:bg-surface-2/50'
              }`}
            >
              {id !== 'all' && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              )}
              {label}
              <span className="text-text-dim ml-0.5">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Feature groups by priority */}
      {PRIORITY_ORDER.map((priority) => {
        const group = grouped.get(priority) ?? []
        if (group.length === 0) return null
        return (
          <div key={priority} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-dim">
                {priority}
              </span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>
            <div className="flex flex-col gap-2">
              {group.map((f) => (
                <FeatureCard key={f.id} feature={f} />
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[13px] text-text-dim">
          No features match this filter.
        </div>
      )}
    </div>
  )
}

function FeatureCard({ feature }: { feature: FeatureSummary }) {
  const props = feature.props as FeatureProps
  const status = props.status ?? 'proposed'
  const statusColor = STATUS_COLORS[status] ?? '#8b949e'

  // Build scope summary string
  const parts: string[] = []
  for (const t of SUMMARY_TYPES) {
    const count = feature.scopeCounts[t]
    if (count && count > 0) {
      parts.push(`${count} ${count > 1 ? NODE_TYPE_PLURALS[t] : NODE_TYPE_LABELS[t]}`)
    }
  }
  const scopeSummary = parts.length > 0 ? parts.join(' \u00b7 ') : 'No nodes yet'

  return (
    <a
      href={`/features/${encodeURIComponent(feature.id)}`}
      className="block p-4 rounded-lg border border-border-subtle hover:border-border-default bg-surface-1 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {props.featureId && (
              <span className="text-[11px] text-text-dim font-mono">{props.featureId}</span>
            )}
            <span className="text-[14px] font-medium text-text-primary">{feature.name}</span>
          </div>
          {feature.description && (
            <p className="text-[12px] text-text-secondary mb-2 line-clamp-1">{feature.description}</p>
          )}
          <div className="text-[11px] text-text-dim">{scopeSummary}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
            {status.replace('-', ' ')}
          </span>
        </div>
      </div>
      {/* Scope bar: colored segments by node type */}
      {feature.scopeTotal > 0 && (
        <div className="flex h-1 rounded-full overflow-hidden mt-3 bg-surface-2">
          {SUMMARY_TYPES.map((t) => {
            const count = feature.scopeCounts[t] ?? 0
            if (count === 0) return null
            const pct = (count / feature.scopeTotal) * 100
            return (
              <div
                key={t}
                style={{
                  width: `${pct}%`,
                  backgroundColor: NODE_TYPE_COLORS[t],
                  opacity: 0.7,
                }}
              />
            )
          })}
        </div>
      )}
    </a>
  )
}
