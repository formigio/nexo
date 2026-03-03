import { apiFetch } from './client'
import type { Node, Edge, NodeType } from '@/lib/types'

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
