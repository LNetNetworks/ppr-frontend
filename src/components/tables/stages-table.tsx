'use client'

import { AuditModal } from '@/components/audit-modal'
import { Button } from '@/components/button'
import { ContributionModal } from '@/components/contribution-modal'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Link } from '@/components/link'
import { ProofViewModal, type ProofPreview } from '@/components/proof-view-modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import {
  TableActionsIcon,
  TableAuditCompleteIcon,
  TableAuditPendingIcon,
  TableEvidenceCompleteIcon,
  TablePaymentIcon,
  TableSearchIcon,
  TableUploadIcon,
} from '@/components/table-icons'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import { useApiClient, useUploadEvidence } from '@/lib/api-services'
import { formatHashPreview } from '@/lib/hash-utils'
import { getStageProofPreview, type UploadedStageProof } from '@/lib/phase-proof'
import { getStatusLabel } from '@/lib/status-labels'
import { getStatusClass, STATUS_BADGE_BASE_CLASS } from '@/lib/status-styles'
import type { Phase } from '@/types/api'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'

interface StagesTableProps {
  stages: Phase[]
  isLoading?: boolean
  emptyMessage?: string
  projectId?: string
  projectTotalContributed?: number
  onUploadProof?: (stage: Phase) => void
  title?: string
  description?: string
  enablePayment?: boolean
  hideActions?: boolean
}

/**
 * Reusable Stages Table Component
 * Displays a list of stages in a table format
 */
