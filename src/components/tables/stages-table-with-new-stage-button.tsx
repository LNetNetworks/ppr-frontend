'use client'

import { Button } from '@/components/button'
import { Checkbox } from '@/components/checkbox'
import { ContributionModal } from '@/components/contribution-modal'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Input } from '@/components/input'
import { Link } from '@/components/link'
import { ProofViewModal, type ProofPreview } from '@/components/proof-view-modal'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import {
  TableActionsIcon,
  TableEvidenceCompleteIcon,
  TableSearchIcon,
  TableSelectIcon,
  TableUploadIcon,
} from '@/components/table-icons'
import { Textarea } from '@/components/textarea'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import { transformApiPhase } from '@/lib/api-mappers'
import { useApiClient, useFetchAvailablePhases, useFetchEnums, useUploadEvidence } from '@/lib/api-services'
import { formatDateForInput } from '@/lib/date-utils'
import { getBackendEnumValues } from '@/lib/enum-utils'
import { formatHashPreview } from '@/lib/hash-utils'
import { getStageProofPreview, type UploadedStageProof } from '@/lib/phase-proof'
import { resolvePhaseTemplateId } from '@/lib/phase-utils'
import { getStatusLabel } from '@/lib/status-labels'
import { getStatusClass, STATUS_BADGE_BASE_CLASS } from '@/lib/status-styles'
import type { ApiPhase, ApiResponse, AvailablePhase, Phase } from '@/types/api'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

interface StagesTableProps {
  stages: Phase[]
  isLoading?: boolean
  emptyMessage?: string
  projectId?: string
  projectTotalContributed?: number
  typeProject?: string
  onUploadProof?: (stage: Phase) => void
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  onButtonClick?: () => void
  showCreateModal?: boolean
  enablePayment?: boolean
  hideActions?: boolean
}

type StageRequirementFlags = {
  requireEvidence: boolean
  requireContribution: boolean
  requireAuditory: boolean
  closeEvidence: boolean
  closeContribution: boolean
  closeAuditory: boolean
}

const DEFAULT_STAGE_REQUIREMENT_FLAGS: StageRequirementFlags = {
  requireEvidence: false,
  requireContribution: false,
  requireAuditory: false,
  closeEvidence: false,
  closeContribution: false,
  closeAuditory: false,
}

/**
 * Reusable Stages Table Component
 * Displays a list of stages in a table format
 */
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0]
}

const getOneMonthFutureDate = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

const normalizePhaseId = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
const normalizeStatusValue = (value?: string): string => (value || '').trim().toLowerCase()

const getPhaseIdentifierCandidates = (stage: Phase | null | undefined): string[] => {
  if (!stage) return []
  const stageRecord = stage as Record<string, unknown>

  return [
    stage.id,
    stage.idPhase,
    stage.idPhaseProject,
    stageRecord.id_phase_project,
    stageRecord.id_phase,
    stageRecord.phase_id,
  ]
    .map((candidate) => String(candidate || '').trim())
    .filter(Boolean)
}

const getNormalizedPhaseIdentifierSet = (stage: Phase | null | undefined): Set<string> => {
  const identifiers = new Set<string>()

  getPhaseIdentifierCandidates(stage).forEach((candidate) => {
    const normalizedCandidate = normalizePhaseId(candidate)
    if (!normalizedCandidate) return
    identifiers.add(normalizedCandidate)

    if (normalizedCandidate.startsWith('pp_')) {
      identifiers.add(`pha_${normalizedCandidate.slice(3)}`)
    } else if (normalizedCandidate.startsWith('pha_')) {
      identifiers.add(`pp_${normalizedCandidate.slice(4)}`)
    }
  })

  return identifiers
}

const findMatchingStageByIdentifier = (targetStage: Phase, candidateStages: Phase[]): Phase | null => {
  const targetIdentifiers = getNormalizedPhaseIdentifierSet(targetStage)
  if (targetIdentifiers.size === 0) return null

  for (const candidateStage of candidateStages) {
    const candidateIdentifiers = getNormalizedPhaseIdentifierSet(candidateStage)
    for (const candidateIdentifier of candidateIdentifiers) {
      if (targetIdentifiers.has(candidateIdentifier)) {
        return candidateStage
      }
    }
  }

  return null
}

const requiresCancellationDescription = (status?: string): boolean => {
  const normalized = (status || '').trim().toLowerCase()
  return normalized === 'canceling' || normalized === 'canceled'
}

const formatCancellationStatus = (status?: string): string => {
  const normalized = (status || '').trim().toLowerCase()
  if (normalized === 'canceling') return 'Canceling'
  return 'Canceled'
}

