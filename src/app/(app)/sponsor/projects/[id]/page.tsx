import { fetchProject, fetchProjectStages } from '@/lib/api-services-server'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { ProjectDetailsHeader } from '@/components/project-details-header'
import { TrackProjectView } from '@/components/track-project-view'
import type { Project, Phase } from '@/types/api'
import { StagesTable } from '@/components/tables/stages-table'

interface ProjectDetailsPageProps {
  params: Promise<{ id: string }>
}

export default async function SponsorProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = await params

  let project: Project | null = null
  let stages: Phase[] = []
  let error: string | null = null

  try {
    project = await fetchProject(id)
    stages = await fetchProjectStages(id)
  } catch (err) {
    console.error('Failed to fetch project details:', err)
    error = err instanceof Error ? err.message : 'Failed to load project details'
  }

  if (error || !project) {
    return (
      <RoleProtectedRoute requiredRole="sponsor">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-red-600 dark:text-red-400">
              {error || 'Project not found'}
            </div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  // Calculate project total contributed (same logic as ProjectDetailsHeader)
  const tokenBalanceStr = project.token_balance as string | undefined
  const projectTotalContributed = tokenBalanceStr
    ? parseFloat(tokenBalanceStr)
    : (project.total_contributed_amount as number) || 0

  return (
    <RoleProtectedRoute requiredRole="sponsor">
      <TrackProjectView project={project} role="sponsor" />
      <div className="space-y-8">
        <ProjectDetailsHeader project={project} stages={stages} />
        <StagesTable
          stages={stages}
          projectId={id}
          projectTotalContributed={projectTotalContributed}
          enablePayment={true}
          hideActions={true}
          emptyMessage="No stages found for this project"
          title="Stages"
          description={`List of stages associated with project: ${id}`}
        />
      </div>
    </RoleProtectedRoute>
  )
}
