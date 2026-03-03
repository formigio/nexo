import { useQuery } from '@tanstack/react-query'
import { fetchNode, fetchNodesBatch, fetchNodeEdges } from '@/api/nodes'
import type { Node, Edge, EdgeType } from '@/lib/types'

export interface ScreenDetail {
  screen: Node
  components: Node[]
  userActions: Node[]
  businessRules: Node[]
  userStates: Node[]
  feature: Node | null
  sourceFile: Node | null
  edges: Edge[]
}

export function useScreenDetail(screenId: string | undefined) {
  // Step 1: fetch the screen node and its edges in parallel
  const screenQuery = useQuery({
    queryKey: ['node', screenId],
    queryFn: () => fetchNode(screenId!),
    enabled: !!screenId,
    staleTime: 5 * 60 * 1000,
  })

  const edgesQuery = useQuery({
    queryKey: ['node', screenId, 'edges'],
    queryFn: () => fetchNodeEdges(screenId!),
    enabled: !!screenId,
    staleTime: 5 * 60 * 1000,
  })

  // Step 2: resolve connected nodes from edges
  const connectedNodeIds = edgesQuery.data
    ? getConnectedNodeIds(edgesQuery.data, screenId!)
    : []

  const connectedQuery = useQuery({
    queryKey: ['nodes', 'batch', connectedNodeIds.sort().join(',')],
    queryFn: () => fetchNodesBatch(connectedNodeIds),
    enabled: connectedNodeIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Step 3: fetch edges for components to find TRIGGERS
  const componentIds = connectedQuery.data
    ?.filter((n) => n.type === 'Component')
    .map((n) => n.id) ?? []

  const componentEdgesQuery = useQuery({
    queryKey: ['component-edges', componentIds.sort().join(',')],
    queryFn: async () => {
      const allEdges: Edge[] = []
      for (const id of componentIds) {
        const edges = await fetchNodeEdges(id)
        allEdges.push(...edges)
      }
      return allEdges
    },
    enabled: componentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Step 4: resolve action/rule nodes discovered from component edges
  const secondaryNodeIds = componentEdgesQuery.data
    ? getSecondaryNodeIds(componentEdgesQuery.data, componentIds, connectedNodeIds)
    : []

  const secondaryQuery = useQuery({
    queryKey: ['nodes', 'batch', 'secondary', secondaryNodeIds.sort().join(',')],
    queryFn: () => fetchNodesBatch(secondaryNodeIds),
    enabled: secondaryNodeIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Assemble the full detail
  const isLoading =
    screenQuery.isLoading ||
    edgesQuery.isLoading ||
    (connectedNodeIds.length > 0 && connectedQuery.isLoading)
  const error = screenQuery.error ?? edgesQuery.error ?? connectedQuery.error

  let detail: ScreenDetail | undefined
  if (screenQuery.data && edgesQuery.data && connectedQuery.data) {
    const allNodes = [...connectedQuery.data, ...(secondaryQuery.data ?? [])]
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]))
    const allEdges = [...edgesQuery.data, ...(componentEdgesQuery.data ?? [])]

    detail = assembleDetail(
      screenQuery.data,
      screenId!,
      nodeMap,
      allEdges,
    )
  }

  return { data: detail, isLoading, error }
}

function getConnectedNodeIds(edges: Edge[], screenId: string): string[] {
  const ids = new Set<string>()
  for (const edge of edges) {
    if (edge.in !== screenId) ids.add(edge.in)
    if (edge.out !== screenId) ids.add(edge.out)
  }
  return Array.from(ids)
}

function getSecondaryNodeIds(
  componentEdges: Edge[],
  componentIds: string[],
  alreadyFetched: string[],
): string[] {
  const known = new Set([...componentIds, ...alreadyFetched])
  const ids = new Set<string>()
  for (const edge of componentEdges) {
    if (edge.type === 'TRIGGERS' || edge.type === 'DISPLAYS' || edge.type === 'ACCEPTS_INPUT') {
      if (!known.has(edge.out)) ids.add(edge.out)
    }
  }
  return Array.from(ids)
}

function assembleDetail(
  screen: Node,
  screenId: string,
  nodeMap: Map<string, Node>,
  edges: Edge[],
): ScreenDetail {
  const componentsMap = new Map<string, Node>()
  const userStatesMap = new Map<string, Node>()
  let feature: Node | null = null
  let sourceFile: Node | null = null

  // Process screen's direct edges
  for (const edge of edges) {
    if (edge.in !== screenId) continue
    const target = nodeMap.get(edge.out)
    if (!target) continue

    switch (edge.type as EdgeType) {
      case 'RENDERS':
        componentsMap.set(target.id, target)
        break
      case 'REQUIRES_STATE':
        userStatesMap.set(target.id, target)
        break
      case 'BELONGS_TO':
        if (target.type === 'Feature') feature = target
        break
      case 'IMPLEMENTED_IN':
        if (target.type === 'SourceFile') sourceFile = target
        break
    }
  }

  const components = Array.from(componentsMap.values())
  const userStates = Array.from(userStatesMap.values())

  // Find user actions triggered by this screen's components
  const componentIdSet = new Set(components.map((c) => c.id))
  const userActions: Node[] = []
  const seenActions = new Set<string>()

  for (const edge of edges) {
    if (edge.type === 'TRIGGERS' && componentIdSet.has(edge.in)) {
      const action = nodeMap.get(edge.out)
      if (action && !seenActions.has(action.id)) {
        seenActions.add(action.id)
        userActions.push(action)
      }
    }
  }

  // Find business rules that constrain found actions or validate related fields
  const actionIdSet = new Set(userActions.map((a) => a.id))
  const businessRules: Node[] = []
  const seenRules = new Set<string>()

  for (const edge of edges) {
    if (
      (edge.type === 'CONSTRAINS' && actionIdSet.has(edge.out)) ||
      (edge.type === 'VALIDATES')
    ) {
      const rule = nodeMap.get(edge.in)
      if (rule && rule.type === 'BusinessRule' && !seenRules.has(rule.id)) {
        seenRules.add(rule.id)
        businessRules.push(rule)
      }
    }
  }

  return {
    screen,
    components: components.sort((a, b) => a.name.localeCompare(b.name)),
    userActions: userActions.sort((a, b) => a.name.localeCompare(b.name)),
    businessRules: businessRules.sort((a, b) => a.name.localeCompare(b.name)),
    userStates: userStates.sort((a, b) => a.name.localeCompare(b.name)),
    feature,
    sourceFile,
    edges,
  }
}
