import { apiFetch } from './client'
import type { Node, Edge } from '@/lib/types'

export interface FeatureSummary extends Node {
  scopeCounts: Record<string, number>
  scopeTotal: number
}

export interface FeatureScope {
  feature: Node
  members: Node[]
  edges: Edge[]
  belongsToEdges: Edge[]
}

export function fetchFeatureSummaries(app?: string): Promise<FeatureSummary[]> {
  const params = app ? `?app=${encodeURIComponent(app)}` : ''
  return apiFetch<FeatureSummary[]>(`/features/summary${params}`)
}

export function fetchFeatureScope(id: string): Promise<FeatureScope> {
  return apiFetch<FeatureScope>(`/features/${encodeURIComponent(id)}/scope`)
}
