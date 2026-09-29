'use client'

import { useKeycloak } from '@react-keycloak/web'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { keycloak, initialized } = useKeycloak()
  const router = useRouter()

  useEffect(() => {
    if (initialized && !keycloak?.authenticated) {
      // Redirect to login if not authenticated
      keycloak?.login({
        redirectUri: window.location.origin + window.location.pathname,
      })
    }
  }, [initialized, keycloak, router])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!keycloak?.authenticated) {
    return null // Will redirect to login
  }

  return <>{children}</>
}

