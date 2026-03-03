import type { Node, FeatureProps } from '@/lib/types'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface FeatureSectionProps {
  feature: Node
  onDrillIn: (entry: PanelEntry) => void
}

const STATUS_COLORS: Record<string, string> = {
  deployed: '#3fb950',
  'in-progress': '#ffa657',
  proposed: '#8b949e',
  deprecated: '#6e7681',
}

export function FeatureSection({ feature, onDrillIn }: FeatureSectionProps) {
  const props = feature.props as FeatureProps
  const statusColor = STATUS_COLORS[props.status ?? 'proposed'] ?? '#8b949e'

  return (
    <div data-testid="screen-detail-feature-section" className="py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-2">
        Feature
      </div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-2 cursor-pointer hover:bg-white/[0.06] transition-colors"
        onClick={() => onDrillIn({ nodeId: feature.id, nodeType: feature.type, label: feature.name })}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: '#ffa657' }}
        />
        <span className="text-[13px] font-medium text-node-feature">
          {props.featureId && <span className="text-text-dim">{props.featureId} </span>}
          {feature.name}
        </span>
        {props.status && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded capitalize ml-auto"
            style={{ backgroundColor: `${statusColor}26`, color: statusColor }}
          >
            {props.status}
          </span>
        )}
        {props.priority && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-1 text-text-dim">
            {props.priority}
          </span>
        )}
      </div>
    </div>
  )
}
