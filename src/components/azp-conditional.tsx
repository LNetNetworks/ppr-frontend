'use client'

import { useAuth } from '@/hooks/use-auth'
import { config } from '@/lib/config'

interface AzpConditionalProps {
  renderA: React.ReactNode
  renderB: React.ReactNode
  expectedAzp?: string
  loadingFallback?: React.ReactNode
}

/**
 * Renders A or B depending on the `azp` claim of the Keycloak token.
 * Default logic: if (azp !== KEYCLOAK_CLIENT_ID) render A, otherwise render B.
 *
 * The expected value comes from config rather than a literal: it is the same
 * `clientId` Keycloak is initialized with, so renaming the client in Keycloak
 * cannot silently desynchronize this comparison.
 */
export function AzpConditional({
  renderA,
  renderB,
  expectedAzp,
  loadingFallback = null,
}: AzpConditionalProps) {
  const { azp, isLoading } = useAuth()
  const resolvedAzp = expectedAzp ?? config.keycloakClientId()

  if (isLoading) {
    return <>{loadingFallback}</>
  }

  return azp !== resolvedAzp ? <>{renderA}</> : <>{renderB}</>
}
