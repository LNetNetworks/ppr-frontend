'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Field, Label } from '@/components/fieldset'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Textarea } from '@/components/textarea'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import { useApiClient, useCreateAuditRevision, useFetchEnums, useUploadEvidence } from '@/lib/api-services'
import { getBackendEnumOptions } from '@/lib/enum-utils'
import { resolvePhaseTemplateId } from '@/lib/phase-utils'
import { useUserService } from '@/lib/user-service'
import type { Phase } from '@/types/api'
import { CheckCircleIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/16/solid'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface AuditModalProps {
  isOpen: boolean
  onClose: () => void
  stage: Phase | null
  projectId: string | undefined
}

const EXECUTED_AUDIT_STATUSES = new Set(['finalized', 'revision'])

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function AuditModal({ isOpen, onClose, stage, projectId }: AuditModalProps) {
  const router = useRouter()
  const api = useApiClient()
  const uploadEvidence = useUploadEvidence()
  const fetchEnums = useFetchEnums()
  const { success: showSuccess, error: showError } = useToast()
  const { userInfo } = useAuth()
  const { syncUser } = useUserService()
  const createAuditRevision = useCreateAuditRevision()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [auditStatusOptions, setAuditStatusOptions] = useState<Array<{ value: string; label: string }>>([])
  const auditStatusesLoadedRef = useRef(false)
  const [isLoadingAuditStatuses, setIsLoadingAuditStatuses] = useState(false)
  const [auditStatusLoadError, setAuditStatusLoadError] = useState<string | null>(null)
  const fetchEnumsRef = useRef(fetchEnums)

  const [formData, setFormData] = useState({
    objetive: '',
    observation: '',
    status: 'planned',
    date_revision: getTodayDate(),
  })

  const requiresEvidenceForExecution = EXECUTED_AUDIT_STATUSES.has(formData.status.toLowerCase())

  useEffect(() => {
    fetchEnumsRef.current = fetchEnums
  }, [fetchEnums])

  useEffect(() => {
    if (!isOpen || auditStatusesLoadedRef.current) {
      return
    }

    let isCancelled = false
    auditStatusesLoadedRef.current = true
    setIsLoadingAuditStatuses(true)
    setAuditStatusLoadError(null)

    fetchEnumsRef
      .current()
      .then((enums) => {
        if (isCancelled) return

        const options = getBackendEnumOptions(enums, 'auditStatus').map((option) => ({
          value: option.value,
          label: option.label,
        }))
        setAuditStatusOptions(options)
        if (options.length === 0) {
          setAuditStatusLoadError('No audit status values returned by backend enums.')
        }
      })
      .catch((fetchError) => {
        if (isCancelled) return
        console.error('Failed to fetch audit status enums:', fetchError)
        setAuditStatusLoadError('Unable to load audit statuses')
      })
      .finally(() => {
        if (isCancelled) return
        setIsLoadingAuditStatuses(false)
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      objetive: '',
      observation: '',
      status: 'planned',
      date_revision: getTodayDate(),
    })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
  }

  const resolveStageUpdatePayload = (currentStage: Phase, nextStatus: string) => {
    const stageRecord = currentStage as Phase & Record<string, unknown>
    const toNumber = (value: unknown, fallback = 0) => {
      const normalized = Number(value)
      return Number.isFinite(normalized) ? normalized : fallback
    }

    return {
      type_project:
        (stageRecord.type_project as string | undefined) ||
        (currentStage.typeProject as string | undefined) ||
        undefined,
      require_evidence: currentStage.requireEvidence ?? (stageRecord.require_evidence as boolean | undefined) ?? false,
      require_contribution:
        currentStage.requireContribution ?? (stageRecord.require_contribution as boolean | undefined) ?? false,
      require_auditory:
        currentStage.requireAuditory ??
        (stageRecord.require_auditory as boolean | undefined) ??
        (stageRecord.require_audit as boolean | undefined) ??
        false,
      close_evidence: currentStage.closeEvidence ?? (stageRecord.close_evidence as boolean | undefined) ?? false,
      close_contribution:
        currentStage.closeContribution ?? (stageRecord.close_contribution as boolean | undefined) ?? false,
      close_auditory:
        currentStage.closeAuditory ??
        (stageRecord.close_auditory as boolean | undefined) ??
        (stageRecord.close_auditor as boolean | undefined) ??
        false,
      status: nextStatus,
      order: toNumber(currentStage.order ?? stageRecord.order, 0),
      stage_weight: toNumber(currentStage.stageWeight ?? stageRecord.stage_weight, 0),
      contribution_required: toNumber(currentStage.contributionRequired ?? stageRecord.contribution_required, 0),
      contribution_received: toNumber(currentStage.contributionReceived ?? stageRecord.contribution_received, 0),
      date_start:
        (currentStage.dateStart as string | undefined) || (stageRecord.date_start as string | undefined) || undefined,
      date_end:
        (currentStage.dateEnd as string | undefined) || (stageRecord.date_end as string | undefined) || undefined,
      type: (currentStage.phaseType as string | undefined) || (stageRecord.type as string | undefined) || undefined,
      description: (stageRecord.description as string | undefined) || undefined,
    }
  }

  const updateStageAfterAudit = async (auditStatus: string, currentProjectId: string, currentStage: Phase) => {
    const normalizedStatus = auditStatus.toLowerCase()
    if (!['finalized', 'revision'].includes(normalizedStatus)) return

    const phaseTemplateId = resolvePhaseTemplateId(currentStage)
    if (!phaseTemplateId) {
      throw new Error('Unable to resolve stage ID to update stage status after audit.')
    }

    const nextStageStatus = normalizedStatus === 'finalized' ? 'closed' : 'inprogress'
    const payload = resolveStageUpdatePayload(currentStage, nextStageStatus)
    await api.put(`/projects/${currentProjectId}/phase/${phaseTemplateId}`, payload)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stage || !projectId || !userInfo?.sub) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.date_revision) {
        throw new Error('Audit date is required.')
      }

      if (requiresEvidenceForExecution && !selectedFile) {
        throw new Error('Audit evidence is required when status is Finalized or Revision.')
      }

      const syncedUser = await syncUser()
      const backendUserId = (syncedUser as any).id_user || syncedUser.id

      if (!backendUserId) {
        throw new Error('Unable to resolve internal user ID for audit request.')
      }

      const stageProjectId = stage.idPhaseProject || stage.id
      if (!stageProjectId) {
        throw new Error('Unable to resolve stage ID for audit request.')
      }

      await createAuditRevision({
        id_project: projectId,
        id_user: backendUserId,
        id_phase_project: stageProjectId,
        objetive: formData.objetive,
        observation: formData.observation,
        status: formData.status,
        date_revision: formData.date_revision,
      })

      if (selectedFile) {
        await uploadEvidence({
          file: selectedFile,
          projectId,
          phaseId: stage.idPhase || stageProjectId,
          phaseProjectId: stageProjectId,
          name: `Audit evidence - ${stage.name || 'Stage'}`,
          description: `Audit evidence (${formData.status}) - ${formData.objetive}`,
        })
      }

      await updateStageAfterAudit(formData.status, projectId, stage)

      showSuccess('Audit revision registered successfully!')
      resetForm()
      onClose()
      router.refresh()
    } catch (err) {
      console.error('Failed to register audit revision:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to register audit revision'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setError(null)
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="md">
      <DialogTitle>Audit Stage: {stage?.name || 'N/A'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Field>
              <Label>Title</Label>
              <Input
                required
                name="objetive"
                placeholder="Audit objective"
                value={formData.objetive}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, objetive: e.target.value })
                }
              />
            </Field>

            <Field>
              <Label>Description</Label>
              <Textarea
                required
                name="observation"
                placeholder="Audit findings, observations, recommendations..."
                value={formData.observation}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, observation: e.target.value })
                }
                rows={4}
              />
            </Field>

            <Field>
              <Label>Audit date</Label>
              <Input
                required
                type="date"
                name="date_revision"
                value={formData.date_revision}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, date_revision: e.target.value })
                }
              />
            </Field>

            <Field>
              <Label>Status</Label>
              <Select
                name="status"
                value={formData.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                disabled={isSubmitting || isLoadingAuditStatuses}
              >
                <option value="">{isLoadingAuditStatuses ? 'Loading statuses...' : 'Select audit status'}</option>
                {auditStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
                {formData.status && !auditStatusOptions.some((status) => status.value === formData.status) && (
                  <option value={formData.status}>{formData.status}</option>
                )}
              </Select>
              {auditStatusLoadError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{auditStatusLoadError}</p>
              )}
            </Field>

            <Field>
              <Label>
                Audit evidence {requiresEvidenceForExecution ? '(required for Finalized/Revision)' : '(optional)'}
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
              <div
                className={`mt-2 flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors ${
                  selectedFile
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                    : 'border-zinc-950/10 bg-white dark:border-white/10 dark:bg-white/5'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                    selectedFile
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {selectedFile ? (
                    <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <CloudArrowUpIcon className="h-5 w-5" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {selectedFile ? selectedFile.name : 'No audit file selected'}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedFile ? 'Ready to attach to this audit.' : 'PDF, DOC, DOCX, JPG, PNG, GIF (max 10MB).'}
                  </p>
                </div>
                <Button
                  type="button"
                  outline
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="shrink-0"
                >
                  {selectedFile ? 'Change' : 'Choose'}
                </Button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setError(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    disabled={isSubmitting}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-950/5 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Remove audit evidence file"
                  >
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <>
            <Button outline onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register Audit'}
            </Button>
          </>
        </DialogActions>
      </form>
    </Dialog>
  )
}
