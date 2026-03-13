import { apiFetch } from './client'
import type { Edge, EdgeType } from '@/lib/types'

export interface CreateEdgePayload {
  type: EdgeType
  from: string
  to: string
  metadata?: Record<string, unknown>
}

export function createEdgeApi(payload: CreateEdgePayload): Promise<Edge> {
  return apiFetch<Edge>('/edges', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteEdgeApi(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/edges/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
