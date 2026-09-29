import { fetchProjects } from '@/lib/api-services-server'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import type { Project } from '@/types/api'
import { GridProjects } from '@/components/grids/grid-projects'

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
    <RoleProtectedRoute requiredRole="user">
      <div className="space-y-8">
        <GridProjects
          projects={projectsArray}
          isLoading={isLoading}
          emptyMessage="No projects found"
          title="My Projects"
          description="List of projects where you are the user. View project details, stages, and manage your own initiatives."
        />
      </div>
    </RoleProtectedRoute>
  )
}

