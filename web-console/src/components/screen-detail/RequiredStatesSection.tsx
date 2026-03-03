import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { NodePill } from '@/components/shared/NodePill'
import type { Node } from '@/lib/types'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface RequiredStatesSectionProps {
  states: Node[]
  onDrillIn: (entry: PanelEntry) => void
}

export function RequiredStatesSection({ states, onDrillIn }: RequiredStatesSectionProps) {
  return (
    <ExpandableSection
      id="screen-detail-states-section"
      title="Required States"
      count={states.length}
    >
      <div className="space-y-1">
        {states.map((state) => (
          <div
            key={state.id}
            data-testid={`screen-detail-state-${state.id}-item`}
            className="py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
            onClick={() => onDrillIn({ nodeId: state.id, nodeType: state.type, label: state.name })}
          >
            <NodePill id={state.id} name={state.name} type="UserState" />
          </div>
        ))}
      </div>
    </ExpandableSection>
  )
}
