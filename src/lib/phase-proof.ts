import type { Phase } from '@/types/api'

type ProofRecord = Record<string, unknown>

export type StageProofPreview = {
  hash?: string
  fileUrl?: string
  uri?: string
  hasProof: boolean
}

export type UploadedStageProof = Partial<Omit<StageProofPreview, 'hasProof'>> & {
  hasProof?: boolean
}

const normalizeString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined

  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : undefined
}

const getProofHash = (record?: ProofRecord): string | undefined => {
  if (!record) return undefined

  return normalizeString(record.hash) || normalizeString(record.txHash) || normalizeString(record.tx_hash)
}

const getProofFileUrl = (record?: ProofRecord): string | undefined => {
  if (!record) return undefined

  return normalizeString(record.fileUrl) || normalizeString(record.uri) || normalizeString(record.file_url)
}

const getProofUri = (record?: ProofRecord): string | undefined => {
  if (!record) return undefined

  return normalizeString(record.uri) || normalizeString(record.fileUrl) || normalizeString(record.file_url)
}

export function getStageProofPreview(stage: Phase, uploadedProof?: UploadedStageProof): StageProofPreview {
  const stageRecord = stage as Phase & ProofRecord
  const evidenceRecords = Array.isArray(stageRecord.evidences)
    ? stageRecord.evidences.filter((evidence): evidence is ProofRecord =>
        Boolean(evidence && typeof evidence === 'object')
      )
    : []
  const preferredEvidence =
    evidenceRecords.find((evidence) => getProofHash(evidence) || getProofFileUrl(evidence)) || evidenceRecords[0]
  const uploadedRecord = uploadedProof as ProofRecord | undefined

  const hash = getProofHash(uploadedRecord) || getProofHash(stageRecord) || getProofHash(preferredEvidence)
  const fileUrl = getProofFileUrl(uploadedRecord) || getProofFileUrl(stageRecord) || getProofFileUrl(preferredEvidence)
  const uri = getProofUri(uploadedRecord) || getProofUri(stageRecord) || getProofUri(preferredEvidence)

  return {
    hash,
    fileUrl,
    uri,
    hasProof: Boolean(uploadedProof?.hasProof || hash || fileUrl || uri || evidenceRecords.length > 0),
  }
}
