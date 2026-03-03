import { apiFetch } from './client'
import type { TraversalResult, ImpactResult } from '@/lib/types'

export function fetchTraversal(
  id: string,
  options?: { depth?: number; edgeTypes?: string[] },
): Promise<TraversalResult> {
  const params = new URLSearchParams()
  if (options?.depth) params.set('depth', String(options.depth))
  if (options?.edgeTypes?.length) params.set('edgeTypes', options.edgeTypes.join(','))
  const qs = params.toString()
  return apiFetch<TraversalResult>(`/traverse/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`)
}

export function fetchImpact(id: string, hops?: number): Promise<ImpactResult> {
  const params = hops ? `?hops=${hops}` : ''
  return apiFetch<ImpactResult>(`/impact/${encodeURIComponent(id)}${params}`)
}
