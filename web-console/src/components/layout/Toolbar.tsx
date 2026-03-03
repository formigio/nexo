import { useMemo, useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AppSwitcher } from '@/components/layout/AppSwitcher'
import { GlobalSearchDropdown } from '@/components/layout/GlobalSearchDropdown'
import type { Node } from '@/lib/types'

interface ToolbarProps {
  appName: string
  onAppChange: (app: string) => void
  globalSearchQuery: string
  onGlobalSearchChange: (query: string) => void
  onNodeSelect: (node: Node) => void
}

export function Toolbar({ appName, onAppChange, globalSearchQuery, onGlobalSearchChange, onNodeSelect }: ToolbarProps) {
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Context-aware graph href
  const graphHref = useMemo(() => {
    const path = location.pathname
    const screenMatch = path.match(/^\/screens\/(.+)$/)
    if (screenMatch) return `/graph?node=${encodeURIComponent(screenMatch[1])}`
    const featureMatch = path.match(/^\/features\/(.+)$/)
    if (featureMatch) return `/graph?feature=${encodeURIComponent(featureMatch[1])}`
    return '/graph'
  }, [location.pathname])

  const navItems = [
    { href: '/', label: 'Navigator', match: (p: string) => p === '/' || p.startsWith('/screens') },
    { href: '/features', label: 'Features', match: (p: string) => p.startsWith('/features') },
    { href: '/query', label: 'Query Studio', match: (p: string) => p === '/query' },
    { href: graphHref, label: 'Graph', match: (p: string) => p === '/graph' },
  ]

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearchChange(value: string) {
    onGlobalSearchChange(value)
    setIsDropdownOpen(value.length > 0)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onGlobalSearchChange('')
      setIsDropdownOpen(false)
    }
  }

  function handleSelect(node: Node) {
    onNodeSelect(node)
    onGlobalSearchChange('')
    setIsDropdownOpen(false)
  }

  return (
    <header
      data-testid="toolbar-root"
      className="h-[52px] flex items-center justify-between px-4 bg-surface-1 border-b border-border-default shrink-0"
    >
      <div className="flex items-center gap-4">
        <a
          data-testid="toolbar-logo-link"
          href="/"
          className="text-[16px] font-semibold text-text-primary hover:text-node-screen transition-colors"
        >
          Nexo
        </a>
        <AppSwitcher app={appName} onAppChange={onAppChange} />
        <nav className="flex items-center gap-1 ml-2">
          {navItems.map(({ href, label, match }) => (
            <a
              key={label}
              href={href}
              className={`text-[12px] font-medium px-2.5 py-1.5 rounded transition-colors ${
                match(location.pathname)
                  ? 'text-text-primary bg-surface-2'
                  : 'text-text-dim hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div ref={containerRef} className="relative flex items-center gap-3">
        <input
          data-testid="global-search-input"
          type="text"
          placeholder="Search nodes..."
          value={globalSearchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => globalSearchQuery.length > 0 && setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-56 px-3 py-1.5 text-[13px] rounded bg-surface-2 border border-border-default text-text-primary placeholder:text-text-dim focus:outline-none focus:border-node-screen transition-colors"
        />
        {isDropdownOpen && (
          <GlobalSearchDropdown
            query={globalSearchQuery}
            app={appName}
            onSelect={handleSelect}
            onClose={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    </header>
  )
}
