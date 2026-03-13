export const authConfig = {
  domain: import.meta.env.VITE_COGNITO_DOMAIN as string | undefined,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined,
  redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI as string | undefined,
}

/** Auth is enabled when all Cognito env vars are set */
export const isAuthEnabled =
  Boolean(authConfig.domain) &&
  Boolean(authConfig.clientId) &&
  Boolean(authConfig.redirectUri)
