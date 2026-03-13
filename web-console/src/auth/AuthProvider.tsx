import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { isAuthEnabled } from './config'
import { isLoggedIn as checkLoggedIn, login as cognitoLogin, logout as cognitoLogout } from './cognito'

interface AuthContextValue {
  isLoggedIn: boolean
  loading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  loading: true,
  login: () => {},
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthEnabled) {
      // No auth configured (local dev) — skip login
      setLoggedIn(true)
      setLoading(false)
      return
    }
    setLoggedIn(checkLoggedIn())
    setLoading(false)
  }, [])

  const value: AuthContextValue = {
    isLoggedIn: loggedIn,
    loading,
    login: cognitoLogin,
    logout: cognitoLogout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
