'use client'

import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from './protected-route'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  requiredRole: string
  redirectTo?: string
}

/**
 * Component that protects routes based on Keycloak client roles
 * If user doesn't have the required role, they will be redirected
 */
export function RoleProtectedRoute({ children, requiredRole, redirectTo }: RoleProtectedRouteProps) {
  const { hasRole, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRole(requiredRole)) {
      // Redirect to unauthorized or specified redirect path
      router.push(redirectTo || '/')
    }
  }, [hasRole, requiredRole, isLoading, isAuthenticated, router, redirectTo])

  return (
    <ProtectedRoute>
      {isLoading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg">Loading...</div>
          </div>
        </div>
      ) : isAuthenticated && hasRole(requiredRole) ? (
        <>{children}</>
      ) : null}
    </ProtectedRoute>
  )
}
