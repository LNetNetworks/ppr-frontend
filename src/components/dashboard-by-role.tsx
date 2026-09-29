'use client'

import { useAuth } from '@/hooks/use-auth'
import { DashboardContent as UserDashboard } from './dashboards/dashboard-content-user'
import { DashboardContent as VerifierDashboard } from './dashboards/dashboard-content-verifier'
import { DashboardContent as SponsorDashboard } from './dashboards/dashboard-content-sponsor'
import { DashboardContent as ProviderDashboard } from './dashboards/dashboard-content-provider'
import type { Project } from '@/types/api'

interface DashboardByRoleProps {
  projects: Project[]
  isLoading?: boolean
}

/**
 * Component that renders the appropriate dashboard based on user's role
 * Checks roles in priority order: user > verifier > sponsor > provider
 */
export function DashboardByRole({ projects, isLoading = false }: DashboardByRoleProps) {
  const { hasRole, isLoading: authLoading, isAuthenticated } = useAuth()

  // Show loading state while checking authentication
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  // Check roles in priority order and render the first matching dashboard
  if (hasRole('user')) {
    return <UserDashboard projects={projects} isLoading={isLoading} />
  } else if (hasRole('verifier')) {
    return <VerifierDashboard projects={projects} isLoading={isLoading} />
  } else if (hasRole('sponsor')) {
    return <SponsorDashboard projects={projects} isLoading={isLoading} />
  } else if (hasRole('provider')) {
    return <ProviderDashboard projects={projects} isLoading={isLoading} />
  }

  // If no role matches, show a message
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg">No role assigned. Please contact your administrator.</div>
      </div>
    </div>
  )
}

