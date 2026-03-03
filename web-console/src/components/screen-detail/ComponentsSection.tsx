import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { NodePill } from '@/components/shared/NodePill'
import type { Node, Edge, ComponentProps } from '@/lib/types'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface ComponentsSectionProps {
  components: Node[]
  edges: Edge[]
  onDrillIn: (entry: PanelEntry) => void
}

export function ComponentsSection({ components, edges, onDrillIn }: ComponentsSectionProps) {
  return (
    <ExpandableSection
      id="screen-detail-components-section"
      title="Components"
      count={components.length}
    >
      <div className="space-y-1">
        {components.map((component) => {
          const props = component.props as ComponentProps
          const triggeredActions = edges.filter(
            (e) => e.type === 'TRIGGERS' && e.in === component.id,
          )

          return (
            <div
              key={component.id}
              data-testid={`screen-detail-component-${component.id}-item`}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
              onClick={() => onDrillIn({ nodeId: component.id, nodeType: component.type, label: component.name })}
            >
              <div className="flex items-center gap-2 min-w-0">
                <NodePill
                  id={component.id}
                  name={component.name}
                  type="Component"
                />
                {props.componentType && (
                  <span className="text-[10px] text-text-dim">
                    {props.componentType}
                  </span>
                )}
              </div>
              {triggeredActions.length > 0 && (
                <span className="text-[10px] text-text-dim shrink-0">
                  {triggeredActions.length} action{triggeredActions.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </ExpandableSection>
  )
}
