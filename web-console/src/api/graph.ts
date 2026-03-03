import { apiFetch } from './client'
import type { Node, Edge } from '@/lib/types'

interface GraphResponse {
  nodes: Node[]
  edges: Edge[]
}

export function fetchGraph(app?: string): Promise<GraphResponse> {
  const params = app ? `?app=${encodeURIComponent(app)}` : ''
  return apiFetch<GraphResponse>(`/graph${params}`)
}
