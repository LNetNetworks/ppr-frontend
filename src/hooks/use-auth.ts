'use client'

import { useKeycloak } from '@react-keycloak/web'
import { keycloakConfig } from '@/lib/keycloak'

/**
 * Custom hook to access Keycloak authentication state and tokens
 */
export function useAuth() {
  const { keycloak, initialized } = useKeycloak()

  // Get client roles from token
  const getClientRoles = (): string[] => {
    if (!keycloak?.tokenParsed?.resource_access) {
      return []
    }

    const resourceAccess = keycloak.tokenParsed.resource_access as Record<
      string,
      { roles?: string[] }
    >
    const clientRoles = resourceAccess[keycloakConfig.clientId]?.roles || []

    return clientRoles
  }

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    const roles = getClientRoles()
    return roles.includes(role)
  }

  // Check if user has any of the provided roles
  const hasAnyRole = (roles: string[]): boolean => {
    const userRoles = getClientRoles()
    return roles.some((role) => userRoles.includes(role))
  }

  return {
    isAuthenticated: keycloak?.authenticated ?? false,
    isLoading: !initialized,
    token: keycloak?.token,
    tokenParsed: keycloak?.tokenParsed,
    azp: (keycloak?.tokenParsed?.azp as string | undefined) ?? undefined,
    idTokenParsed: keycloak?.idTokenParsed,
    userInfo: keycloak?.tokenParsed
      ? {
        name: (keycloak.tokenParsed?.name as string | undefined) ?? undefined,
        email: (keycloak.tokenParsed?.email as string | undefined) ?? undefined,
        preferredUsername: (keycloak.tokenParsed?.preferred_username as string | undefined) ?? undefined,
        sub: (keycloak.tokenParsed?.sub as string | undefined) ?? undefined,
      }
      : undefined,
    roles: getClientRoles(),
    hasRole,
    hasAnyRole,
    login: (options?: { redirectUri?: string }) => {
      if (keycloak) {
        keycloak.login({
          redirectUri: options?.redirectUri || window.location.origin,
        })
      }
    },
    logout: (options?: { redirectUri?: string }) => {
      if (keycloak) {
        keycloak.logout({
          redirectUri: options?.redirectUri || window.location.origin,
        })
      }
    },
    getAuthorizationHeader: () => {
      if (keycloak?.token) {
        return `Bearer ${keycloak.token}`
      }
      return undefined
    },
  }
}
