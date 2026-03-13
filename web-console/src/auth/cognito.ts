import { authConfig } from './config'

const TOKEN_KEY = 'nexo_tokens'

interface TokenSet {
  access_token: string
  id_token: string
  refresh_token?: string
  expires_at: number
}

function getStoredTokens(): TokenSet | null {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TokenSet
  } catch {
    return null
  }
}

function storeTokens(tokens: TokenSet): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Generate a random code verifier for PKCE (RFC 7636)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Derive code challenge from verifier using S256
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Redirect the user to Cognito hosted UI for login.
 */
export async function login(): Promise<void> {
  const { domain, clientId, redirectUri } = authConfig
  if (!domain || !clientId || !redirectUri) return

  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  // Store verifier for the callback exchange
  sessionStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `${domain}/oauth2/authorize?${params}`
}

/**
 * Exchange authorization code for tokens (called from callback page).
 */
export async function handleCallback(code: string): Promise<boolean> {
  const { domain, clientId, redirectUri } = authConfig
  if (!domain || !clientId || !redirectUri) return false

  const verifier = sessionStorage.getItem('pkce_verifier')
  if (!verifier) return false

  sessionStorage.removeItem('pkce_verifier')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  })

  const res = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) return false

  const data = await res.json()
  storeTokens({
    access_token: data.access_token,
    id_token: data.id_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  })

  return true
}

/**
 * Refresh tokens using Cognito's /oauth2/token endpoint.
 */
async function refreshTokens(refreshToken: string): Promise<boolean> {
  const { domain, clientId } = authConfig
  if (!domain || !clientId) return false

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  })

  const res = await fetch(`${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) return false

  const data = await res.json()
  storeTokens({
    access_token: data.access_token,
    id_token: data.id_token,
    refresh_token: refreshToken, // Cognito doesn't return a new refresh token
    expires_at: Date.now() + data.expires_in * 1000,
  })
  return true
}

/**
 * Get the current access token, refreshing if expired.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) return null

  // Token still valid
  if (Date.now() < tokens.expires_at) {
    return tokens.access_token
  }

  // Try refresh
  if (tokens.refresh_token) {
    const refreshed = await refreshTokens(tokens.refresh_token)
    if (refreshed) {
      return getStoredTokens()!.access_token
    }
  }

  // Refresh failed — clear and return null
  clearTokens()
  return null
}

/**
 * Check if user is currently logged in (synchronous).
 * Returns true if access token is valid OR a refresh token is available.
 */
export function isLoggedIn(): boolean {
  const tokens = getStoredTokens()
  if (!tokens) return false
  return Date.now() < tokens.expires_at || Boolean(tokens.refresh_token)
}

/**
 * Log out: clear tokens and redirect to Cognito logout endpoint.
 */
export function logout(): void {
  clearTokens()

  const { domain, clientId, redirectUri } = authConfig
  if (!domain || !clientId || !redirectUri) {
    window.location.href = '/'
    return
  }

  // Redirect to root after logout instead of back to callback
  const logoutRedirect = redirectUri.replace('/auth/callback', '/')

  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutRedirect,
  })

  window.location.href = `${domain}/logout?${params}`
}
