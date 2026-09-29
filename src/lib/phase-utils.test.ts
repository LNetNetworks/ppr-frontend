import { describe, expect, it } from 'vitest'
import { resolvePhaseTemplateId } from './phase-utils'

describe('resolvePhaseTemplateId', () => {
  it('returns the canonical phase template id when it is already available', () => {
    expect(
      resolvePhaseTemplateId({
        id: 'pp_023',
        idPhaseProject: 'pp_023',
        idPhase: 'pha_111',
        projectId: 'prj_014',
        name: 'Phase',
      } as any)
    ).toBe('pha_111')
  })

  it('normalizes legacy project-phase ids into template ids when needed', () => {
    expect(
      resolvePhaseTemplateId({
        id: 'pp_023',
        idPhaseProject: 'pp_023',
        projectId: 'prj_014',
        name: 'Phase',
      } as any)
    ).toBe('pha_023')
  })

  it('falls back to a non-project identifier when no canonical id exists', () => {
    expect(
      resolvePhaseTemplateId({
        id: 'legacy-phase-id',
        idPhaseProject: 'pp_023',
        projectId: 'prj_014',
        name: 'Phase',
      } as any)
    ).toBe('legacy-phase-id')
  })
})
