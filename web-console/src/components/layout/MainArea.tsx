import type { ReactNode } from 'react'

interface MainAreaProps {
  children: ReactNode
}

export function MainArea({ children }: MainAreaProps) {
  return (
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  )
}
