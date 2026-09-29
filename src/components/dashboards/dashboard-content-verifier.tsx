'use client'

import { Stat } from '@/app/stat'
import { Heading, Subheading } from '@/components/heading'
import { Select } from '@/components/select'
import { ProjectsTable } from '@/components/projects-table'
import type { Project } from '@/types/api'
import { useKeycloak } from '@react-keycloak/web'

interface DashboardContentProps {
  projects: Project[]
  isLoading?: boolean
}

export function DashboardContent({ projects, isLoading = false }: DashboardContentProps) {
  const { keycloak } = useKeycloak()

  // Get user info from Keycloak token (same logic as sidebar)
  const userDisplayName =
    (keycloak?.tokenParsed?.name as string | undefined) ??
    (keycloak?.tokenParsed?.preferred_username as string | undefined) ??
    'User'

  // Ensure projects is always an array
  const projectsArray = Array.isArray(projects) ? projects : []

  // Calculate stats from projects
  const totalProjects = projectsArray.length
  const ongoingProjects = projectsArray.filter((p) => p.status === 'inprogress').length
  const completedProjects = projectsArray.filter((p) => p.status === 'closed').length
  const cancelledProjects = projectsArray.filter((p) => p.status === 'canceled').length

  return (
    <>
      <Heading>Hey, {userDisplayName}</Heading>
      <div className="mt-8 flex items-end justify-between">
        <Subheading>Overview</Subheading>
      </div>
      <div className="mt-4 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Projects" value={totalProjects.toString()} change="0%" />
        <Stat title="On-Going Projects" value={ongoingProjects.toString()} change="0%" />
        <Stat title="Completed Projects" value={completedProjects.toString()} change="0%" />
        <Stat title="Cancelled Projects" value={cancelledProjects.toString()} change="0%" />
      </div>
      <Subheading className="mt-14">Projects</Subheading>
      <ProjectsTable projects={projectsArray} isLoading={isLoading} emptyMessage="No projects found" />
    </>
  )
}
