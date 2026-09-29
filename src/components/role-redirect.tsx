'use client'

import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Component that redirects users to their role-specific dashboard
 * based on their Keycloak client roles
 */
export function RoleRedirect() {
  const { hasRole, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check roles in priority order and redirect to the first matching role
      if (hasRole('user')) {
        router.replace('/user')
      } else if (hasRole('verifier')) {
        router.replace('/verifier')
      } else if (hasRole('sponsor')) {
        router.replace('/sponsor')
      } else if (hasRole('provider')) {
        router.replace('/provider')
      }
      // If no role matches, stay on current page (or could redirect to unauthorized)
    }
  }, [hasRole, isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return null
}

