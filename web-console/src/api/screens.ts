import { apiFetch } from './client'
import type { ScreenTreeResponse } from '@/lib/types'

export function fetchScreenTree(app?: string): Promise<ScreenTreeResponse> {
  const params = app ? `?app=${encodeURIComponent(app)}` : ''
  return apiFetch<ScreenTreeResponse>(`/screens${params}`)
}
