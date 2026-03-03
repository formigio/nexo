import type { Node, SourceFileProps } from '@/lib/types'

interface SourceFileSectionProps {
  sourceFile: Node
}

export function SourceFileSection({ sourceFile }: SourceFileSectionProps) {
  const props = sourceFile.props as SourceFileProps

  return (
    <div data-testid="screen-detail-source-section" className="py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-secondary mb-2">
        Source File
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: '#56d364' }}
        />
        <span className="text-[12px] font-mono text-node-file">
          {props.repo && <span className="text-text-dim">{props.repo}/</span>}
          {props.relativePath}
        </span>
        {props.language && (
          <span className="text-[10px] text-text-dim ml-auto">{props.language}</span>
        )}
      </div>
    </div>
  )
}
