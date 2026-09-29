import { fetchProject, fetchProjectStages } from '@/lib/api-services-server'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { ProjectDetailsHeader } from '@/components/project-details-header'
import { TrackProjectView } from '@/components/track-project-view'
import type { Project, Phase } from '@/types/api'
import { StagesTableWithNewStageButton } from '@/components/tables/stages-table-with-new-stage-button'

interface ProjectDetailsPageProps {
  params: Promise<{ id: string }>
}

export default async function ProviderProjectDetailsPage({ params }: ProjectDetailsPageProps) {
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
      <RoleProtectedRoute requiredRole="provider">
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

  return (
    <RoleProtectedRoute requiredRole="provider">
      <TrackProjectView project={project} role="provider" />
      <div className="space-y-8">
        <ProjectDetailsHeader project={project} stages={stages} enableStatusEdit={true} />
        <StagesTableWithNewStageButton
          stages={stages}
          projectId={id}
          typeProject={(project as any).type_project}
          emptyMessage="No stages found for this project"
          title="Stages"
          description={`List of stages associated with project: ${id}`}
          showCreateModal={true}
        />
      </div>
    </RoleProtectedRoute>
  )
}
