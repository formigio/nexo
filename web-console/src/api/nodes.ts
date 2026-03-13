import { apiFetch } from './client'
import { getEdgeLabel } from '@/lib/edge-labels'
import type { Node, Edge, NodeType, EdgeType } from '@/lib/types'

export interface CreateNodePayload {
  type: NodeType
  app: string
  name: string
  description?: string
  tags?: string[]
  props?: Record<string, unknown>
}

export function createNodeApi(payload: CreateNodePayload): Promise<Node> {
  return apiFetch<Node>('/nodes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface UpdateNodePayload {
  name?: string
  description?: string
  tags?: string[]
  props?: Record<string, unknown>
}

export function updateNodeApi(id: string, payload: UpdateNodePayload): Promise<Node> {
  return apiFetch<Node>(`/nodes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteNodeApi(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/nodes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function fetchNode(id: string): Promise<Node> {
  return apiFetch<Node>(`/nodes/${encodeURIComponent(id)}`)
}

export function fetchNodesBatch(ids: string[]): Promise<Node[]> {
  if (ids.length === 0) return Promise.resolve([])
  const params = ids.map((id) => `ids=${encodeURIComponent(id)}`).join('&')
  return apiFetch<Node[]>(`/nodes?${params}`)
}

export function fetchNodeEdges(id: string): Promise<Edge[]> {
  return apiFetch<Edge[]>(`/nodes/${encodeURIComponent(id)}/edges`)
}

export function fetchAllNodes(options?: { app?: string; type?: NodeType }): Promise<Node[]> {
  const params = new URLSearchParams()
  if (options?.app) params.set('app', options.app)
  if (options?.type) params.set('type', options.type)
  const qs = params.toString()
  return apiFetch<Node[]>(`/nodes/search${qs ? `?${qs}` : ''}`)
}

export function searchNodes(
  query: string,
  options?: { app?: string; type?: NodeType },
): Promise<Node[]> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (options?.app) params.set('app', options.app)
  if (options?.type) params.set('type', options.type)
  const qs = params.toString()
  return apiFetch<Node[]>(`/nodes/search${qs ? `?${qs}` : ''}`)
}

// ── Shared detail fetching ──────────────────────────────────

export interface NodeEditDetail {
  node: Node
  outbound: { edge: Edge; node: Node }[]
  inbound: { edge: Edge; node: Node }[]
}

export async function fetchNodeEditDetail(nodeId: string): Promise<NodeEditDetail> {
  const [node, edges] = await Promise.all([
    fetchNode(nodeId),
    fetchNodeEdges(nodeId),
  ])

  const connectedIds = new Set<string>()
  for (const e of edges) {
    if (e.in !== nodeId) connectedIds.add(e.in)
    if (e.out !== nodeId) connectedIds.add(e.out)
  }

  const connected = connectedIds.size > 0
    ? await fetchNodesBatch(Array.from(connectedIds))
    : []
  const nodeMap = new Map(connected.map((n) => [n.id, n]))

  const outbound: NodeEditDetail['outbound'] = []
  const inbound: NodeEditDetail['inbound'] = []

  for (const edge of edges) {
    if (edge.in === nodeId && nodeMap.has(edge.out)) {
      outbound.push({ edge, node: nodeMap.get(edge.out)! })
    } else if (edge.out === nodeId && nodeMap.has(edge.in)) {
      inbound.push({ edge, node: nodeMap.get(edge.in)! })
    }
  }

  return { node, outbound, inbound }
}

export interface EdgeGroupItem {
  edge: Edge
  node: Node
}

export interface EdgeGroup {
  edgeType: string
  label: string
  items: EdgeGroupItem[]
  /** @deprecated Use items[].node instead */
  nodes: Node[]
}

export function groupByEdgeType(
  items: { edge: Edge; node: Node }[],
  direction: 'outbound' | 'inbound',
): EdgeGroup[] {
  const groups = new Map<string, EdgeGroup>()
  for (const { edge, node } of items) {
    if (!groups.has(edge.type)) {
      groups.set(edge.type, {
        edgeType: edge.type,
        label: getEdgeLabel(edge.type as EdgeType, direction),
        items: [],
        nodes: [],
      })
    }
    const g = groups.get(edge.type)!
    g.items.push({ edge, node })
    g.nodes.push(node)
  }
  return Array.from(groups.values())
}
