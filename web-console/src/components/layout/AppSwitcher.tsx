import { useQuery } from '@tanstack/react-query'
import { fetchApps } from '@/api/apps'

interface AppSwitcherProps {
  app: string
  onAppChange: (app: string) => void
}

export function AppSwitcher({ app, onAppChange }: AppSwitcherProps) {
  const { data: apps = [] } = useQuery({
    queryKey: ['apps'],
    queryFn: fetchApps,
    staleTime: 60_000,
  })

  // If only one app (or still loading), show static badge
  if (apps.length <= 1) {
    return (
      <span className="text-[12px] font-medium px-2 py-1 rounded bg-surface-2 text-text-secondary border border-border-subtle">
        {app}
      </span>
    )
  }

  return (
    <select
      data-testid="toolbar-app-selector"
      value={app}
      onChange={(e) => onAppChange(e.target.value)}
      className="text-[12px] font-medium px-2 py-1 rounded bg-surface-2 text-text-secondary border border-border-subtle cursor-pointer hover:border-border-default focus:outline-none focus:border-node-screen transition-colors appearance-none"
      style={{ backgroundImage: 'none', paddingRight: '1.5rem' }}
    >
      {apps.map((a) => (
        <option key={a.app} value={a.app}>
          {a.app} ({a.count})
        </option>
      ))}
    </select>
  )
}
