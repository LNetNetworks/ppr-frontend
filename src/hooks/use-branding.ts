'use client'

import { getShowImportEvidence, getSidebarLogo } from '@/lib/app-config'
import { useAuth } from '@/hooks/use-auth'

export function useBranding() {
  const { azp, isLoading } = useAuth()

  return {
    azp,
    isLoading,
    sidebarLogo: getSidebarLogo(),
    showImportEvidence: getShowImportEvidence(),
  }
}
