import { useScreenTree, type ScreenTreeGroup as ScreenTreeGroupType } from '@/hooks/useScreenTree'
import { ScreenTreeGroup } from './ScreenTreeGroup'
import { ScreenTreeItem } from './ScreenTreeItem'
import { LoadingState } from '@/components/shared/LoadingState'
import { ErrorState } from '@/components/shared/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'

interface ScreenTreeProps {
  app?: string
  searchQuery?: string
}

export function ScreenTree({ app, searchQuery }: ScreenTreeProps) {
  const { data: groups, isLoading, error, refetch } = useScreenTree(app)

  if (isLoading) return <LoadingState message="Loading screens..." />
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />
  if (!groups || groups.length === 0) {
    return <EmptyState message="No screens found" testId="sidebar-empty" />
  }

  // Count total visible screens per group when searching
  function countVisibleScreens(group: ScreenTreeGroupType): number {
    if (!searchQuery) return countAllScreens(group.screens)
    return group.screens.reduce((acc, node) => acc + countMatchingScreens(node, searchQuery!), 0)
  }

  return (
    <nav data-testid="sidebar-screen-tree" className="py-2">
      {groups.map((group) => {
        const count = countVisibleScreens(group)
        if (searchQuery && count === 0) return null
        return (
          <ScreenTreeGroup
            key={group.accessLevel}
            accessLevel={group.accessLevel}
            count={count}
            defaultExpanded
          >
            {group.screens.map((node) => (
              <ScreenTreeItem
                key={node.screen.id}
                node={node}
                searchQuery={searchQuery}
              />
            ))}
          </ScreenTreeGroup>
        )
      })}
    </nav>
  )
}

function countAllScreens(nodes: ScreenTreeGroupType['screens']): number {
  return nodes.reduce((acc, n) => acc + 1 + countAllScreens(n.children), 0)
}

function countMatchingScreens(node: ScreenTreeGroupType['screens'][0], query: string): number {
  const q = query.toLowerCase()
  const props = node.screen.props as { route?: string }
  const matches =
    node.screen.name.toLowerCase().includes(q) ||
    (props.route?.toLowerCase().includes(q) ?? false)
  const childCount = node.children.reduce((acc, c) => acc + countMatchingScreens(c, q), 0)
  return (matches ? 1 : 0) + childCount
}
