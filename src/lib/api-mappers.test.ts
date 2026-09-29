import { describe, expect, it } from 'vitest'
import {
  transformApiOrganization,
  transformApiPhase,
  transformApiProject,
  transformApiTask,
  transformApiUser,
} from './api-mappers'

describe('transformApiProject', () => {
  it('normalizes project identifiers, names and common aliases', () => {
    const result = transformApiProject({
      id_project: '  42  ',
      name_project: '  Demo project  ',
      description: 'Project description',
      id_organization: 'org-1',
      token_balance: '55',
      wallet_provider: 'stellar',
      extraFlag: true,
    } as any)

    expect(result).toMatchObject({
      id: '42',
      name: 'Demo project',
      description: 'Project description',
      organizationId: 'org-1',
      tokenBalance: '55',
      walletProvider: 'stellar',
      extraFlag: true,
    })
  })

  it('falls back to generic id and name fields', () => {
    const result = transformApiProject({
      id: 'project-7',
      name: 'Fallback project',
    } as any)

    expect(result.id).toBe('project-7')
    expect(result.name).toBe('Fallback project')
  })

  it('keeps normalized project id even when raw payload also includes a conflicting id field', () => {
    const result = transformApiProject({
      id_project: 'project-42',
      id: 'legacy-wrong-id',
      name_project: 'Canonical project',
      name: 'Legacy name',
    } as any)

    expect(result.id).toBe('project-42')
    expect(result.name).toBe('Canonical project')
  })
})

describe('transformApiPhase', () => {
  it('maps mixed backend conventions into the phase shape', () => {
    const result = transformApiPhase({
      id_phase_project: 'phase-project-1',
      id_phase: 'phase-1',
      id_project: 'project-1',
      phaseName: 'Kickoff',
      require_evidence: true,
      require_contribution: true,
      require_auditory: false,
      status_phase: 'active',
      phase_order: 2,
      contribution_required: 100,
      stage_weight: 25,
    } as any)

    expect(result).toMatchObject({
      id: 'phase-project-1',
      idPhaseProject: 'phase-project-1',
      idPhase: 'phase-1',
      projectId: 'project-1',
      name: 'Kickoff',
      requireEvidence: true,
      requireContribution: true,
      requireAuditory: false,
      status: 'active',
      order: 2,
      contributionRequired: 100,
      stageWeight: 25,
    })
  })

  it('uses the phase project id as a fallback for idPhase when needed', () => {
    const result = transformApiPhase({
      phase_project_id: 'phase-project-2',
      project_id: 'project-2',
      name_phase: 'Validation',
    } as any)

    expect(result.id).toBe('phase-project-2')
    expect(result.idPhaseProject).toBe('phase-project-2')
    expect(result.idPhase).toBe('phase-project-2')
    expect(result.projectId).toBe('project-2')
    expect(result.name).toBe('Validation')
  })

  it('keeps normalized phase IDs even when raw payload includes a conflicting id field', () => {
    const result = transformApiPhase({
      id_phase_project: 'phase-project-9',
      id_phase: 'phase-template-9',
      id: 'legacy-phase-id',
      id_project: 'project-9',
      name_phase: 'Execution',
    } as any)

    expect(result.id).toBe('phase-project-9')
    expect(result.idPhaseProject).toBe('phase-project-9')
    expect(result.idPhase).toBe('phase-template-9')
    expect(result.projectId).toBe('project-9')
  })
})

describe('transformApiTask', () => {
  it('prefers nested task details when present', () => {
    const result = transformApiTask({
      id_task: 'task-1',
      id_phase_project: 'phase-1',
      status_task: 'open',
      task: {
        name_task: 'Nested task',
        description: 'Nested description',
        assigned_to: 'user-1',
        due_date: '2026-05-01',
        created_at: '2026-01-01',
        updated_at: '2026-02-01',
      },
    })

    expect(result).toMatchObject({
      id: 'task-1',
      name: 'Nested task',
      description: 'Nested description',
      status: 'open',
      phaseId: 'phase-1',
      id_phase_project: 'phase-1',
      assignedTo: 'user-1',
      dueDate: '2026-05-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-02-01',
    })
  })

  it('falls back to flat task fields when no nested task exists', () => {
    const result = transformApiTask({
      id: 'task-2',
      name_task: 'Flat task',
      description: 'Flat description',
      status: 'done',
      phase_id: 'phase-2',
      assignedTo: 'user-2',
      dueDate: '2026-06-01',
      createdAt: '2026-03-01',
      updatedAt: '2026-03-02',
    })

    expect(result).toMatchObject({
      id: 'task-2',
      name: 'Flat task',
      description: 'Flat description',
      status: 'done',
      phaseId: 'phase-2',
      id_phase_project: 'phase-2',
      assignedTo: 'user-2',
      dueDate: '2026-06-01',
      createdAt: '2026-03-01',
      updatedAt: '2026-03-02',
    })
  })
})

describe('transformApiUser', () => {
  it('maps user data from top-level aliases and nested user payloads', () => {
    const result = transformApiUser({
      id_project_user: 'member-1',
      userName: 'alice',
      userUserEmail: 'alice@example.com',
      role: 'verifier',
      user: {
        id_user: 'ignored-nested-id',
      },
    })

    expect(result).toMatchObject({
      id: 'member-1',
      username: 'alice',
      mail: 'alice@example.com',
      type: 'verifier',
    })
  })

  it('falls back to nested user fields when top-level fields are absent', () => {
    const result = transformApiUser({
      user: {
        id_user: 'user-9',
        username: 'nested-user',
        email: 'nested@example.com',
        role: 'provider',
        created_at: '2026-02-10',
      },
    })

    expect(result).toMatchObject({
      id: 'user-9',
      username: 'nested-user',
      mail: 'nested@example.com',
      type: 'provider',
      createdAt: '2026-02-10',
    })
  })
})

describe('transformApiOrganization', () => {
  it('normalizes organization id and name across backend aliases', () => {
    const result = transformApiOrganization({
      id_organization: 'org-1',
      organization_name: 'Organization name',
      region: 'LATAM',
    })

    expect(result).toMatchObject({
      id: 'org-1',
      name: 'Organization name',
      region: 'LATAM',
    })
  })

  it('uses the id as a fallback name and returns null without an id', () => {
    expect(
      transformApiOrganization({
        organization_id: 'org-2',
      })
    ).toMatchObject({
      id: 'org-2',
      name: 'org-2',
    })

    expect(transformApiOrganization({ name: 'No id org' })).toBeNull()
  })
})
