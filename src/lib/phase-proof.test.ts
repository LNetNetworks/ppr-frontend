import type { Phase } from '@/types/api'
import { describe, expect, it } from 'vitest'
import { getStageProofPreview } from './phase-proof'

const baseStage: Phase = {
  id: 'pp_1',
  idPhaseProject: 'pp_1',
  idPhase: 'pha_1',
  projectId: 'project_1',
  name: 'Stage 1',
}

describe('getStageProofPreview', () => {
  it('detects a proof from a stage hash', () => {
    const proof = getStageProofPreview({
      ...baseStage,
      hash: 'tx_123',
    })

    expect(proof).toMatchObject({
      hash: 'tx_123',
      hasProof: true,
    })
  })

  it('detects a proof from linked evidence without requiring a hash', () => {
    const proof = getStageProofPreview({
      ...baseStage,
      evidences: [
        {
          id_evidence: 'ev_1',
          uri: 'https://example.com/proof.pdf',
        },
      ],
    })

    expect(proof).toMatchObject({
      fileUrl: 'https://example.com/proof.pdf',
      uri: 'https://example.com/proof.pdf',
      hasProof: true,
    })
  })

  it('keeps upload hidden after a successful upload without a hash response', () => {
    const proof = getStageProofPreview(baseStage, { hasProof: true })

    expect(proof.hasProof).toBe(true)
  })
})