export function StagesTableWithNewStageButton({
  stages,
  isLoading = false,
  emptyMessage = 'No stages found',
  projectId,
  projectTotalContributed = 0,
  typeProject,
  onUploadProof,
  title,
  description,
  buttonText = 'New stage',
  buttonHref,
  onButtonClick,
  showCreateModal = false,
  enablePayment = false,
  hideActions = false,
}: StagesTableProps) {
  const pathname = usePathname()
  const router = useRouter()
  const api = useApiClient()
  const uploadEvidence = useUploadEvidence()
  const { hasRole } = useAuth()
  const { success: showSuccess, warning: showWarning, error: showError } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stageWeight, setStageWeight] = useState(0)
  const [editingStage, setEditingStage] = useState<Phase | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  // formSuccess state removed
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null)
  const [deletingStageName, setDeletingStageName] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Phase | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedStageForPayment, setSelectedStageForPayment] = useState<Phase | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // uploadSuccess removed
  const [uploadedEvidenceByStageKey, setUploadedEvidenceByStageKey] = useState<Record<string, UploadedStageProof>>({})
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)
  const [selectedProof, setSelectedProof] = useState<ProofPreview | null>(null)
  const [stageRequirementFlags, setStageRequirementFlags] = useState<StageRequirementFlags>(
    DEFAULT_STAGE_REQUIREMENT_FLAGS
  )
  const [stageStatus, setStageStatus] = useState('')

  // Available phases state
  const [availablePhases, setAvailablePhases] = useState<AvailablePhase[]>([])
  const [isLoadingPhases, setIsLoadingPhases] = useState(false)
  const [phasesError, setPhasesError] = useState<string | null>(null)
  const fetchAvailablePhases = useFetchAvailablePhases()

  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')
  const [stageType, setStageType] = useState<string>('')
  const [stageDescription, setStageDescription] = useState<string>('')

  const [phaseTypes, setPhaseTypes] = useState<string[]>([])
  const [phaseProjectStatuses, setPhaseProjectStatuses] = useState<string[]>([])
  const [isLoadingPhaseTypes, setIsLoadingPhaseTypes] = useState(false)
  const [isLoadingPhaseProjectStatuses, setIsLoadingPhaseProjectStatuses] = useState(false)
  const [stageEnumsError, setStageEnumsError] = useState<string | null>(null)
  const [stageStatusDrafts, setStageStatusDrafts] = useState<Record<string, string>>({})
  const [isLoadingEditStage, setIsLoadingEditStage] = useState(false)
  const fetchEnums = useFetchEnums()
  const fetchEnumsRef = useRef(fetchEnums)
  const phaseProjectStatusesLoadedRef = useRef(false)

  const projectPhaseTemplateIds = useMemo(() => {
    const ids = new Set<string>()

    stages.forEach((stage) => {
      const stageRecord = stage as Record<string, unknown>
      const candidates = [stage.idPhase, stageRecord.id_phase, stageRecord.phase_id, stage.id]

      candidates.forEach((candidate) => {
        const normalized = normalizePhaseId(candidate)
        if (normalized) ids.add(normalized)
      })
    })

    return ids
  }, [stages])

  const selectablePhases = useMemo(
    () => availablePhases.filter((phase) => !projectPhaseTemplateIds.has(normalizePhaseId(phase.id_phase))),
    [availablePhases, projectPhaseTemplateIds]
  )
  const nextStageOrder = useMemo(() => {
    const highestOrder = stages.reduce((maxOrder, stage) => {
      const parsedOrder = typeof stage.order === 'number' ? stage.order : Number.parseInt(String(stage.order ?? ''), 10)

      if (!Number.isFinite(parsedOrder)) {
        return maxOrder
      }

      return Math.max(maxOrder, parsedOrder)
    }, 0)

    return highestOrder + 1
  }, [stages])

  useEffect(() => {
    fetchEnumsRef.current = fetchEnums
  }, [fetchEnums])

  useEffect(() => {
    if (phaseProjectStatuses.length > 0) {
      phaseProjectStatusesLoadedRef.current = true
    }
  }, [phaseProjectStatuses.length])

  // Determine role prefix from pathname, with fallback to user's role from auth
  const getRolePrefix = (): string => {
    // First try to get role from pathname
    if (pathname?.startsWith('/user')) return '/user'
    if (pathname?.startsWith('/verifier')) return '/verifier'
    if (pathname?.startsWith('/sponsor')) return '/sponsor'
    if (pathname?.startsWith('/provider')) return '/provider'

    // Fallback: determine role from user's authentication (for root "/" path)
    if (hasRole('user')) return '/user'
    if (hasRole('verifier')) return '/verifier'
    if (hasRole('sponsor')) return '/sponsor'
    if (hasRole('provider')) return '/provider'

    return '' // Fallback to no prefix if no role found
  }

  const rolePrefix = getRolePrefix()
  const canNavigateToTasks = rolePrefix === '/provider' || rolePrefix === '/sponsor'
  const canManageStageStatus = rolePrefix === '/provider' && hasRole('provider')

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
        typeProject ||
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
      description:
        (currentStage.description as string | undefined) ||
        (stageRecord.description as string | undefined) ||
        undefined,
    }
  }

  useEffect(() => {
    const nextDrafts: Record<string, string> = {}
    stages.forEach((stage) => {
      const rowId = String(stage.id || '').trim()
      if (!rowId) return
      nextDrafts[rowId] = normalizeStatusValue(stage.status)
    })
    setStageStatusDrafts(nextDrafts)
  }, [stages])

  useEffect(() => {
    if (!canManageStageStatus || phaseProjectStatusesLoadedRef.current) {
      return
    }

    let isCancelled = false
    phaseProjectStatusesLoadedRef.current = true
    setIsLoadingPhaseProjectStatuses(true)

    fetchEnumsRef
      .current()
      .then((enums) => {
        if (isCancelled) return
        const loadedStageStatuses = Array.from(
          new Set(
            getBackendEnumValues(enums, 'phaseProjectStatus')
              .map((value) => normalizeStatusValue(value))
              .filter(Boolean)
          )
        )
        if (loadedStageStatuses.length > 0) {
          setPhaseProjectStatuses(loadedStageStatuses)
        } else {
          setStageEnumsError('No stage status values returned by backend enums.')
        }
      })
      .catch((error) => {
        if (isCancelled) return
        console.error('Failed to preload stage status enums:', error)
      })
      .finally(() => {
        if (isCancelled) return
        setIsLoadingPhaseProjectStatuses(false)
      })

    return () => {
      isCancelled = true
    }
  }, [canManageStageStatus, showError])

  const handleInlineStatusChange = async (stage: Phase, nextStatusRaw: string) => {
    if (!canManageStageStatus) return

    const rowId = String(stage.id || '').trim()
    const stageProjectId = (projectId || stage.projectId || '').trim()
    const phaseTemplateId = resolvePhaseTemplateId(stage)
    if (!rowId || !stageProjectId || !phaseTemplateId) {
      showError('Unable to identify stage/project to update status.', 'Update failed')
      return
    }

    const nextStatus = normalizeStatusValue(nextStatusRaw)
    const previousStatus = normalizeStatusValue(stageStatusDrafts[rowId] || stage.status)

    if (!phaseProjectStatuses.some((status) => normalizeStatusValue(status) === nextStatus)) {
      showError('Stage status value is not available in backend enums.', 'Update failed')
      return
    }

    if (!nextStatus || nextStatus === previousStatus || updatingStageId === rowId) {
      return
    }

    if (requiresCancellationDescription(nextStatus)) {
      showWarning(
        `Provide a description when changing status to ${formatCancellationStatus(nextStatus)}. We opened edit mode for this stage.`,
        'Status not updated'
      )
      await handleOpenEditModal(stage)
      return
    }

    setUpdatingStageId(rowId)
    setStageStatusDrafts((current) => ({ ...current, [rowId]: nextStatus }))

    try {
      const payload = resolveStageUpdatePayload(stage, nextStatus)
      await api.put(`/projects/${stageProjectId}/phase/${phaseTemplateId}`, payload)
      showSuccess(`Stage status changed to ${getStatusLabel(nextStatus)}.`, 'Status updated')
      router.refresh()
    } catch (error) {
      console.error('Failed to update stage status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update stage status.'
      setStageStatusDrafts((current) => ({ ...current, [rowId]: previousStatus }))
      showError(errorMessage, 'Update failed')
    } finally {
      setUpdatingStageId(null)
    }
  }

  const getStageEvidenceKey = useCallback((stage: Phase | null): string | null => {
    if (!stage) return null
    return stage.idPhaseProject || stage.idPhase || stage.id || null
  }, [])

  const getStageEvidence = useCallback(
    (stage: Phase) => {
      const stageEvidenceKey = getStageEvidenceKey(stage)
      const uploadedEvidence = stageEvidenceKey ? uploadedEvidenceByStageKey[stageEvidenceKey] : undefined
      return getStageProofPreview(stage, uploadedEvidence)
    },
    [getStageEvidenceKey, uploadedEvidenceByStageKey]
  )

  const handleUploadClick = (stage: Phase) => {
    if (onUploadProof) {
      onUploadProof(stage)
    } else {
      setSelectedStage(stage)
      setIsUploadModalOpen(true)
      setSelectedFile(null)
      setUploadError(null)
    }
  }

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const validTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!validTypes.includes(fileExtension)) {
      setUploadError('Invalid file type. Please upload PDF, DOC, DOCX, JPG, PNG, or GIF files.')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setUploadError('File size exceeds 10MB limit.')
      return
    }

    setSelectedFile(file)
    setUploadError(null)
  }, [])

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleUpload = async () => {
    if (!selectedFile || !selectedStage) return

    const stageProjectId = projectId || selectedStage.projectId
    if (!stageProjectId) {
      setUploadError("We couldn't identify the project. Refresh the page and try uploading again.")
      return
    }

    setIsUploading(true)
    setUploadError(null)
    // setUploadSuccess removed

    try {
      const response = await uploadEvidence({
        file: selectedFile,
        projectId: stageProjectId,
        phaseId: selectedStage.idPhase || selectedStage.idPhaseProject || selectedStage.id,
        phaseProjectId: selectedStage.idPhaseProject || undefined,
        name: `Evidence for ${selectedStage.name || 'Stage'}`,
      })

      const responsePayload = (response as any)?.data || response
      const evidenceHash = responsePayload?.hash || responsePayload?.tx_hash || responsePayload?.txHash || null
      const evidenceFileUrl = responsePayload?.fileUrl || responsePayload?.uri || responsePayload?.file_url || null

      const stageEvidenceKey = getStageEvidenceKey(selectedStage)
      if (stageEvidenceKey) {
        setUploadedEvidenceByStageKey((previous) => ({
          ...previous,
          [stageEvidenceKey]: {
            hash: evidenceHash || undefined,
            fileUrl: evidenceFileUrl || undefined,
            uri: evidenceFileUrl || undefined,
            hasProof: true,
          },
        }))
      }

      if (evidenceHash) {
        showSuccess(`Evidence uploaded successfully! Hash: ${evidenceHash}`)
      } else {
        showSuccess('Evidence uploaded successfully!')
      }
      handleSuccessClose()
    } catch (error) {
      console.error('Failed to upload evidence:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload evidence. Please try again.'
      setUploadError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCloseUploadModal = () => {
    if (!isUploading) {
      setIsUploadModalOpen(false)
      setSelectedFile(null)
      setSelectedStage(null)
      setUploadError(null)
      // setUploadSuccess removed
      setIsDragging(false)
    }
  }

  const handleSuccessClose = () => {
    setSelectedFile(null)
    setSelectedStage(null)
    // setUploadSuccess removed
    setIsUploadModalOpen(false)
    router.refresh()
  }

  const handleOpenProofModal = (stage: Phase, evidence: { hash?: string; fileUrl?: string; uri?: string }) => {
    setSelectedProof({
      hash: evidence.hash || null,
      fileUrl: evidence.fileUrl || null,
      uri: evidence.uri || null,
      stageName: stage.name || stage.idPhase || stage.id,
    })
    setIsProofModalOpen(true)
  }

  const handleCloseProofModal = () => {
    setIsProofModalOpen(false)
    setSelectedProof(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStageWeightTrackStyle = (value: number) => {
    const normalizedValue = Math.min(100, Math.max(0, value))

    return {
      background: `linear-gradient(to right, var(--slider-fill) 0%, var(--slider-fill) ${normalizedValue}%, var(--slider-track) ${normalizedValue}%, var(--slider-track) 100%)`,
    }
  }

  const canShowUploadButton = (stage: Phase) => {
    return stage.requireEvidence && (onUploadProof || projectId || stage.projectId)
  }

  const updateStageRequirementFlag = (flag: keyof StageRequirementFlags, checked: boolean) => {
    setStageRequirementFlags((previousFlags) => {
      const nextFlags = { ...previousFlags, [flag]: checked }

      if (flag === 'closeEvidence' && checked) nextFlags.requireEvidence = true
      if (flag === 'closeContribution' && checked) nextFlags.requireContribution = true
      if (flag === 'closeAuditory' && checked) nextFlags.requireAuditory = true

      if (flag === 'requireEvidence' && !checked && nextFlags.closeEvidence) nextFlags.requireEvidence = true
      if (flag === 'requireContribution' && !checked && nextFlags.closeContribution) {
        nextFlags.requireContribution = true
      }
      if (flag === 'requireAuditory' && !checked && nextFlags.closeAuditory) nextFlags.requireAuditory = true

      return nextFlags
    })
  }

  const handleOpenTasks = (stage: Phase) => {
    if (!canNavigateToTasks) {
      return
    }

    // Navigate to tasks page for this stage
    const stageProjectId = projectId || stage.projectId
    if (stageProjectId) {
      const stageId = stage.idPhaseProject || stage.idPhase || stage.id
      router.push(`${rolePrefix}/projects/${stageProjectId}/tasks?phaseId=${stageId}`)
    }
  }

  const loadStageEnums = async (): Promise<{ loadedPhaseTypes: string[]; loadedStageStatuses: string[] }> => {
    if ((phaseTypes.length > 0 && phaseProjectStatuses.length > 0) || isLoadingPhaseTypes) {
      return {
        loadedPhaseTypes: phaseTypes,
        loadedStageStatuses: phaseProjectStatuses,
      }
    }

    setIsLoadingPhaseTypes(true)
    setIsLoadingPhaseProjectStatuses(true)
    setStageEnumsError(null)

    try {
      const enums = await fetchEnums()
      const loadedPhaseTypes = Array.from(
        new Set(
          getBackendEnumValues(enums, 'phaseType')
            .map((value) => value.trim())
            .filter(Boolean)
        )
      )
      const loadedStageStatuses = Array.from(
        new Set(
          getBackendEnumValues(enums, 'phaseProjectStatus')
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean)
        )
      )

      setPhaseTypes(loadedPhaseTypes)
      setPhaseProjectStatuses(loadedStageStatuses)

      if (loadedPhaseTypes.length === 0 || loadedStageStatuses.length === 0) {
        setStageEnumsError('Some stage enum values were not returned by backend.')
      }

      return { loadedPhaseTypes, loadedStageStatuses }
    } catch (error) {
      console.error('Failed to fetch stage enums:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to load stage enum values'
      setStageEnumsError(errorMessage)
      showError(errorMessage)
      return {
        loadedPhaseTypes: phaseTypes,
        loadedStageStatuses: phaseProjectStatuses,
      }
    } finally {
      setIsLoadingPhaseTypes(false)
      setIsLoadingPhaseProjectStatuses(false)
    }
  }

  const handleOpenModal = async () => {
    setEditingStage(null)
    setIsModalOpen(true)
    setStageWeight(0)
    setStageStatus(phaseProjectStatuses[0] || '')
    setStageRequirementFlags(DEFAULT_STAGE_REQUIREMENT_FLAGS)
    setFormError(null)

    setAvailablePhases([])
    setPhasesError(null)

    setDateStart(getTodayDate())
    setDateEnd(getOneMonthFutureDate())
    setStageDescription('')

    if (phaseTypes.length === 0 || phaseProjectStatuses.length === 0) {
      const { loadedPhaseTypes, loadedStageStatuses } = await loadStageEnums()
      if (loadedPhaseTypes.length > 0) {
        setStageType(loadedPhaseTypes[0])
      }
      setStageStatus(loadedStageStatuses[0] || '')
    } else {
      setStageType(phaseTypes[0] || '')
      setStageStatus(phaseProjectStatuses[0] || '')
    }

    // Fetch available phases when opening modal
    if (!editingStage && projectId) {
      setIsLoadingPhases(true)
      try {
        const phases = await fetchAvailablePhases()
        setAvailablePhases(phases)
      } catch (error) {
        console.error('Failed to fetch available phases:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load available phases. Please try again.'
        setPhasesError(errorMessage)
        showError(errorMessage)
      } finally {
        setIsLoadingPhases(false)
      }
    }
  }

  const handleOpenEditModal = async (stage: Phase) => {
    setIsLoadingEditStage(true)
    try {
      let hydratedStage = stage
      if (projectId) {
        try {
          const response = await api.get<ApiResponse<ApiPhase[]>>(`/projects/${projectId}/phases`)
          const fetchedStages = Array.isArray(response?.data) ? response.data.map(transformApiPhase) : []
          const matchedStage = findMatchingStageByIdentifier(stage, fetchedStages)
          if (matchedStage) {
            hydratedStage = { ...stage, ...matchedStage }
          }
        } catch (error) {
          console.error('Failed to fetch stage details for edit modal:', error)
          showWarning('Unable to refresh this stage before editing. Using currently loaded values.')
        }
      }

      setEditingStage(hydratedStage)
      setStageWeight(typeof hydratedStage.stageWeight === 'number' ? hydratedStage.stageWeight : 0)
      setStageStatus(normalizeStatusValue(hydratedStage.status))
      setDateStart(formatDateForInput((hydratedStage.dateStart as string) || (hydratedStage as any).date_start))
      setDateEnd(formatDateForInput((hydratedStage.dateEnd as string) || (hydratedStage as any).date_end))
      setStageType((hydratedStage.phaseType as string) || (hydratedStage as any).type || '')
      setStageDescription((hydratedStage.description as string) || '')

      if (phaseTypes.length === 0 || phaseProjectStatuses.length === 0) {
        await loadStageEnums()
      }

      setStageRequirementFlags({
        requireEvidence:
          hydratedStage.requireEvidence ??
          (hydratedStage as Phase & { require_evidence?: boolean }).require_evidence ??
          false,
        requireContribution:
          hydratedStage.requireContribution ??
          (hydratedStage as Phase & { require_contribution?: boolean }).require_contribution ??
          false,
        requireAuditory:
          hydratedStage.requireAuditory ??
          (hydratedStage as Phase & { require_auditory?: boolean; require_audit?: boolean }).require_auditory ??
          (hydratedStage as Phase & { require_auditory?: boolean; require_audit?: boolean }).require_audit ??
          false,
        closeEvidence:
          hydratedStage.closeEvidence ??
          (hydratedStage as Phase & { close_evidence?: boolean }).close_evidence ??
          false,
        closeContribution:
          hydratedStage.closeContribution ??
          (hydratedStage as Phase & { close_contribution?: boolean }).close_contribution ??
          false,
        closeAuditory:
          hydratedStage.closeAuditory ??
          (hydratedStage as Phase & { close_auditory?: boolean; close_auditor?: boolean }).close_auditory ??
          (hydratedStage as Phase & { close_auditory?: boolean; close_auditor?: boolean }).close_auditor ??
          false,
      })
      setIsModalOpen(true)
      setFormError(null)
    } finally {
      setIsLoadingEditStage(false)
    }
  }

  const handleCloseModal = (force = false) => {
    if (isPending && !force) {
      return
    }
    setIsModalOpen(false)
    setEditingStage(null)
    setStageStatus('')
    setStageRequirementFlags(DEFAULT_STAGE_REQUIREMENT_FLAGS)
    setFormError(null)
  }

  // Handler to validate and restrict contribution inputs to positive numbers only
  const handleContributionInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow empty string, numbers, and single decimal point
    // Remove any negative signs, multiple decimal points, or non-numeric characters (except one decimal point)
    let sanitized = value.replace(/[^\d.]/g, '')

    // Ensure only one decimal point
    const parts = sanitized.split('.')
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('')
    }

    // Update the input value
    e.target.value = sanitized
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setFormError(null)

    if (!projectId) {
      setFormError("We couldn't identify this project. Refresh the page and try again.")
      return
    }

    if (dateStart && dateEnd) {
      const startDate = new Date(dateStart)
      const endDate = new Date(dateEnd)
      if (endDate <= startDate) {
        setFormError('End date must be greater than start date.')
        return
      }
    }

    if (!editingStage) {
      const idPhase = (formData.get('id_phase') as string) || ''
      if (!idPhase) {
        setFormError('Choose a phase before creating a stage.')
        return
      }
      if (projectPhaseTemplateIds.has(normalizePhaseId(idPhase))) {
        setFormError('This phase is already part of the project. Choose another phase.')
        return
      }

      const contributionRequiredStr = formData.get('contribution_required') as string
      const contributionReceivedStr = formData.get('contribution_received') as string

      if (!contributionRequiredStr || contributionRequiredStr.trim() === '') {
        setFormError('Enter the required contribution amount.')
        return
      }

      if (!contributionReceivedStr || contributionReceivedStr.trim() === '') {
        setFormError('Enter the contribution received amount.')
        return
      }

      const contributionRequired = parseFloat(contributionRequiredStr.replace(/[^\d.]/g, ''))
      const contributionReceived = parseFloat(contributionReceivedStr.replace(/[^\d.]/g, ''))

      if (isNaN(contributionRequired) || contributionRequired < 0) {
        setFormError('Required contribution must be a valid number greater than or equal to 0.')
        return
      }

      if (isNaN(contributionReceived) || contributionReceived < 0) {
        setFormError('Contribution received must be a valid number greater than or equal to 0.')
        return
      }

      const createStatus = normalizeStatusValue(phaseProjectStatuses[0])
      if (!createStatus) {
        setFormError('Stage status enum values are unavailable. Please report missing phaseProjectStatus enums.')
        return
      }

      const stageData = {
        id_phase: idPhase,
        require_evidence: stageRequirementFlags.requireEvidence,
        require_contribution: stageRequirementFlags.requireContribution,
        require_auditory: stageRequirementFlags.requireAuditory,
        close_evidence: stageRequirementFlags.closeEvidence,
        close_contribution: stageRequirementFlags.closeContribution,
        close_auditory: stageRequirementFlags.closeAuditory,
        status: createStatus,
        order: nextStageOrder,
        stage_weight: stageWeight,
        contribution_required: contributionRequired,
        contribution_received: contributionReceived,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
        type: stageType,
        description: stageDescription,
        type_project: typeProject,
      }

      startTransition(async () => {
        try {
          await api.post(`/projects/${projectId}/phase`, stageData)

          // setFormSuccess(true) removed
          showSuccess('Stage created successfully!')
          handleCloseModal(true)
          router.refresh()
        } catch (error) {
          console.error('Failed to create stage:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to create stage'
          setFormError(errorMessage)
          showError(errorMessage)
        }
      })
    } else {
      const status = canManageStageStatus
        ? normalizeStatusValue(stageStatus)
        : normalizeStatusValue(editingStage.status)
      const cancelReason = ((formData.get('cancel_reason') as string) || '').trim()
      const orderStr = formData.get('order') as string
      const contributionRequiredStr = formData.get('contribution_required') as string
      const contributionReceivedStr = formData.get('contribution_received') as string

      if (canManageStageStatus && !status) {
        setFormError('Stage status is required and must come from backend enums.')
        return
      }

      if (
        canManageStageStatus &&
        !phaseProjectStatuses.some((optionStatus) => normalizeStatusValue(optionStatus) === status)
      ) {
        setFormError('Selected stage status is not available in backend enums.')
        return
      }

      if (requiresCancellationDescription(status) && !cancelReason) {
        setFormError(`Provide a description when changing status to ${formatCancellationStatus(status)}.`)
        return
      }

      const order = orderStr ? parseInt(orderStr, 10) : editingStage.order || 0
      const contributionRequired = contributionRequiredStr
        ? parseFloat(contributionRequiredStr.replace(/[^\d.]/g, ''))
        : editingStage.contributionRequired || 0
      const contributionReceived = contributionReceivedStr
        ? parseFloat(contributionReceivedStr.replace(/[^\d.]/g, ''))
        : editingStage.contributionReceived || 0

      if (isNaN(order)) {
        setFormError('Order must be a whole number (0 or higher).')
        return
      }

      if (isNaN(contributionRequired) || contributionRequired < 0) {
        setFormError('Required contribution must be a valid number greater than or equal to 0.')
        return
      }

      if (isNaN(contributionReceived) || contributionReceived < 0) {
        setFormError('Contribution received must be a valid number greater than or equal to 0.')
        return
      }

      const updateData = {
        type_project: typeProject,
        require_evidence: stageRequirementFlags.requireEvidence,
        require_contribution: stageRequirementFlags.requireContribution,
        require_auditory: stageRequirementFlags.requireAuditory,
        close_evidence: stageRequirementFlags.closeEvidence,
        close_contribution: stageRequirementFlags.closeContribution,
        close_auditory: stageRequirementFlags.closeAuditory,
        status: status,
        order: order,
        stage_weight: stageWeight,
        contribution_required: contributionRequired,
        contribution_received: contributionReceived,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
        type: stageType,
        description: stageDescription,
        reason: requiresCancellationDescription(status) ? cancelReason : undefined,
      }

      const phaseTemplateId = resolvePhaseTemplateId(editingStage)
      if (!phaseTemplateId) {
        setFormError('Unable to resolve the phase ID for this stage.')
        return
      }

      startTransition(async () => {
        try {
          await api.put(`/projects/${projectId}/phase/${phaseTemplateId}`, updateData)

          // setFormSuccess(true) removed
          showSuccess('Stage updated successfully!')
          handleCloseModal(true)
          router.refresh()
        } catch (error) {
          console.error('Failed to update stage:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to update stage'
          setFormError(errorMessage)
          showError(errorMessage)
        }
      })
    }
  }

  // Filter stages based on search query
  const filteredStages = useMemo(() => {
    if (!searchQuery.trim()) {
      return stages
    }

    const query = searchQuery.toLowerCase().trim()
    return stages.filter((stage) => {
      const name = stage.name?.toLowerCase() || ''
      const status = stage.status?.toLowerCase() || ''
      const id = stage.id?.toLowerCase() || ''
      const idPhase = stage.idPhase?.toLowerCase() || ''

      return name.includes(query) || status.includes(query) || id.includes(query) || idPhase.includes(query)
    })
  }, [stages, searchQuery])

  const renderTable = () => {
    let columnCount = 6 // Base: ID, Stage, Status, Progress, Evidence, Hash
    if (canNavigateToTasks) columnCount++
    if (enablePayment) columnCount++
    if (!hideActions) columnCount++

    if (isLoading) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Stage</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader className="text-center">Progress</TableHeader>
              <TableHeader className="text-center">Evidence</TableHeader>
              <TableHeader className="text-center">Hash</TableHeader>
              {canNavigateToTasks && <TableHeader className="text-center">Next step</TableHeader>}
              {enablePayment && <TableHeader className="text-center">Payment</TableHeader>}
              {!hideActions && <TableHeader className="text-center">Actions</TableHeader>}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center text-zinc-500">
                Loading stages...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (filteredStages.length === 0) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Stage</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader className="text-center">Progress</TableHeader>
              <TableHeader className="text-center">Evidence</TableHeader>
              <TableHeader className="text-center">Hash</TableHeader>
              {canNavigateToTasks && <TableHeader className="text-center">Next step</TableHeader>}
              {enablePayment && <TableHeader className="text-center">Payment</TableHeader>}
              {!hideActions && <TableHeader className="text-center">Actions</TableHeader>}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center text-zinc-500">
                {searchQuery ? `No stages found matching "${searchQuery}".` : emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    return (
      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Stage</TableHeader>
            <TableHeader className="text-center">Status</TableHeader>
            <TableHeader className="text-center">Progress</TableHeader>
            <TableHeader className="text-center">Evidence</TableHeader>
            <TableHeader className="text-center">Hash</TableHeader>
            {canNavigateToTasks && <TableHeader className="text-center">Next step</TableHeader>}
            {enablePayment && <TableHeader className="text-center">Payment</TableHeader>}
            {!hideActions && <TableHeader className="text-center">Actions</TableHeader>}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStages.map((stage) => {
            const evidence = getStageEvidence(stage)
            const stageRecord = stage as Phase & { require_contribution?: boolean }
            const canPayStage = Boolean(stage.requireContribution ?? stageRecord.require_contribution ?? false)
            const rowId = String(stage.id || '').trim()
            const selectedStatus = normalizeStatusValue(stageStatusDrafts[rowId] || stage.status)
            const safeSelectedStatus = phaseProjectStatuses.some(
              (status) => normalizeStatusValue(status) === normalizeStatusValue(selectedStatus)
            )
              ? selectedStatus
              : ''
            const isUpdatingCurrentRow = updatingStageId === rowId
            return (
              <TableRow key={stage.id} title={`Stage ${stage.name || stage.idPhase || stage.id}`}>
                <TableCell className="font-mono text-sm">{stage.idPhase || stage.id}</TableCell>
                <TableCell className="font-medium">{stage.name || 'Not available'}</TableCell>
                <TableCell className="text-center">
                  {canManageStageStatus && phaseProjectStatuses.length > 0 ? (
                    <div className="relative inline-block">
                      <select
                        className={`min-w-36 appearance-none rounded-lg px-4 py-1.5 pr-10 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 ${getStatusClass(selectedStatus)}`}
                        value={safeSelectedStatus}
                        onChange={(event) => {
                          void handleInlineStatusChange(stage, event.target.value)
                        }}
                        disabled={isUpdatingCurrentRow || isLoadingPhaseProjectStatuses}
                        aria-label={`Stage status for ${stage.name || stage.idPhase || stage.id}`}
                      >
                        <option value="">Select status</option>
                        {phaseProjectStatuses.map((status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <TableSelectIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                    </div>
                  ) : (
                    <span className={`${STATUS_BADGE_BASE_CLASS} ${getStatusClass(stage.status)}`}>
                      {getStatusLabel(stage.status, 'Not set')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-zinc-900 dark:text-white">
                      {formatCurrency(stage.contributionReceived || 0)} /{' '}
                      {formatCurrency(stage.contributionRequired || 0)}
                    </span>
                    {(stage.contributionRequired || 0) > 0 && (
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                          style={{
                            width: `${Math.min(100, Math.round(((stage.contributionReceived || 0) / (stage.contributionRequired || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex min-h-[2.5rem] flex-col items-center justify-center gap-1">
                    {evidence.hasProof ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenProofModal(stage, evidence)
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 motion-reduce:transition-none dark:text-emerald-400 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-300 dark:focus-visible:outline-emerald-400"
                        title="Evidence uploaded"
                        aria-label="View uploaded evidence"
                      >
                        <TableEvidenceCompleteIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : canShowUploadButton(stage) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUploadClick(stage)
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 motion-reduce:transition-none dark:text-blue-400 dark:hover:bg-blue-950/20 dark:hover:text-blue-300 dark:focus-visible:outline-blue-400"
                        title="Upload proof"
                        aria-label="Upload proof"
                      >
                        <TableUploadIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">Not required</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center font-mono text-xs text-zinc-500">
                  {evidence.hash ? (
                    <Link
                      href={`https://explorer.l-net.io/tx/${evidence.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={evidence.hash}
                      className="underline-offset-2 hover:underline"
                    >
                      {formatHashPreview(evidence.hash)}
                    </Link>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                {canNavigateToTasks && (
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      color="blue"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTasks(stage)
                      }}
                      className="text-sm whitespace-nowrap"
                    >
                      Open tasks
                    </Button>
                  </TableCell>
                )}
                {enablePayment && (
                  <TableCell className="text-center">
                    <div
                      className="flex min-h-[2.5rem] items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        color="green"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!canPayStage) return
                          setSelectedStageForPayment(stage)
                          setIsPaymentModalOpen(true)
                        }}
                        disabled={!canPayStage}
                        className="text-sm whitespace-nowrap"
                        title={canPayStage ? 'Pay stage' : 'This stage does not require contribution'}
                      >
                        Pay stage
                      </Button>
                    </div>
                  </TableCell>
                )}
                {!hideActions && (
                  <TableCell className="text-center">
                    <div
                      className="relative z-10 flex min-h-[2.5rem] items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Dropdown>
                        <DropdownButton plain aria-label="More options" className="h-10 w-10 rounded-md">
                          <TableActionsIcon className="size-4" />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleOpenEditModal(stage)
                            }}
                          >
                            <DropdownLabel>Edit</DropdownLabel>
                          </DropdownItem>
                          <DropdownItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingStageId(stage.id)
                              setDeletingStageName(stage.name || stage.idPhase || stage.id)
                              setDeleteConfirmOpen(true)
                            }}
                            disabled={deletingStageId === stage.id}
                          >
                            <DropdownLabel>Delete</DropdownLabel>
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  // Button is always visible in this component version
  return (
    <>
      <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="sm:flex-auto">
            {title && <h1 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h1>}
            {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-4 sm:flex sm:items-center sm:gap-4">
            <div className="flex-1 sm:w-64 sm:flex-none">
              <div className="relative">
                <input
                  id="query"
                  name="query"
                  type="text"
                  placeholder="Search by stage ID, name, or status"
                  aria-label="Search by stage ID, name, or status"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-400 dark:focus:outline-blue-500"
                />
                <TableSearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500 sm:size-4 dark:text-zinc-400"
                />
              </div>
            </div>
            <div className="flex-none">
              {buttonHref ? (
                <Button href={buttonHref} color="indigo">
                  {buttonText}
                </Button>
              ) : showCreateModal ? (
                <Button type="button" color="indigo" onClick={handleOpenModal}>
                  {buttonText}
                </Button>
              ) : (
                <Button type="button" color="indigo" onClick={onButtonClick}>
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/** Render Table with Search Bar and Button */}
      {renderTable()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirmOpen(false)
            setDeletingStageId(null)
            setDeletingStageName(null)
          }
        }}
      >
        <DialogTitle>Delete stage</DialogTitle>
        <DialogBody>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Delete "{deletingStageName || 'this stage'}"? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogActions>
          <Button
            type="button"
            outline
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeletingStageId(null)
              setDeletingStageName(null)
              setIsDeleting(false)
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            color="red"
            onClick={async () => {
              if (!deletingStageId) return

              setIsDeleting(true)
              try {
                await api.delete(`/phases/${deletingStageId}`)
                setDeleteConfirmOpen(false)
                setDeletingStageId(null)
                setDeletingStageName(null)
                setIsDeleting(false)
                router.refresh()
              } catch (error) {
                console.error('Failed to delete stage:', error)
                showError(error instanceof Error ? error.message : 'Failed to delete stage')
                setIsDeleting(false)
              }
            }}
            disabled={isDeleting || deletingStageId === null}
          >
            {isDeleting ? 'Deleting stage...' : 'Delete stage'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Stage Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} size="3xl">
        <DialogTitle>{editingStage ? 'Edit stage' : 'Create stage'}</DialogTitle>
        <DialogBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-12" aria-busy={isPending}>
            {formError && (
              <div
                className="rounded-lg bg-red-50 p-4 sm:col-span-12 dark:bg-red-950/20"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{formError}</p>
              </div>
            )}

            {!editingStage && (
              <div className="sm:col-span-12">
                <label htmlFor="id_phase" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Phase <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  {isLoadingPhases ? (
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading available phases...
                    </div>
                  ) : phasesError ? (
                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="text-sm text-red-600 dark:text-red-400">{phasesError}</p>
                    </div>
                  ) : (
                    <Select
                      id="id_phase"
                      name="id_phase"
                      autoFocus
                      required
                      disabled={isPending || selectablePhases.length === 0}
                      className="w-full"
                    >
                      <option value="">Choose a phase</option>
                      {selectablePhases.map((phase) => (
                        <option key={phase.id_phase} value={phase.id_phase}>
                          {phase.name_phase}
                        </option>
                      ))}
                    </Select>
                  )}
                  {!isLoadingPhases && !phasesError && selectablePhases.length === 0 ? (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {availablePhases.length === 0
                        ? 'No phases available to add.'
                        : 'All phases are already added to this project.'}
                    </p>
                  ) : null}
                  {selectablePhases.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {selectablePhases.length} phases available to add
                    </p>
                  )}
                </div>
              </div>
            )}

            {editingStage && (
              <div className="sm:col-span-12">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stage Name</label>
                <div className="mt-2">
                  <Input
                    type="text"
                    value={editingStage.name || 'N/A'}
                    disabled
                    className="w-full cursor-not-allowed bg-zinc-100 dark:bg-zinc-800"
                  />
                </div>
              </div>
            )}

            <fieldset className="sm:col-span-12">
              <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Requirements</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <label
                  htmlFor="require_evidence"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-950/10 p-2.5 dark:border-white/10"
                >
                  <Checkbox
                    id="require_evidence"
                    name="require_evidence"
                    checked={stageRequirementFlags.requireEvidence}
                    onChange={(checked) => updateStageRequirementFlag('requireEvidence', checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Evidence</span>
                </label>
                <label
                  htmlFor="require_contribution"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-950/10 p-2.5 dark:border-white/10"
                >
                  <Checkbox
                    id="require_contribution"
                    name="require_contribution"
                    checked={stageRequirementFlags.requireContribution}
                    onChange={(checked) => updateStageRequirementFlag('requireContribution', checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Contribution</span>
                </label>
                <label
                  htmlFor="require_auditory"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-950/10 p-2.5 dark:border-white/10"
                >
                  <Checkbox
                    id="require_auditory"
                    name="require_auditory"
                    checked={stageRequirementFlags.requireAuditory}
                    onChange={(checked) => updateStageRequirementFlag('requireAuditory', checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Auditory</span>
                </label>
              </div>
            </fieldset>

            <fieldset className="sm:col-span-12">
              <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Close by</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <label
                  htmlFor="close_evidence"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-950/10 p-2.5 dark:border-white/10"
                >
                  <Checkbox
                    id="close_evidence"
                    name="close_evidence"
                    checked={stageRequirementFlags.closeEvidence}
                    onChange={(checked) => updateStageRequirementFlag('closeEvidence', checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Evidence</span>
                </label>
                <label
                  htmlFor="close_contribution"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-950/10 p-2.5 dark:border-white/10"
                >
                  <Checkbox
                    id="close_contribution"
                    name="close_contribution"
                    checked={stageRequirementFlags.closeContribution}
                    onChange={(checked) => updateStageRequirementFlag('closeContribution', checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Contribution</span>
                </label>
                <label
                  htmlFor="close_auditory"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-950/10 p-2.5 dark:border-white/10"
                >
                  <Checkbox
                    id="close_auditory"
                    name="close_auditory"
                    checked={stageRequirementFlags.closeAuditory}
                    onChange={(checked) => updateStageRequirementFlag('closeAuditory', checked)}
                    disabled={isPending}
                  />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Auditory</span>
                </label>
              </div>
            </fieldset>

            {!editingStage ? (
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Stage status</label>
                <div className="mt-2">
                  <div className="w-full rounded-lg border border-zinc-950/10 bg-zinc-50 px-3.5 py-2 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                    {getStatusLabel(phaseProjectStatuses[0], 'Not available')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-6">
                <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Stage status <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Select
                    id="status"
                    name="status"
                    autoFocus
                    value={stageStatus}
                    onChange={(event) => setStageStatus(event.target.value)}
                    disabled={isPending || isLoadingEditStage || !canManageStageStatus || isLoadingPhaseProjectStatuses}
                    className="w-full"
                  >
                    <option value="">{isLoadingPhaseProjectStatuses ? 'Loading statuses...' : 'Select status'}</option>
                    {phaseProjectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                  {stageEnumsError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{stageEnumsError}</p>}
                </div>
              </div>
            )}

            <div className="sm:col-span-6">
              <label htmlFor="stageType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Stage Type <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <Select
                  id="stageType"
                  name="stageType"
                  required
                  value={stageType}
                  onChange={(e) => setStageType(e.target.value)}
                  disabled={isPending || isLoadingEditStage || isLoadingPhaseTypes}
                  className="w-full"
                >
                  <option value="">{isLoadingPhaseTypes ? 'Loading types...' : 'Select type'}</option>
                  {phaseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                  {stageType && !phaseTypes.includes(stageType) && (
                    <option value={stageType}>{stageType.charAt(0).toUpperCase() + stageType.slice(1)}</option>
                  )}
                </Select>
                {stageEnumsError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{stageEnumsError}</p>}
              </div>
            </div>

            <div className="sm:col-span-12">
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Phase Description <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  required
                  placeholder="Enter phase description"
                  value={stageDescription}
                  onChange={(e) => setStageDescription(e.target.value)}
                  disabled={isPending || isLoadingEditStage}
                  className="w-full"
                />
              </div>
            </div>

            {editingStage ? (
              <div className="sm:col-span-6">
                <label htmlFor="order" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Stage order
                </label>
                <div className="mt-2">
                  <Input
                    id="order"
                    name="order"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    placeholder="0"
                    defaultValue={editingStage.order || 0}
                    disabled={isPending || isLoadingEditStage}
                    className="w-full"
                  />
                </div>
              </div>
            ) : (
              <div className="sm:col-span-6">
                <label htmlFor="orderPreview" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Stage order
                </label>
                <div className="mt-2">
                  <Input
                    id="orderPreview"
                    type="number"
                    value={nextStageOrder}
                    readOnly
                    disabled
                    aria-readonly="true"
                    className="w-full cursor-not-allowed bg-zinc-100 dark:bg-zinc-800"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Automatically assigned as last stage order + 1.
                  </p>
                </div>
              </div>
            )}

            <div className="sm:col-span-6">
              <label htmlFor="date_start" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Start date
              </label>
              <div className="mt-2">
                <Input
                  id="date_start"
                  name="date_start"
                  type="date"
                  value={dateStart}
                  onChange={(e) => {
                    const newStart = e.target.value
                    setDateStart(newStart)
                    if (newStart && !editingStage) {
                      const d = new Date(newStart)
                      d.setMonth(d.getMonth() + 1)
                      setDateEnd(d.toISOString().split('T')[0])
                    }
                  }}
                  disabled={isPending || isLoadingEditStage}
                  className="w-full"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="date_end" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                End date
              </label>
              <div className="mt-2">
                <Input
                  id="date_end"
                  name="date_end"
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  disabled={isPending || isLoadingEditStage}
                  className="w-full"
                />
              </div>
            </div>

            {editingStage && requiresCancellationDescription(stageStatus) && (
              <div className="sm:col-span-12">
                <label htmlFor="cancel_reason" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Cancellation description <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Textarea
                    id="cancel_reason"
                    name="cancel_reason"
                    rows={4}
                    placeholder="Explain why this stage is being canceled"
                    required
                    disabled={isPending || isLoadingEditStage}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div className="sm:col-span-6">
              <label
                htmlFor="contribution_required"
                className="block text-sm/6 font-medium text-zinc-900 dark:text-white"
              >
                Required contribution <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <div className="flex items-center rounded-md bg-white px-3 outline-1 -outline-offset-1 outline-zinc-950/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-blue-500 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-blue-500">
                  <div className="shrink-0 text-base text-zinc-500 select-none sm:text-sm/6 dark:text-zinc-400">$</div>
                  <input
                    id="contribution_required"
                    name="contribution_required"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    defaultValue={editingStage ? editingStage.contributionRequired || 0 : 0}
                    required
                    disabled={isPending}
                    aria-describedby="contribution_required-currency"
                    onChange={handleContributionInput}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                        e.preventDefault()
                      }
                    }}
                    className="block min-w-0 grow bg-white py-1.5 pr-3 pl-1 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm/6 dark:bg-transparent dark:text-white dark:placeholder:text-zinc-500"
                  />
                  <div
                    id="contribution_required-currency"
                    className="shrink-0 text-base text-zinc-500 select-none sm:text-sm/6 dark:text-zinc-400"
                  >
                    USD
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
              <label
                htmlFor="contribution_received"
                className="block text-sm/6 font-medium text-zinc-900 dark:text-white"
              >
                Received contribution <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <div className="flex items-center rounded-md bg-white px-3 outline-1 -outline-offset-1 outline-zinc-950/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-blue-500 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-blue-500">
                  <div className="shrink-0 text-base text-zinc-500 select-none sm:text-sm/6 dark:text-zinc-400">$</div>
                  <input
                    id="contribution_received"
                    name="contribution_received"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    defaultValue={editingStage ? editingStage.contributionReceived || 0 : 0}
                    required
                    disabled={isPending}
                    aria-describedby="contribution_received-currency"
                    onChange={handleContributionInput}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                        e.preventDefault()
                      }
                    }}
                    className="block min-w-0 grow bg-white py-1.5 pr-3 pl-1 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm/6 dark:bg-transparent dark:text-white dark:placeholder:text-zinc-500"
                  />
                  <div
                    id="contribution_received-currency"
                    className="shrink-0 text-base text-zinc-500 select-none sm:text-sm/6 dark:text-zinc-400"
                  >
                    USD
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:col-span-12">
              <label htmlFor="stage_weight" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Stage weight <span className="font-bold text-blue-600 dark:text-blue-400">({stageWeight}%)</span>
              </label>
              <div className="mt-2">
                <input
                  id="stage_weight"
                  name="stage_weight"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={stageWeight}
                  onChange={(e) => setStageWeight(parseInt(e.target.value, 10))}
                  disabled={isPending}
                  style={getStageWeightTrackStyle(stageWeight)}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-blue-600 transition-all [--slider-fill:var(--color-blue-600)] [--slider-track:var(--color-zinc-300)] hover:accent-blue-500 motion-reduce:transition-none dark:[--slider-fill:var(--color-blue-500)] dark:[--slider-track:var(--color-zinc-700)]"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Controls this stage&apos;s contribution weight relative to other stages.
                </p>
              </div>
            </div>

            <DialogActions className="!mt-6 sm:col-span-12">
              <Button type="button" outline onClick={() => handleCloseModal()} disabled={isPending}>
                Cancel
              </Button>
              {!editingStage ? (
                <Button
                  type="submit"
                  color="indigo"
                  disabled={isPending || isLoadingPhases || selectablePhases.length === 0}
                  loading={isPending}
                >
                  Create stage
                </Button>
              ) : (
                <Button type="submit" color="indigo" disabled={isPending} loading={isPending}>
                  Update stage
                </Button>
              )}
            </DialogActions>
          </form>
        </DialogBody>
      </Dialog>

      {/* Upload Evidence Dialog */}
      <Dialog open={isUploadModalOpen} onClose={handleCloseUploadModal} size="md">
        <DialogTitle>Upload evidence</DialogTitle>
        <DialogBody>
          {selectedStage && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Stage: <span className="font-semibold">{selectedStage.name || 'N/A'}</span>
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/20'
                    : selectedFile
                      ? 'border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-950/20'
                      : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  disabled={isUploading}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center space-y-3 p-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <svg
                        className="h-8 w-8 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{selectedFile.name}</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        setUploadError(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <svg
                        className="h-8 w-8 text-zinc-500 dark:text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {isDragging ? 'Drop your evidence file here' : 'Drag and drop an evidence file here'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">or click to choose a file</p>
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                        PDF, DOC, DOCX, JPG, PNG, GIF (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <>
            <Button outline onClick={handleCloseUploadModal} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="min-w-[100px]">
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload'
              )}
            </Button>
          </>
        </DialogActions>
      </Dialog>

      {/* Contribution Modal */}
      {enablePayment && (
        <ContributionModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedStageForPayment(null)
          }}
          stage={selectedStageForPayment}
          projectId={projectId || ''}
          projectTotalContributed={projectTotalContributed}
        />
      )}

      <ProofViewModal proof={selectedProof} isOpen={isProofModalOpen} onClose={handleCloseProofModal} />
    </>
  )
}
