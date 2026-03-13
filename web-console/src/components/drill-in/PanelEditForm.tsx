import { Link } from 'react-router-dom'
import { TagInput } from '@/components/shared/TagInput'

export interface EditDraft {
  name: string
  description: string
  tags: string[]
}

interface PanelEditFormProps {
  nodeId: string
  draft: EditDraft
  onChange: (draft: EditDraft) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  error: string | null
  isDirty: boolean
  showDiscardPrompt: boolean
  onConfirmDiscard: () => void
  onCancelDiscard: () => void
}

export function PanelEditForm({
  nodeId,
  draft,
  onChange,
  onSave,
  onCancel,
  isSaving,
  error,
  isDirty,
  showDiscardPrompt,
  onConfirmDiscard,
  onCancelDiscard,
}: PanelEditFormProps) {
  if (showDiscardPrompt) {
    return (
      <div className="p-4 border border-border-default rounded bg-surface-2 space-y-3">
        <p className="text-[13px] text-text-primary">Discard unsaved changes?</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirmDiscard}
            className="px-3 py-1.5 rounded text-[12px] bg-impact-breaking/20 text-impact-breaking hover:bg-impact-breaking/30 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={onCancelDiscard}
            className="px-3 py-1.5 rounded text-[12px] bg-surface-2 border border-border-default text-text-secondary hover:text-text-primary transition-colors"
          >
            Keep Editing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-impact-breaking/10 border border-impact-breaking/30 rounded p-2 text-[12px] text-impact-breaking">
          {error}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">Name</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          className="w-full bg-surface-2 border border-border-default rounded px-3 py-2 text-[14px] text-text-primary focus:border-node-screen focus:outline-none transition-colors"
          disabled={isSaving}
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">Description</label>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={3}
          className="w-full bg-surface-2 border border-border-default rounded px-3 py-2 text-[13px] text-text-primary focus:border-node-screen focus:outline-none transition-colors resize-y"
          disabled={isSaving}
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-text-secondary mb-1">Tags</label>
        <TagInput
          tags={draft.tags}
          onChange={(tags) => onChange({ ...draft, tags })}
          disabled={isSaving}
        />
      </div>

      {isDirty && (
        <div className="flex items-center gap-1.5 text-[11px] text-node-action">
          <span className="w-1.5 h-1.5 rounded-full bg-node-action" />
          Unsaved changes
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="px-4 py-1.5 rounded text-[12px] font-medium bg-node-screen text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-3 py-1.5 rounded text-[12px] bg-surface-2 border border-border-default text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <span className="flex-1" />
        <Link
          to={`/nodes/${nodeId}/edit`}
          className="text-[11px] text-node-screen hover:underline transition-colors"
        >
          Advanced Edit &rarr;
        </Link>
      </div>
    </div>
  )
}
