import { useQuery } from '@tanstack/react-query'
import { fetchNodeEdges, fetchNodesBatch } from '@/api/nodes'
import type { Node } from '@/lib/types'

export interface FieldAccess {
  field: Node
  accessTypes: ('displays' | 'accepts_input' | 'writes')[]
  componentIds: string[]
}

export interface EntityAccess {
  entity: Node
  fields: FieldAccess[]
}

export interface DataAccessedResult {
  entities: EntityAccess[]
  orphanFields: FieldAccess[]
}

export function useDataAccessed(componentIds: string[]) {
  const key = componentIds.slice().sort().join(',')

  return useQuery({
    queryKey: ['data-accessed', key],
    queryFn: () => fetchDataAccessed(componentIds),
    enabled: componentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

async function fetchDataAccessed(componentIds: string[]): Promise<DataAccessedResult> {
  // Step 1: Fetch all component edges in parallel
  const edgeArrays = await Promise.all(componentIds.map((id) => fetchNodeEdges(id)))

  // Step 2: Collect field IDs with their access types and source components
  const fieldAccessMap = new Map<string, { accessTypes: Set<string>; componentIds: Set<string> }>()

  for (let i = 0; i < componentIds.length; i++) {
    const compId = componentIds[i]
    for (const edge of edgeArrays[i]) {
      if (edge.in !== compId) continue

      let accessType: string | null = null
      if (edge.type === 'DISPLAYS') accessType = 'displays'
      else if (edge.type === 'ACCEPTS_INPUT') accessType = 'accepts_input'
      else if (edge.type === 'WRITES') accessType = 'writes'

      if (accessType) {
        const existing = fieldAccessMap.get(edge.out) ?? {
          accessTypes: new Set<string>(),
          componentIds: new Set<string>(),
        }
        existing.accessTypes.add(accessType)
        existing.componentIds.add(compId)
        fieldAccessMap.set(edge.out, existing)
      }
    }
  }

  if (fieldAccessMap.size === 0) {
    return { entities: [], orphanFields: [] }
  }

  // Step 3: Fetch all field nodes
  const fieldIds = Array.from(fieldAccessMap.keys())
  const fieldNodes = await fetchNodesBatch(fieldIds)
  const fieldNodeMap = new Map(fieldNodes.map((n) => [n.id, n]))

  // Step 4: For each field, find its parent entity via HAS_FIELD edges
  const fieldEdgeArrays = await Promise.all(fieldIds.map((id) => fetchNodeEdges(id)))
  const fieldToEntityId = new Map<string, string>()
  const entityIds = new Set<string>()

  for (let i = 0; i < fieldIds.length; i++) {
    for (const edge of fieldEdgeArrays[i]) {
      // HAS_FIELD: in = DataEntity, out = DataField
      if (edge.type === 'HAS_FIELD' && edge.out === fieldIds[i]) {
        fieldToEntityId.set(fieldIds[i], edge.in)
        entityIds.add(edge.in)
      }
    }
  }

  // Step 5: Fetch all entity nodes
  let entityNodeMap = new Map<string, Node>()
  if (entityIds.size > 0) {
    const entityNodes = await fetchNodesBatch(Array.from(entityIds))
    entityNodeMap = new Map(entityNodes.map((n) => [n.id, n]))
  }

  // Step 6: Group fields by entity
  const entityFieldsMap = new Map<string, FieldAccess[]>()
  const orphanFields: FieldAccess[] = []

  for (const [fieldId, access] of fieldAccessMap) {
    const field = fieldNodeMap.get(fieldId)
    if (!field) continue

    const fieldAccess: FieldAccess = {
      field,
      accessTypes: Array.from(access.accessTypes) as FieldAccess['accessTypes'],
      componentIds: Array.from(access.componentIds),
    }

    const entityId = fieldToEntityId.get(fieldId)
    if (entityId && entityNodeMap.has(entityId)) {
      const existing = entityFieldsMap.get(entityId) ?? []
      existing.push(fieldAccess)
      entityFieldsMap.set(entityId, existing)
    } else {
      orphanFields.push(fieldAccess)
    }
  }

  // Step 7: Build sorted result
  const entities: EntityAccess[] = []
  for (const [entityId, fields] of entityFieldsMap) {
    const entity = entityNodeMap.get(entityId)!
    entities.push({
      entity,
      fields: fields.sort((a, b) => a.field.name.localeCompare(b.field.name)),
    })
  }
  entities.sort((a, b) => a.entity.name.localeCompare(b.entity.name))
  orphanFields.sort((a, b) => a.field.name.localeCompare(b.field.name))

  return { entities, orphanFields }
}
