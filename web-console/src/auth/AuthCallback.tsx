import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleCallback } from './cognito'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('No authorization code received')
      return
    }

    handleCallback(code).then((success) => {
      if (success) {
        navigate('/', { replace: true })
      } else {
        setError('Failed to exchange authorization code')
      }
    })
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-body">
        <div className="text-center">
          <p className="text-text-primary text-lg mb-2">Authentication Error</p>
          <p className="text-text-dim text-sm mb-4">{error}</p>
          <a href="/" className="text-node-screen text-sm hover:underline">
            Return to home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex items-center justify-center bg-bg-body">
      <p className="text-text-dim text-sm">Signing in...</p>
    </div>
  )
}
