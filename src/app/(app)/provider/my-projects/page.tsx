import { fetchProjects } from '@/lib/api-services-server'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { ProjectsTable } from '@/components/projects-table'
import type { Project } from '@/types/api'

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
    <RoleProtectedRoute requiredRole="provider">
      <div className="space-y-8">
        <ProjectsTable
          projects={projectsArray}
          isLoading={isLoading}
          emptyMessage="No projects found"
          title="My Projects"
          description="The projects should be 1234"
        />
      </div>
    </RoleProtectedRoute>
  )
}
