import { ComponentPanel } from './ComponentPanel'
import { GenericNodePanel } from './GenericNodePanel'
import type { PanelEntry } from '@/hooks/usePanelStack'

interface PanelRouterProps {
  entry: PanelEntry
  onDrillIn: (entry: PanelEntry) => void
}

export function PanelRouter({ entry, onDrillIn }: PanelRouterProps) {
  switch (entry.nodeType) {
    case 'Component':
      return <ComponentPanel nodeId={entry.nodeId} onDrillIn={onDrillIn} />
    default:
      return <GenericNodePanel nodeId={entry.nodeId} onDrillIn={onDrillIn} />
  }
}
