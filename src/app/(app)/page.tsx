import { fetchProjects } from '@/lib/api-services-server'
import { DashboardByRole } from '@/components/dashboard-by-role'
import type { Project } from '@/types/api'

export default async function Home() {
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

  return <DashboardByRole projects={projects} isLoading={isLoading} />
}
