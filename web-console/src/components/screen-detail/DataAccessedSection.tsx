import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { NodePill } from '@/components/shared/NodePill'
import { useDataAccessed, type FieldAccess } from '@/hooks/useDataAccessed'
import type { DataFieldProps } from '@/lib/types'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface DataAccessedSectionProps {
  componentIds: string[]
  onDrillIn: (entry: PanelEntry) => void
}

const ACCESS_COLORS: Record<string, string> = {
  displays: '#3fb950',
  accepts_input: '#ffa657',
  writes: '#f47067',
}

const ACCESS_LABELS: Record<string, string> = {
  displays: 'read',
  accepts_input: 'input',
  writes: 'write',
}

function AccessBadge({ type }: { type: string }) {
  const color = ACCESS_COLORS[type] ?? '#8b949e'
  const label = ACCESS_LABELS[type] ?? type
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  )
}

function FieldRow({ fa, onDrillIn }: { fa: FieldAccess; onDrillIn: (entry: PanelEntry) => void }) {
  const props = fa.field.props as DataFieldProps
  return (
    <div
      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer"
      onClick={() => onDrillIn({ nodeId: fa.field.id, nodeType: fa.field.type, label: fa.field.name })}
    >
      <span className="text-[12px] text-text-primary">{fa.field.name}</span>
      {props.fieldType && (
        <span className="text-[10px] text-text-dim">{props.fieldType}</span>
      )}
      {props.required && (
        <span className="text-[10px] text-status-error font-medium">required</span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        {fa.accessTypes.map((type) => (
          <AccessBadge key={type} type={type} />
        ))}
      </div>
    </div>
  )
}

export function DataAccessedSection({ componentIds, onDrillIn }: DataAccessedSectionProps) {
  const { data, isLoading } = useDataAccessed(componentIds)

  if (isLoading || !data) return null

  const totalFields = data.entities.reduce((sum, e) => sum + e.fields.length, 0) + data.orphanFields.length
  if (totalFields === 0) return null

  return (
    <ExpandableSection
      id="screen-detail-data-section"
      title="Data Accessed"
      count={totalFields}
    >
      <div className="space-y-3">
        {data.entities.map((entityAccess) => (
          <div key={entityAccess.entity.id}>
            <div
              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/[0.04] transition-colors cursor-pointer mb-1"
              onClick={() =>
                onDrillIn({
                  nodeId: entityAccess.entity.id,
                  nodeType: entityAccess.entity.type,
                  label: entityAccess.entity.name,
                })
              }
            >
              <NodePill
                id={entityAccess.entity.id}
                name={entityAccess.entity.name}
                type="DataEntity"
              />
              <span className="text-[10px] text-text-dim ml-auto">
                {entityAccess.fields.length} field{entityAccess.fields.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="ml-4 border-l border-white/[0.06] pl-2">
              {entityAccess.fields.map((fa) => (
                <FieldRow key={fa.field.id} fa={fa} onDrillIn={onDrillIn} />
              ))}
            </div>
          </div>
        ))}

        {data.orphanFields.length > 0 && (
          <div>
            <div className="text-[10px] text-text-dim uppercase tracking-wide px-2 py-1">
              Ungrouped Fields
            </div>
            <div className="ml-4">
              {data.orphanFields.map((fa) => (
                <FieldRow key={fa.field.id} fa={fa} onDrillIn={onDrillIn} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ExpandableSection>
  )
}
