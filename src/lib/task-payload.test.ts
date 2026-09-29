import { describe, expect, it } from 'vitest'
import { DEFAULT_PHASE_PROJECT_TASK_STATUS, withDefaultPhaseProjectTaskStatus } from './task-payload'

describe('withDefaultPhaseProjectTaskStatus', () => {
  it('forces pending status when the payload omits it', () => {
    expect(
      withDefaultPhaseProjectTaskStatus({
        id_task: 'task-1',
      })
    ).toEqual({
      id_task: 'task-1',
      status_task: DEFAULT_PHASE_PROJECT_TASK_STATUS,
    })
  })

  it('overrides any provided status with pending', () => {
    expect(
      withDefaultPhaseProjectTaskStatus({
        id_task: 'task-1',
        status_task: 'closed',
      })
    ).toEqual({
      id_task: 'task-1',
      status_task: DEFAULT_PHASE_PROJECT_TASK_STATUS,
    })
  })
})