export function StagesTable({
  stages,
  isLoading = false,
  emptyMessage = 'No stages found',
  projectId,
  projectTotalContributed = 0,
  onUploadProof,
  title,
  description = 'View all stages for this project',
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
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<Phase | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedStageForPayment, setSelectedStageForPayment] = useState<Phase | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // uploadSuccess removed
  const [uploadedEvidenceByStageKey, setUploadedEvidenceByStageKey] = useState<Record<string, UploadedStageProof>>({})
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)
  const [selectedProof, setSelectedProof] = useState<ProofPreview | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [selectedStageForAudit, setSelectedStageForAudit] = useState<Phase | null>(null)

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
      setUploadError('Failed to upload evidence. Please try again.')
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

      setIsDragging(false)
    }
  }

  const handleSuccessClose = () => {
    setSelectedFile(null)
    setSelectedStage(null)

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

  const canShowUploadButton = (stage: Phase) => {
    return stage.requireEvidence && (onUploadProof || projectId || stage.projectId)
  }

  const hasStageAuditEvidence = (stage: Phase) => {
    const evidenceRecords = Array.isArray((stage as Record<string, unknown>).evidences)
      ? ((stage as Record<string, unknown>).evidences as Record<string, unknown>[])
      : []

    return evidenceRecords.some((evidence) => {
      const evidenceText = [evidence.name, evidence.file_name, evidence.description, evidence.type, evidence.category]
        .map((value) => String(value || '').toLowerCase())
        .join(' ')

      return evidenceText.includes('audit') || evidenceText.includes('auditory')
    })
  }

  const handleRowClick = (stage: Phase, e: React.MouseEvent) => {
    if (!canNavigateToTasks) {
      return
    }

    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a') || target.closest('[role="menu"]')) {
      return
    }

    const stageProjectId = projectId || stage.projectId
    const phaseId = stage.idPhaseProject || stage.idPhase || stage.id

    if (!stageProjectId) {
      console.error('Project ID is required to navigate to tasks')
      return
    }

    if (!phaseId) {
      console.error('Phase ID is required to navigate to tasks')
      return
    }

    // Navigate to tasks page with phaseId query parameter
    router.push(`${rolePrefix}/projects/${stageProjectId}/tasks?phaseId=${phaseId}`)
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
    let columnCount = 5 // Base: ID, Name, Status, Proof, Hash
    if (enablePayment) columnCount++
    if (hasRole('verifier')) columnCount++
    if (!hideActions) columnCount++

    if (isLoading) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader className="text-center">Evidence</TableHeader>
              <TableHeader className="text-center">Hash</TableHeader>
              {enablePayment && <TableHeader className="text-center">Payment</TableHeader>}
              {hasRole('verifier') && <TableHeader className="text-center">Audit</TableHeader>}
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
              <TableHeader>Name</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader className="text-center">Evidence</TableHeader>
              <TableHeader className="text-center">Hash</TableHeader>
              {enablePayment && <TableHeader className="text-center">Payment</TableHeader>}
              {hasRole('verifier') && <TableHeader className="text-center">Audit</TableHeader>}
              {!hideActions && <TableHeader className="text-center">Actions</TableHeader>}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center text-zinc-500">
                {searchQuery ? `No stages found matching "${searchQuery}"` : emptyMessage}
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
            <TableHeader>Name</TableHeader>
            <TableHeader className="text-center">Status</TableHeader>
            <TableHeader className="text-center">Evidence</TableHeader>
            <TableHeader className="text-center">Hash</TableHeader>
            {enablePayment && <TableHeader className="text-center">Payment</TableHeader>}
            {hasRole('verifier') && <TableHeader className="text-center">Audit</TableHeader>}
            {!hideActions && <TableHeader className="text-center">Actions</TableHeader>}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStages.map((stage) => {
            const evidence = getStageEvidence(stage)
            const stageRecord = stage as Phase & { require_contribution?: boolean }
            const canPayStage = Boolean(stage.requireContribution ?? stageRecord.require_contribution ?? false)
            const hasAuditEvidence = hasStageAuditEvidence(stage)
            return (
              <TableRow
                key={stage.id}
                title={`Stage ${stage.name}`}
                onClick={(e) => handleRowClick(stage, e)}
                className={canNavigateToTasks ? 'cursor-pointer' : undefined}
              >
                <TableCell className="font-mono text-sm">{stage.idPhase || stage.id}</TableCell>
                <TableCell className="font-medium">{stage.name || 'N/A'}</TableCell>
                <TableCell className="text-center">
                  <span className={`${STATUS_BADGE_BASE_CLASS} ${getStatusClass(stage.status)}`}>
                    {getStatusLabel(stage.status, 'Not set')}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex min-h-[2.5rem] items-center justify-center">
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
                      onClick={(e) => e.stopPropagation()}
                    >
                      {formatHashPreview(evidence.hash)}
                    </Link>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                {enablePayment && (
                  <TableCell className="text-center">
                    <div
                      className="flex min-h-[2.5rem] items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!canPayStage) return
                          setSelectedStageForPayment(stage)
                          setIsPaymentModalOpen(true)
                        }}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-md bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 motion-reduce:transition-none dark:focus-visible:outline-blue-400 ${
                          canPayStage
                            ? 'cursor-pointer text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-950/20 dark:hover:text-green-300'
                            : 'cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                        }`}
                        title={canPayStage ? 'Pay' : 'This stage does not require contribution'}
                        aria-label={canPayStage ? 'Pay stage' : 'Pay stage (disabled)'}
                        disabled={!canPayStage}
                      >
                        <TablePaymentIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </TableCell>
                )}
                {hasRole('verifier') && (
                  <TableCell className="text-center">
                    <div
                      className="flex min-h-[2.5rem] items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStageForAudit(stage)
                          setIsAuditModalOpen(true)
                        }}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none ${
                          hasAuditEvidence
                            ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-300 dark:focus-visible:outline-emerald-400'
                            : 'text-blue-600 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/20 dark:hover:text-blue-300 dark:focus-visible:outline-blue-400'
                        }`}
                        title={hasAuditEvidence ? 'Audit evidence uploaded' : 'Audit stage'}
                        aria-label={hasAuditEvidence ? 'Audit stage with uploaded evidence' : 'Audit stage'}
                      >
                        {hasAuditEvidence ? (
                          <TableAuditCompleteIcon className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <TableAuditPendingIcon className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
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
                          {/* Stage editing is requirement STAG-07 and its route does not exist yet. See docs/DEUDA-TECNICA.md */}
                          {/*  <DropdownItem
                            href={`${rolePrefix}/projects/${stage.projectId}/stages/${stage.id}/edit`}
                          >
                            <DropdownLabel>Edit</DropdownLabel>
                          </DropdownItem> */}
                          <DropdownItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingStageId(stage.id)
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

  // If title is provided, wrap in container with header
  if (title) {
    return (
      <>
        {/* Title + Search aligned */}
        <div className="border-b border-zinc-200 pb-5 sm:flex sm:items-center sm:justify-between dark:border-white/10">
          <div>
            {title && <h1 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h1>}
            {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
          </div>

          {/* Search bar */}
          <div className="mt-3 w-full sm:mt-0 sm:w-auto">
            <div className="relative">
              <input
                id="query"
                name="query"
                type="text"
                placeholder="Search by stage ID, name, or status"
                aria-label="Search by stage ID, name, or status"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-400 dark:focus:outline-blue-500"
              />
              <TableSearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500 sm:size-4 dark:text-zinc-400"
              />
            </div>
          </div>
        </div>

        {renderTable()}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => {
            if (!isDeleting) {
              setDeleteConfirmOpen(false)
              setDeletingStageId(null)
            }
          }}
        >
          <DialogTitle>Delete stage</DialogTitle>
          <DialogBody>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Are you sure you want to delete this stage? This action cannot be undone.
            </p>
          </DialogBody>
          <DialogActions>
            <Button
              type="button"
              outline
              onClick={() => {
                setDeleteConfirmOpen(false)
                setDeletingStageId(null)
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
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
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
                  } `}
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
                          {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">or click to browse</p>
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

        {/* Audit Modal */}
        {hasRole('verifier') && (
          <AuditModal
            isOpen={isAuditModalOpen}
            onClose={() => {
              setIsAuditModalOpen(false)
              setSelectedStageForAudit(null)
            }}
            stage={selectedStageForAudit}
            projectId={projectId || selectedStageForAudit?.projectId}
          />
        )}

        <ProofViewModal proof={selectedProof} isOpen={isProofModalOpen} onClose={handleCloseProofModal} />
      </>
    )
  }

  // Otherwise, return table with search bar
  return (
    <>
      <div className="border-b border-zinc-200 pb-5 sm:flex sm:items-center sm:justify-end dark:border-white/10">
        <div className="mt-3 flex sm:mt-0">
          <div className="-mr-px grid grow grid-cols-1 focus-within:relative">
            <input
              id="query"
              name="query"
              type="text"
              placeholder="Search stages"
              aria-label="Search stages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:pl-9 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-400 dark:focus:outline-blue-500"
            />
            <TableSearchIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-zinc-500 sm:size-4 dark:text-zinc-400"
            />
          </div>
        </div>
      </div>
      {renderTable()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirmOpen(false)
            setDeletingStageId(null)
          }
        }}
      >
        <DialogTitle>Delete stage</DialogTitle>
        <DialogBody>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Are you sure you want to delete this stage? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogActions>
          <Button
            type="button"
            outline
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeletingStageId(null)
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
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
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
                } `}
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
                        {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">or click to browse</p>
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

      {/* Audit Modal */}
      {hasRole('verifier') && (
        <AuditModal
          isOpen={isAuditModalOpen}
          onClose={() => {
            setIsAuditModalOpen(false)
            setSelectedStageForAudit(null)
          }}
          stage={selectedStageForAudit}
          projectId={projectId || selectedStageForAudit?.projectId}
        />
      )}

      <ProofViewModal proof={selectedProof} isOpen={isProofModalOpen} onClose={handleCloseProofModal} />
    </>
  )
}
