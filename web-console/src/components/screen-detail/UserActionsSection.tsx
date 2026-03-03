import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { NodePill } from '@/components/shared/NodePill'
import type { Node, Edge, UserActionProps } from '@/lib/types'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface UserActionsSectionProps {
  actions: Node[]
  edges: Edge[]
  onDrillIn: (entry: PanelEntry) => void
}

export function UserActionsSection({ actions, edges, onDrillIn }: UserActionsSectionProps) {
  return (
    <ExpandableSection
      id="screen-detail-actions-section"
      title="User Actions"
      count={actions.length}
    >
      <div className="space-y-1">
        {actions.map((action) => {
          const props = action.props as UserActionProps
          const callsEdge = edges.find(
            (e) => e.type === 'CALLS' && e.in === action.id,
          )

          return (
            <div
              key={action.id}
              data-testid={`screen-detail-action-${action.id}-item`}
              className="py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
              onClick={() => onDrillIn({ nodeId: action.id, nodeType: action.type, label: action.name })}
            >
              <div className="flex items-center gap-2">
                <NodePill
                  id={action.id}
                  name={action.name}
                  type="UserAction"
                />
                {props.actionType && (
                  <span className="text-[10px] text-text-dim">{props.actionType}</span>
                )}
                {props.inputType && (
                  <span className="text-[10px] text-text-dim">{props.inputType}</span>
                )}
              </div>
              {callsEdge && (
                <div className="ml-8 mt-0.5 text-[10px] text-text-dim">
                  calls endpoint
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ExpandableSection>
  )
}
