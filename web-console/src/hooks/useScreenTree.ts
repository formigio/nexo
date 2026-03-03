import { useQuery } from '@tanstack/react-query'
import { fetchScreenTree } from '@/api/screens'
import type { Node, Edge, ScreenProps } from '@/lib/types'
import { ACCESS_LEVEL_ORDER } from '@/lib/constants'

export interface ScreenTreeNode {
  screen: Node
  children: ScreenTreeNode[]
}

export interface ScreenTreeGroup {
  accessLevel: string
  screens: ScreenTreeNode[]
}

function buildTree(screens: Node[], childEdges: Edge[]): ScreenTreeGroup[] {
  // Build parent lookup: childScreenId -> parentScreenId
  // CHILD_OF edge: in = child, out = parent
  const parentOf = new Map<string, string>()
  for (const edge of childEdges) {
    parentOf.set(edge.in, edge.out)
  }

  // Build children lookup: parentScreenId -> child screens
  const childrenOf = new Map<string, Node[]>()
  const rootScreens: Node[] = []
  const screenMap = new Map(screens.map((s) => [s.id, s]))

  for (const screen of screens) {
    const parentId = parentOf.get(screen.id)
    if (parentId && screenMap.has(parentId)) {
      const existing = childrenOf.get(parentId) ?? []
      existing.push(screen)
      childrenOf.set(parentId, existing)
    } else {
      rootScreens.push(screen)
    }
  }

  // Recursively build tree nodes
  function buildNode(screen: Node): ScreenTreeNode {
    const children = (childrenOf.get(screen.id) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(buildNode)
    return { screen, children }
  }

  // Group root screens by access level
  const groups = new Map<string, Node[]>()
  for (const screen of rootScreens) {
    const props = screen.props as ScreenProps
    const level = props.accessLevel ?? 'authenticated'
    const existing = groups.get(level) ?? []
    existing.push(screen)
    groups.set(level, existing)
  }

  // Sort groups by defined order, then alphabetically within each group
  const result: ScreenTreeGroup[] = []
  for (const level of ACCESS_LEVEL_ORDER) {
    const screens = groups.get(level)
    if (screens) {
      result.push({
        accessLevel: level,
        screens: screens
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(buildNode),
      })
      groups.delete(level)
    }
  }

  // Any remaining access levels not in the predefined order
  for (const [level, screens] of groups) {
    result.push({
      accessLevel: level,
      screens: screens
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(buildNode),
    })
  }

  return result
}

export function useScreenTree(app?: string) {
  return useQuery({
    queryKey: ['screens', app ?? 'default'],
    queryFn: () => fetchScreenTree(app),
    select: (data) => buildTree(data.screens, data.childEdges),
    staleTime: 5 * 60 * 1000,
  })
}
