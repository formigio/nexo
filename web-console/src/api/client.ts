import { getAccessToken } from '@/auth/cognito'
import { isAuthEnabled } from '@/auth/config'

const BASE_URL = '/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }

  // Attach JWT when auth is enabled
  if (isAuthEnabled) {
    const token = await getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  })

  // On 401/403, try refresh once before giving up
  if (isAuthEnabled && (res.status === 401 || res.status === 403)) {
    const token = await getAccessToken() // will attempt refresh if expired
    if (token) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${token}` }
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...init, headers: retryHeaders })
      if (retryRes.ok) return retryRes.json()
    }
    // Refresh failed — redirect to login
    const { login } = await import('@/auth/cognito')
    login()
    throw new ApiError(res.status, 'Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error ?? res.statusText)
  }

  return res.json()
}
