import { fetchProjects } from '@/lib/api-services-server'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { Heading } from '@/components/heading'
import { ProjectsWithSearch } from '@/components/projects-with-search'
import { Button } from '@/components/button'
import type { Project } from '@/types/api'
import { PlusIcon } from '@heroicons/react/16/solid'
import HeaderWithSearchBar from '@/components/header-with-search-bar'
import { ProjectsTableWithNewProjectButton } from '@/components/tables/projects-table-with-new-project-button'

export default async function MyProjectsPage() {
  // Fetch projects from API
  // Authentication token is optional for now but ready to be implemented
  let projects: Project[] = []
  let isLoading = false

  try {
    projects = await fetchProjects()
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    // On error, projects will be empty array
  }

  // Ensure projects is always an array
  const projectsArray = Array.isArray(projects) ? projects : []

  return (
    <RoleProtectedRoute requiredRole="sponsor">
      <div className="space-y-8">
        <ProjectsTableWithNewProjectButton
          projects={projectsArray}
          isLoading={isLoading}
          emptyMessage="No projects found"
          title="My Projects"
          description="List of projects where you are the sponsor. View project details, stages, and manage your own initiatives."
          buttonText="New Project"
          showCreateModal={true}
        />
      </div>
    </RoleProtectedRoute>
  )
}
