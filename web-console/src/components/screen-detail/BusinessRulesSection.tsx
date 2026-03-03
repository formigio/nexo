import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { NodePill } from '@/components/shared/NodePill'
import type { Node, BusinessRuleProps } from '@/lib/types'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface BusinessRulesSectionProps {
  rules: Node[]
  onDrillIn: (entry: PanelEntry) => void
}

export function BusinessRulesSection({ rules, onDrillIn }: BusinessRulesSectionProps) {
  return (
    <ExpandableSection
      id="screen-detail-rules-section"
      title="Business Rules"
      count={rules.length}
    >
      <div className="space-y-1">
        {rules.map((rule) => {
          const props = rule.props as BusinessRuleProps
          return (
            <div
              key={rule.id}
              data-testid={`screen-detail-rule-${rule.id}-item`}
              className="py-1.5 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
              onClick={() => onDrillIn({ nodeId: rule.id, nodeType: rule.type, label: rule.name })}
            >
              <div className="flex items-center gap-2">
                <NodePill id={rule.id} name={rule.name} type="BusinessRule" />
                {props.ruleType && (
                  <span className="text-[10px] text-text-dim">{props.ruleType}</span>
                )}
                {props.enforcement && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-dim">
                    {props.enforcement}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ExpandableSection>
  )
}
