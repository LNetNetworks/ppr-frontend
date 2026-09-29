'use client'

import { ReactKeycloakProvider, useKeycloak } from '@react-keycloak/web'
import { createKeycloakClient, keycloakInitOptions } from '@/lib/keycloak'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { useUserService } from '@/lib/user-service'

/**
 * Syncs the current user with the backend once after login.
 * Must be rendered inside ReactKeycloakProvider so hooks work.
 */
function SyncOnAuth({ children }: { children: React.ReactNode }) {
  const { keycloak, initialized } = useKeycloak()
  const { syncUser } = useUserService()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (initialized && keycloak?.authenticated && !hasSynced.current) {
      hasSynced.current = true
      syncUser().catch((err) => {
        console.error('Failed to sync user on login:', err)
      })
    }
  }, [initialized, keycloak?.authenticated, syncUser])

  return <>{children}</>
}

export function KeycloakProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hasRefreshedOnAuth = useRef(false)
  const keycloak = useMemo(() => createKeycloakClient(), [])

  const setAuthCookie = (token: string) => {
    const encodedToken = encodeURIComponent(token)
    const existingMatch = document.cookie.match(/(?:^|; )kc_token=([^;]*)/)
    const existingToken = existingMatch ? decodeURIComponent(existingMatch[1]) : undefined

    let cookie = `kc_token=${encodedToken}; Path=/; SameSite=Lax`
    if (window.location.protocol === 'https:') {
      cookie += '; Secure'
    }

    document.cookie = cookie
    return existingToken !== token
  }

  const clearAuthCookie = () => {
    let cookie = 'kc_token=; Path=/; Max-Age=0; SameSite=Lax'
    if (window.location.protocol === 'https:') {
      cookie += '; Secure'
    }
    document.cookie = cookie
    hasRefreshedOnAuth.current = false
  }


  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={keycloakInitOptions}
      onEvent={(event, error) => {
        if (event === 'onAuthSuccess') {
          console.log('Authentication successful')
        } else if (event === 'onAuthError') {
          console.error('Authentication error:', error)
        } else if (event === 'onAuthLogout') {
          clearAuthCookie()
        } else if (event === 'onTokenExpired') {
          console.log('Token expired, refreshing...')
          keycloak.updateToken(30).catch((err) => {
            console.error('Failed to refresh token:', err)
            clearAuthCookie()
            router.push('/login')
          })
        }
      }}
      onTokens={(tokens) => {
        if (tokens.token) {
          console.log('Token updated')
          const didChange = setAuthCookie(tokens.token)
          if (didChange && !hasRefreshedOnAuth.current) {
            hasRefreshedOnAuth.current = true
            router.refresh()
          }
        } else {
          clearAuthCookie()
        }
      }}
    >
      <SyncOnAuth>{children}</SyncOnAuth>
    </ReactKeycloakProvider>
  )
}
