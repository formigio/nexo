import { TagInput } from '@/components/shared/TagInput'
import { TypeBadge } from '@/components/shared/TypeBadge'
import { TypeSpecificFields } from '@/components/create-node/TypeSpecificFields'
import type { Node, NodeType } from '@/lib/types'
import type { FullEditDraft } from '@/hooks/useFullNodeEdit'

interface NodeEditFormProps {
  node: Node
  draft: FullEditDraft
  onDraftChange: (partial: Partial<FullEditDraft>) => void
  onPropsChange: (key: string, value: unknown) => void
  fieldErrors: { field: string; message: string }[]
  onBlur: (field: string) => void
  isSaving: boolean
}

export function NodeEditForm({
  node,
  draft,
  onDraftChange,
  onPropsChange,
  fieldErrors,
  onBlur,
  isSaving,
}: NodeEditFormProps) {
  const nameError = fieldErrors.find((e) => e.field === 'name')?.message

  return (
    <div className="space-y-5">
      {/* Type (read-only) */}
      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">Type</label>
        <TypeBadge type={node.type as NodeType} />
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">
          Name <span className="text-node-rule">*</span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onDraftChange({ name: e.target.value })}
          onBlur={() => onBlur('name')}
          disabled={isSaving}
          className="w-full bg-surface-2 border border-border-default rounded px-3 py-2 text-[14px] text-text-primary focus:border-node-screen focus:outline-none transition-colors"
        />
        {nameError && <p className="mt-1 text-[11px] text-node-rule">{nameError}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">Description</label>
        <textarea
          value={draft.description}
          onChange={(e) => onDraftChange({ description: e.target.value })}
          rows={4}
          disabled={isSaving}
          className="w-full bg-surface-2 border border-border-default rounded px-3 py-2 text-[13px] text-text-primary focus:border-node-screen focus:outline-none transition-colors resize-y"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">Tags</label>
        <TagInput
          tags={draft.tags}
          onChange={(tags) => onDraftChange({ tags })}
          disabled={isSaving}
        />
      </div>

      {/* Type-specific properties */}
      <div className="border-t border-border-default pt-5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-4">
          Type-specific properties
        </h3>
        <div className="space-y-3">
          <TypeSpecificFields
            type={node.type as NodeType}
            props={draft.props}
            onPropsChange={onPropsChange}
            fieldErrors={fieldErrors}
            onBlur={onBlur}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
