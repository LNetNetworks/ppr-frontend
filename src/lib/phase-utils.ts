import type { Phase } from '@/types/api'

type PhaseLike = Phase & Record<string, unknown>

/**
 * Resolve the canonical phase template identifier used by /projects/:projectId/phase/:phaseId.
 * The backend expects the template id (pha_*) and some payloads only expose the project id (pp_*),
 * so we normalize those legacy ids when needed.
 */
export function resolvePhaseTemplateId(phase: Phase | null | undefined): string | null {
  if (!phase) return null

  const phaseRecord = phase as PhaseLike
  const normalize = (value: unknown): string => String(value || '').trim()

  const candidates = [
    normalize(phase.idPhase),
    normalize(phaseRecord.id_phase),
    normalize(phaseRecord.phase_id),
    normalize(phase.id),
  ].filter(Boolean)

  const canonicalCandidate = candidates
    .map((candidate) => {
      if (/^pha_/i.test(candidate)) return candidate
      if (/^pp_/i.test(candidate)) return candidate.replace(/^pp_/i, 'pha_')
      return null
    })
    .find((candidate): candidate is string => Boolean(candidate))

  if (canonicalCandidate) return canonicalCandidate

  const nonProjectCandidate = candidates.find((candidate) => !/^pp_/i.test(candidate))
  return nonProjectCandidate || null
}
