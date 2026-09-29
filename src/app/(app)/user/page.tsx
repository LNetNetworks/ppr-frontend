import { fetchProjects } from '@/lib/api-services-server'
import { RoleProtectedPage } from '@/components/role-protected-page'

import type { Project } from '@/types/api'

export default async function UserPage() {
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

  return <RoleProtectedPage requiredRole="user" projects={projects} isLoading={isLoading} />
}
