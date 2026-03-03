import { apiFetch } from './client'

export interface AppInfo {
  app: string
  count: number
}

export function fetchApps(): Promise<AppInfo[]> {
  return apiFetch<AppInfo[]>('/apps')
}
