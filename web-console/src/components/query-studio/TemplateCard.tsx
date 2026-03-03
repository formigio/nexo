import type { QueryTemplate } from '@/lib/query-templates'

interface TemplateCardProps {
  template: QueryTemplate
  isActive: boolean
  onClick: () => void
}

export function TemplateCard({ template, isActive, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isActive
          ? 'border-node-screen/50 bg-node-screen/[0.08]'
          : 'border-border-subtle hover:border-border-default hover:bg-white/[0.03]'
      }`}
    >
      <div className="text-[13px] font-medium text-text-primary leading-snug">
        {template.name}
      </div>
      <div className="text-[11px] text-text-dim mt-0.5 leading-snug">
        {template.description}
      </div>
    </button>
  )
}
