'use client'

import { RoleProtectedRoute } from './role-protected-route'
import { DashboardContent as UserDashboard } from './dashboards/dashboard-content-user'
import { DashboardContent as VerifierDashboard } from './dashboards/dashboard-content-verifier'
import { DashboardContent as SponsorDashboard } from './dashboards/dashboard-content-sponsor'
import { DashboardContent as ProviderDashboard } from './dashboards/dashboard-content-provider'
import type { Project } from '@/types/api'

interface RoleProtectedPageProps {
  requiredRole: string
  projects: Project[]
  isLoading?: boolean
}

export function RoleProtectedPage({ requiredRole, projects, isLoading = false }: RoleProtectedPageProps) {
  // Select the appropriate dashboard component based on role
  let DashboardComponent: typeof UserDashboard

  switch (requiredRole) {
    case 'user':
      DashboardComponent = UserDashboard
      break
    case 'verifier':
      DashboardComponent = VerifierDashboard
      break
    case 'sponsor':
      DashboardComponent = SponsorDashboard
      break
    case 'provider':
      DashboardComponent = ProviderDashboard
      break
    default:
      DashboardComponent = UserDashboard
  }

  return (
    <RoleProtectedRoute requiredRole={requiredRole}>
      <DashboardComponent projects={projects} isLoading={isLoading} />
    </RoleProtectedRoute>
  )
}

