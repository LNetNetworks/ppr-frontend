import type { CreatePhaseProjectTaskPayload } from '@/types/api'

export const DEFAULT_PHASE_PROJECT_TASK_STATUS = 'pending' as const

export function withDefaultPhaseProjectTaskStatus(
  taskData: CreatePhaseProjectTaskPayload
): CreatePhaseProjectTaskPayload {
  return {
    ...taskData,
    status_task: DEFAULT_PHASE_PROJECT_TASK_STATUS,
  }
}
