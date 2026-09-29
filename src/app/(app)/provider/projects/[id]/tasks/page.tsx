'use client'

import { RoleProtectedRoute } from '@/components/role-protected-route'
import { useToast } from '@/components/toast'
import { TasksTableWithNewTaskButton } from '@/components/tables/tasks-table-with-new-task-button'
import type { Phase, Task } from '@/types/api'
import { useFetchProjectPhaseTasks, useFetchProjectStages } from '@/lib/api-services'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

function stageMatchesPhaseId(stage: Phase, phaseId: string): boolean {
  const candidates = [stage.idPhase, stage.idPhaseProject, stage.id].filter(Boolean)
  return candidates.includes(phaseId)
}

function TasksPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const phaseId = searchParams.get('phaseId') || ''
  const fetchProjectPhaseTasks = useFetchProjectPhaseTasks()
  const fetchProjectStages = useFetchProjectStages()
  const { error: showError } = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [stages, setStages] = useState<Phase[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasksReloadTrigger, setTasksReloadTrigger] = useState(0)

  const selectedStage = useMemo(() => stages.find((stage) => stageMatchesPhaseId(stage, phaseId)) || null, [stages, phaseId])
  const resolvedPhaseProjectId = selectedStage?.idPhaseProject || phaseId

  // Load stages on mount
  useEffect(() => {
    const loadStages = async () => {
      if (!projectId) return

      try {
        const fetchedStages = await fetchProjectStages(projectId)
        setStages(fetchedStages)
      } catch (err) {
        console.error('Failed to fetch stages:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stages'
        showError(errorMessage)
      }
    }

    loadStages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Load tasks when phaseId changes
  useEffect(() => {
    const loadData = async () => {
      if (!phaseId || !projectId) {
        setTasks([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const fetchedTasks = await fetchProjectPhaseTasks(projectId, resolvedPhaseProjectId)
        setTasks(fetchedTasks)
      } catch (err) {
        console.error('Failed to fetch data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
        setError(errorMessage)
        showError(errorMessage)
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, phaseId, resolvedPhaseProjectId, tasksReloadTrigger])

  if (error) {
    return (
      <RoleProtectedRoute requiredRole="provider">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-lg text-red-600 dark:text-red-400">{error}</div>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute requiredRole="provider">
      <div>
        <TasksTableWithNewTaskButton
          tasks={tasks}
          projectId={projectId}
          phaseProjectId={resolvedPhaseProjectId}
          phaseId={selectedStage?.idPhase || selectedStage?.id}
          isLoading={isLoading}
          emptyMessage="No tasks found for this stage"
          showCreateModal={true}
          onTasksChanged={() => setTasksReloadTrigger((prev) => prev + 1)}
        />
      </div>
    </RoleProtectedRoute>
  )
}

export default function ProviderProjectTasksPage() {
  return (
    <Suspense
      fallback={
        <RoleProtectedRoute requiredRole="provider">
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-lg text-zinc-500 dark:text-zinc-400">Loading...</div>
            </div>
          </div>
        </RoleProtectedRoute>
      }
    >
      <TasksPageContent />
    </Suspense>
  )
}
