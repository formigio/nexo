import type { ReactNode } from 'react'

interface SidebarProps {
  children: ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside
      data-testid="sidebar-root"
      className="w-60 bg-surface-1 border-r border-border-default overflow-y-auto shrink-0"
    >
      {children}
    </aside>
  )
}
