'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { ProjectDetailsHeader } from '@/components/project-details-header'
import { TasksTable } from '@/components/tables/tasks-table'
import { useToast } from '@/components/toast'
import { useFetchProject, useFetchProjectPhaseTasks, useFetchProjectStages } from '@/lib/api-services'
import type { Task, Phase, Project } from '@/types/api'

function TasksPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const phaseId = searchParams.get('phaseId') || ''
  const fetchProject = useFetchProject()
  const fetchProjectPhaseTasks = useFetchProjectPhaseTasks()
  const fetchProjectStages = useFetchProjectStages()
  const { error: showError } = useToast()

  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Phase[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentPhase = stages.find((stage) => stage.idPhase === phaseId || stage.idPhaseProject === phaseId || stage.id === phaseId) || null
  const headerProject = project
    ? {
        ...project,
        name: (currentPhase?.name || '').trim() || `Phase ${phaseId}`,
      }
    : null

  useEffect(() => {
    const loadData = async () => {
      if (!phaseId) {
        setError('Phase ID is required')
        setIsLoading(false)
        return
      }

      if (!projectId) {
        setError('Project ID is required')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Fetch project, tasks, and stages in parallel
        const [fetchedProject, fetchedTasks, fetchedStages] = await Promise.all([
          fetchProject(projectId),
          fetchProjectPhaseTasks(projectId, phaseId),
          fetchProjectStages(projectId),
        ])

        setProject(fetchedProject)
        setTasks(fetchedTasks)
        setStages(fetchedStages)
      } catch (err) {
        console.error('Failed to fetch data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
        setError(errorMessage)
        showError(errorMessage)
        setProject(null)
        setStages([])
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, phaseId])

  if (!phaseId) {
    return (
      <RoleProtectedRoute requiredRole="sponsor">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-red-600 dark:text-red-400">
              Phase ID is required
            </div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (error) {
    return (
      <RoleProtectedRoute requiredRole="sponsor">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute requiredRole="sponsor">
      <div className="space-y-8">
        {headerProject && <ProjectDetailsHeader project={headerProject} stages={stages} />}
        <TasksTable
          tasks={tasks}
          isLoading={isLoading}
          emptyMessage="No tasks found for this stage"
          title="Tasks"
          description={`List of tasks associated with project: ${projectId}`}
        />
      </div>
    </RoleProtectedRoute>
  )
}

export default function SponsorProjectTasksPage() {
  return (
    <Suspense fallback={
      <RoleProtectedRoute requiredRole="sponsor">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-zinc-500 dark:text-zinc-400">
              Loading...
            </div>
          </div>
        </div>
      </RoleProtectedRoute>
    }>
      <TasksPageContent />
    </Suspense>
  )
}
