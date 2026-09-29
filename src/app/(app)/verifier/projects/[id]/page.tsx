import { Subheading } from '@/components/heading'
import { ProjectDetailsHeader } from '@/components/project-details-header'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { StagesTable } from '@/components/tables/stages-table'
import { TrackProjectView } from '@/components/track-project-view'
import { fetchProject, fetchProjectEvidences, fetchProjectStages } from '@/lib/api-services-server'
import { formatHashPreview } from '@/lib/hash-utils'
import type { Evidence, Phase, Project } from '@/types/api'

interface ProjectDetailsPageProps {
  params: Promise<{ id: string }>
}

export default async function VerifierProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = await params

  let project: Project | null = null
  let stages: Phase[] = []
  let evidences: Evidence[] = []
  let error: string | null = null

  try {
    // Project details are mandatory for this view; auxiliary resources degrade gracefully.
    project = await fetchProject(id)

    const [stageResult, evidenceResult] = await Promise.allSettled([fetchProjectStages(id), fetchProjectEvidences(id)])

    if (stageResult.status === 'fulfilled') {
      stages = stageResult.value
    } else {
      console.warn(`Failed to fetch stages for project ${id}:`, stageResult.reason)
    }

    if (evidenceResult.status === 'fulfilled') {
      evidences = evidenceResult.value
    } else {
      console.warn(`Failed to fetch evidences for project ${id}:`, evidenceResult.reason)
    }
  } catch (err) {
    console.error('Failed to fetch project details:', err)
    error = err instanceof Error ? err.message : 'Failed to load project details'
  }

  if (error || !project) {
    return (
      <RoleProtectedRoute requiredRole="verifier">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-red-600 dark:text-red-400">{error || 'Project not found'}</div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute requiredRole="verifier">
      <TrackProjectView project={project} role="verifier" />
      <div className="space-y-8">
        <ProjectDetailsHeader project={project} stages={stages} />

        <Subheading>Stages</Subheading>
        <StagesTable
          stages={stages}
          projectId={id}
          hideActions={true}
          emptyMessage="No stages found for this project"
          description={`List of stages associated with project: ${id}`}
        />

        <div id="evidences" className="scroll-mt-24">
          <Subheading>Evidences</Subheading>
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Hash</th>
                  <th className="px-4 py-3 font-medium">File</th>
                </tr>
              </thead>
              <tbody>
                {evidences.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                      No evidences found for this project.
                    </td>
                  </tr>
                ) : (
                  evidences.map((evidence, index) => {
                    const name = evidence.name || evidence.file_name || 'Untitled evidence'
                    const hash = evidence.hash || evidence.tx_hash || evidence.txHash || ''
                    const fileUrl = evidence.fileUrl || evidence.uri || ''

                    return (
                      <tr
                        key={evidence.id || evidence.id_evidence || `${name}-${index}`}
                        className="border-t border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                          {hash ? (
                            <a
                              href={`https://explorer.l-net.io/tx/${hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline-offset-2 hover:underline"
                            >
                              {formatHashPreview(hash)}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                            >
                              View file
                            </a>
                          ) : (
                            <span className="text-zinc-500 dark:text-zinc-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}
