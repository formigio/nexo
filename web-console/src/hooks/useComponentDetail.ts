import { useQuery } from '@tanstack/react-query'
import { fetchNodeEdges, fetchNodesBatch, fetchNode } from '@/api/nodes'
import type { Node } from '@/lib/types'

export interface ComponentDetail {
  component: Node
  displays: { field: Node; entity: Node | null }[]
  acceptsInput: { field: Node; entity: Node | null }[]
  triggers: { action: Node; endpoint: Node | null }[]
  sourceFile: Node | null
  feature: Node | null
}

export function useComponentDetail(componentId: string | undefined) {
  return useQuery({
    queryKey: ['component-detail', componentId],
    queryFn: () => fetchComponentDetail(componentId!),
    enabled: !!componentId,
    staleTime: 5 * 60 * 1000,
  })
}

async function fetchComponentDetail(componentId: string): Promise<ComponentDetail> {
  const [component, edges] = await Promise.all([
    fetchNode(componentId),
    fetchNodeEdges(componentId),
  ])

  // Categorize outbound edges from this component
  const displaysFieldIds: string[] = []
  const acceptsInputFieldIds: string[] = []
  const triggersActionIds: string[] = []
  let sourceFileId: string | null = null
  let featureId: string | null = null

  for (const edge of edges) {
    if (edge.in === componentId) {
      switch (edge.type) {
        case 'DISPLAYS':
          displaysFieldIds.push(edge.out)
          break
        case 'ACCEPTS_INPUT':
          acceptsInputFieldIds.push(edge.out)
          break
        case 'TRIGGERS':
          triggersActionIds.push(edge.out)
          break
        case 'IMPLEMENTED_IN':
          sourceFileId = edge.out
          break
        case 'BELONGS_TO':
          featureId = edge.out
          break
      }
    }
  }

  // Batch fetch all connected nodes
  const allIds = [
    ...displaysFieldIds,
    ...acceptsInputFieldIds,
    ...triggersActionIds,
    ...(sourceFileId ? [sourceFileId] : []),
    ...(featureId ? [featureId] : []),
  ]
  const connectedNodes = allIds.length > 0 ? await fetchNodesBatch(allIds) : []
  const nodeMap = new Map(connectedNodes.map((n) => [n.id, n]))

  // For data fields, resolve parent entities via HAS_FIELD edges
  const fieldIds = [...new Set([...displaysFieldIds, ...acceptsInputFieldIds])]
  let fieldEntityMap = new Map<string, Node>()
  if (fieldIds.length > 0) {
    const fieldEdgeArrays = await Promise.all(fieldIds.map((id) => fetchNodeEdges(id)))
    const entityIds = new Set<string>()
    const fieldToEntityId = new Map<string, string>()

    for (let i = 0; i < fieldIds.length; i++) {
      for (const edge of fieldEdgeArrays[i]) {
        // HAS_FIELD: in = DataEntity, out = DataField
        if (edge.type === 'HAS_FIELD' && edge.out === fieldIds[i]) {
          fieldToEntityId.set(fieldIds[i], edge.in)
          entityIds.add(edge.in)
        }
      }
    }

    if (entityIds.size > 0) {
      const entities = await fetchNodesBatch(Array.from(entityIds))
      const entityMap = new Map(entities.map((e) => [e.id, e]))
      for (const [fieldId, entityId] of fieldToEntityId) {
        const entity = entityMap.get(entityId)
        if (entity) fieldEntityMap.set(fieldId, entity)
      }
    }
  }

  // For actions, resolve CALLS -> endpoint
  const actionEndpointMap = new Map<string, Node>()
  if (triggersActionIds.length > 0) {
    const actionEdgeArrays = await Promise.all(
      triggersActionIds.map((id) => fetchNodeEdges(id)),
    )
    const endpointIds = new Set<string>()
    const actionToEndpointId = new Map<string, string>()

    for (let i = 0; i < triggersActionIds.length; i++) {
      for (const edge of actionEdgeArrays[i]) {
        if (edge.type === 'CALLS' && edge.in === triggersActionIds[i]) {
          actionToEndpointId.set(triggersActionIds[i], edge.out)
          endpointIds.add(edge.out)
        }
      }
    }

    if (endpointIds.size > 0) {
      const endpoints = await fetchNodesBatch(Array.from(endpointIds))
      const endpointMap = new Map(endpoints.map((e) => [e.id, e]))
      for (const [actionId, endpointId] of actionToEndpointId) {
        const endpoint = endpointMap.get(endpointId)
        if (endpoint) actionEndpointMap.set(actionId, endpoint)
      }
    }
  }

  // Assemble results
  const displays = displaysFieldIds
    .map((id) => ({ field: nodeMap.get(id)!, entity: fieldEntityMap.get(id) ?? null }))
    .filter((d) => d.field)

  const acceptsInput = acceptsInputFieldIds
    .map((id) => ({ field: nodeMap.get(id)!, entity: fieldEntityMap.get(id) ?? null }))
    .filter((d) => d.field)

  const triggers = triggersActionIds
    .map((id) => ({
      action: nodeMap.get(id)!,
      endpoint: actionEndpointMap.get(id) ?? null,
    }))
    .filter((t) => t.action)

  return {
    component,
    displays,
    acceptsInput,
    triggers,
    sourceFile: sourceFileId ? nodeMap.get(sourceFileId) ?? null : null,
    feature: featureId ? nodeMap.get(featureId) ?? null : null,
  }
}
