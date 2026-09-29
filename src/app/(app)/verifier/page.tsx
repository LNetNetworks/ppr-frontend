import { fetchAuditRevisions, fetchProjectHasAuditableStages, fetchProjects } from '@/lib/api-services-server'
import { RoleProtectedPage } from '@/components/role-protected-page'
import type { Project } from '@/types/api'

function resolveProjectId(project: Project): string {
  return String(project.id || (project as any).id_project || (project as any).project_id || '').trim()
}

export default async function VerifierPage() {
  let projects: Project[] = []
  let isLoading = false

  try {
    const allProjects = await fetchProjects()
    const [allAudits, stageRequirements] = await Promise.all([
      fetchAuditRevisions(),
      Promise.all(
        allProjects.map(async (project) => {
          const projectId = resolveProjectId(project)
          if (!projectId) return { projectId, requiresAuditStage: false }

          try {
            const requiresAuditStage = await fetchProjectHasAuditableStages(projectId)
            return { projectId, requiresAuditStage }
          } catch (error) {
            console.warn(`Failed to evaluate audit-required stages for project ${projectId}:`, error)
            return { projectId, requiresAuditStage: false }
          }
        })
      ),
    ])

    const plannedAuditProjectIds = new Set(
      allAudits
        .filter((audit) => String(audit.status || '').toLowerCase() === 'planned')
        .map((audit) => String(audit.idProject || '').trim())
        .filter(Boolean)
    )

    const projectIdsWithAuditableStages = new Set(
      stageRequirements
        .filter((item) => item.requiresAuditStage)
        .map((item) => item.projectId)
        .filter(Boolean)
    )

    projects = allProjects
      .map((project) => ({
        ...project,
        id: resolveProjectId(project),
      }))
      .filter((project) => {
        const projectId = resolveProjectId(project)
        if (!projectId) return false
        return plannedAuditProjectIds.has(projectId) || projectIdsWithAuditableStages.has(projectId)
      })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }

  return <RoleProtectedPage requiredRole="verifier" projects={projects} isLoading={isLoading} />
}
