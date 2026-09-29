'use client'

import { Heading } from '@/components/heading'
import { useToast } from '@/components/toast'
import { transformApiTask } from '@/lib/api-mappers'
import { useApiClient, useFetchEnums } from '@/lib/api-services'
import { formatCalendarDate } from '@/lib/date-utils'
import { getBackendEnumValues } from '@/lib/enum-utils'
import { getStatusClass } from '@/lib/status-styles'
import type { ApiProject, ApiResponse, ApiTask, Phase, Project } from '@/types/api'
import {
  BanknotesIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeAltIcon,
  TagIcon,
} from '@heroicons/react/16/solid'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ProgressBar from './progress-bar'

interface ProjectDetailsHeaderProps {
  project: Project
  stages?: Phase[]
  hideTotalContributed?: boolean
  enableStatusEdit?: boolean
}

const PROJECT_COMPLETED_STATUSES = new Set(['closed', 'completed'])
const STAGE_CLOSED_STATUSES = new Set(['closed', 'completed'])
const TASK_CLOSED_STATUSES = new Set(['closed', 'completed'])

function normalizeStatus(status: string | undefined): string {
  return (status || '').trim().toLowerCase()
}

function formatStatusLabel(status: string | undefined): string {
  const normalized = normalizeStatus(status)
  if (!normalized) return 'Not set'
  if (normalized === 'inprogress') return 'In Progress'
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Format currency helper
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Project Details Header Component
 * Displays project information and progress bar based on phase completion status
 */
export function ProjectDetailsHeader({
  project,
  stages = [],
  hideTotalContributed = false,
  enableStatusEdit = false,
}: ProjectDetailsHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [projectStatus, setProjectStatus] = useState(normalizeStatus(project.status))
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [projectStatusOptions, setProjectStatusOptions] = useState<string[]>([])
  const projectStatusesLoadedRef = useRef(false)
  const [isLoadingProjectStatuses, setIsLoadingProjectStatuses] = useState(false)
  const [projectStatusLoadError, setProjectStatusLoadError] = useState<string | null>(null)
  const api = useApiClient()
  const fetchEnums = useFetchEnums()
  const fetchEnumsRef = useRef(fetchEnums)
  const router = useRouter()
  const { success: showSuccess, warning: showWarning, error: showError } = useToast()
  const showErrorRef = useRef(showError)
  const canEditStatus = enableStatusEdit

  useEffect(() => {
    fetchEnumsRef.current = fetchEnums
  }, [fetchEnums])

  useEffect(() => {
    showErrorRef.current = showError
  }, [showError])

  useEffect(() => {
    if (projectStatusesLoadedRef.current) {
      return
    }

    let isCancelled = false
    setIsLoadingProjectStatuses(true)
    setProjectStatusLoadError(null)

    const loadProjectStatuses = async () => {
      const timeoutMs = 10000
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out loading project status options.')), timeoutMs)
      )

      try {
        const enums = await Promise.race([fetchEnumsRef.current(), timeoutPromise])
        if (isCancelled) return
        const statuses = getBackendEnumValues(enums, 'projectStatus')
          .map((status) => status.trim().toLowerCase())
          .filter(Boolean)
        const uniqueStatuses = Array.from(new Set(statuses))
        if (uniqueStatuses.length > 0) {
          setProjectStatusOptions(uniqueStatuses)
          projectStatusesLoadedRef.current = true
          return
        }

        const errorMessage = 'No project status values returned by backend enums.'
        setProjectStatusOptions([])
        setProjectStatusLoadError(errorMessage)
        showErrorRef.current(errorMessage)
        projectStatusesLoadedRef.current = true
      } catch (error) {
        if (isCancelled) return
        console.error('Failed to fetch project status enums:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unable to load project statuses'
        setProjectStatusOptions([])
        setProjectStatusLoadError(errorMessage)
        showErrorRef.current(errorMessage)
        projectStatusesLoadedRef.current = true
      } finally {
        if (isCancelled) return
        setIsLoadingProjectStatuses(false)
      }
    }

    void loadProjectStatuses()

    return () => {
      isCancelled = true
    }
  }, [])

  // Calculate phase counts
  const totalStages = stages.length
  const completedStages = stages.filter((phase) => phase.status === 'completed').length

  // Calculate progress based on completed stages / total stages
  const progress = totalStages === 0 ? 0 : Math.min(100, Math.max(0, Math.round((completedStages / totalStages) * 100)))

  const showProgress = stages.length > 0
  const hasProjectStatusOptions = projectStatusOptions.length > 0
  const safeProjectStatus = hasProjectStatusOptions && projectStatusOptions.includes(projectStatus) ? projectStatus : ''

  // Extract project data fields
  const typeProject = (project.type_project as string) || 'N/A'
  const dateStart = (project.date_start as string) || 'N/A'
  const dateEnd = (project.date_end as string) || 'N/A'
  const idOrganization = (project.id_organization as string) || 'N/A'
  const countryRegion = (project.country_region as string) || 'N/A'
  // Prefer token_balance (real-time from blockchain) over total_contributed_amount (static from DB)
  const tokenBalanceStr = project.token_balance as string | undefined
  const totalContributedAmount = tokenBalanceStr
    ? parseFloat(tokenBalanceStr)
    : (project.total_contributed_amount as number) || 0
  const projectId = String(project.id || '').trim()

  const updatePayloadBase = {
    name_project: String((project as { name_project?: string }).name_project || project.name || '').trim(),
    description: (project.description as string) || undefined,
    id_organization:
      (project.organizationId as string) ||
      ((project as { id_organization?: string }).id_organization as string) ||
      undefined,
    type_project:
      ((project as { typeProject?: string }).typeProject as string) ||
      ((project as { type_project?: string }).type_project as string) ||
      undefined,
    type_currency:
      ((project as { typeCurrency?: string }).typeCurrency as string) ||
      ((project as { type_currency?: string }).type_currency as string) ||
      undefined,
    asset_token:
      ((project as { assetToken?: string }).assetToken as string) ||
      ((project as { asset_token?: string }).asset_token as string) ||
      undefined,
    date_start:
      ((project as { dateStart?: string }).dateStart as string) ||
      ((project as { date_start?: string }).date_start as string) ||
      undefined,
    date_end:
      ((project as { dateEnd?: string }).dateEnd as string) ||
      ((project as { date_end?: string }).date_end as string) ||
      undefined,
    country_region:
      ((project as { countryRegion?: string }).countryRegion as string) ||
      ((project as { country_region?: string }).country_region as string) ||
      undefined,
    total_contributed_amount:
      ((project as { totalContributedAmount?: number }).totalContributedAmount as number) ||
      ((project as { total_contributed_amount?: number }).total_contributed_amount as number) ||
      ((project as { monto_total_subvencionado?: number }).monto_total_subvencionado as number) ||
      undefined,
    wallet_provider:
      (project.walletProvider as string) ||
      ((project as { wallet_provider?: string }).wallet_provider as string) ||
      undefined,
  }

  const getProjectPhaseIds = (): string[] => {
    const ids = stages
      .map((stage) =>
        String(
          stage.idPhaseProject || stage.id || (stage as { id_phase_project?: string }).id_phase_project || ''
        ).trim()
      )
      .filter(Boolean)
    return Array.from(new Set(ids))
  }

  const validateProjectCanBeCompleted = async (): Promise<string | null> => {
    const hasOpenStages = stages.some((stage) => !STAGE_CLOSED_STATUSES.has(normalizeStatus(stage.status)))

    if (hasOpenStages) {
      return 'All stages must be closed or completed before setting the project to completed.'
    }

    const phaseIds = getProjectPhaseIds()
    if (phaseIds.length === 0) {
      return null
    }

    const taskLists = await Promise.all(
      phaseIds.map(async (phaseId) => {
        const response = await api.get<ApiResponse<ApiTask[]>>(`/projects/${projectId}/phases/${phaseId}/tasks`)
        if (!response || !Array.isArray(response.data)) {
          return []
        }
        return response.data.map(transformApiTask)
      })
    )

    const allTasks = taskLists.flat()
    const hasOpenTasks = allTasks.some((task) => !TASK_CLOSED_STATUSES.has(normalizeStatus(task.status)))

    if (hasOpenTasks) {
      return 'All tasks must be closed or completed before setting the project to completed.'
    }

    return null
  }

  const handleStatusChange = async (nextStatusRaw: string) => {
    if (!canEditStatus) {
      showError('Only provider can update project status.', 'Permission denied')
      return
    }

    const nextStatus = normalizeStatus(nextStatusRaw)

    if (!nextStatus || isUpdatingStatus) {
      return
    }

    if (!hasProjectStatusOptions) {
      showError('Project status options are unavailable. Verify backend enums.', 'Update failed')
      return
    }

    if (!projectStatusOptions.includes(nextStatus)) {
      showError('Selected project status is not available in backend enums.', 'Update failed')
      return
    }

    if (nextStatus === projectStatus) {
      return
    }

    if (!projectId) {
      const message = 'Project ID is missing, status cannot be updated.'
      showError(message, 'Update failed')
      return
    }

    setIsUpdatingStatus(true)

    try {
      if (PROJECT_COMPLETED_STATUSES.has(nextStatus)) {
        const validationError = await validateProjectCanBeCompleted()
        if (validationError) {
          showWarning(validationError, 'Status not updated')
          return
        }
      }

      const response = await api.put<ApiResponse<ApiProject>>(`/projects/${projectId}`, {
        ...updatePayloadBase,
        status: nextStatus,
      })

      const updatedStatus = normalizeStatus(response?.data?.status || nextStatus)
      setProjectStatus(updatedStatus)
      showSuccess(`Project status changed to ${formatStatusLabel(updatedStatus)}.`, 'Status updated')
      router.refresh()
    } catch (error) {
      console.error('Failed to update project status:', error)
      const message = error instanceof Error ? error.message : 'Failed to update project status.'
      showError(message, 'Update failed')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="mb-8">
      <div className="mb-8">
        {/* Project Info */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Heading level={1}>{project.name}</Heading>
            {project.description && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{project.description}</p>
            )}
          </div>
          <div className="min-w-[220px] sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              {canEditStatus ? (
                <div className="relative inline-block">
                  <select
                    className={`min-w-36 appearance-none rounded-lg px-4 py-1.5 pr-10 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 ${getStatusClass(projectStatus)}`}
                    value={safeProjectStatus}
                    onChange={(event) => void handleStatusChange(event.target.value)}
                    disabled={isUpdatingStatus || isLoadingProjectStatuses || !hasProjectStatusOptions}
                    aria-label="Project status"
                  >
                    <option value="">{isLoadingProjectStatuses ? 'Loading statuses...' : 'Select status'}</option>
                    {projectStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                </div>
              ) : (
                <span
                  className={`inline-flex items-center rounded-lg px-4 py-1.5 text-sm font-semibold ${getStatusClass(projectStatus)}`}
                >
                  {formatStatusLabel(projectStatus)}
                </span>
              )}
            </div>
            {projectStatusLoadError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{projectStatusLoadError}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="mb-4">
            <ProgressBar progress={progress} label={`${completedStages} of ${totalStages} stages completed`} />
          </div>
        )}

        {/* Stats */}
        {showProgress && (
          <div className="grid grid-cols-1 divide-y divide-zinc-200 border-t border-zinc-200 bg-zinc-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="px-6 py-5 text-center text-sm font-medium">
              <span className="text-zinc-900 dark:text-white">{totalStages}</span>{' '}
              <span className="text-zinc-600 dark:text-zinc-400">Total Stages</span>
            </div>
            <div className="px-6 py-5 text-center text-sm font-medium">
              <span className="text-zinc-900 dark:text-white">{completedStages}</span>{' '}
              <span className="text-zinc-600 dark:text-zinc-400">Completed</span>
            </div>
            <div className="px-6 py-5 text-center text-sm font-medium">
              <span className="text-zinc-900 dark:text-white">{progress}%</span>{' '}
              <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
            </div>
          </div>
        )}
      </div>

      {/* Project Details Section */}
      <div className="mb-8">
        <div className="px-4 sm:px-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center justify-between text-left"
            type="button"
          >
            <h3 className="text-base/7 font-semibold text-zinc-900 dark:text-white">Project Details</h3>
            {isCollapsed ? (
              <ChevronDownIcon className="size-5 text-zinc-400 dark:text-zinc-500" />
            ) : (
              <ChevronUpIcon className="size-5 text-zinc-400 dark:text-zinc-500" />
            )}
          </button>
        </div>
        {!isCollapsed && (
          <div className="mt-6">
            <dl className="grid grid-cols-1 sm:grid-cols-3">
              {/* Project Type */}
              <div className="border-t border-zinc-100 px-4 py-6 sm:px-0 dark:border-white/10">
                <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <TagIcon className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span>Project Type</span>
                  </div>
                </dt>
                <dd className="mt-1 text-sm/6 text-zinc-700 sm:mt-2 dark:text-zinc-400">
                  {typeProject.charAt(0).toUpperCase() + typeProject.slice(1).toLowerCase()}
                </dd>
              </div>

              {/* Organization ID */}
              <div className="border-t border-zinc-100 px-4 py-6 sm:px-0 dark:border-white/10">
                <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span>Organization ID</span>
                  </div>
                </dt>
                <dd className="mt-1 text-sm/6 text-zinc-700 sm:mt-2 dark:text-zinc-400">{idOrganization}</dd>
              </div>

              {/* Start Date */}
              <div className="border-t border-zinc-100 px-4 py-6 sm:px-0 dark:border-white/10">
                <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span>Start Date</span>
                  </div>
                </dt>
                <dd className="mt-1 text-sm/6 text-zinc-700 sm:mt-2 dark:text-zinc-400">
                  {formatCalendarDate(dateStart) || dateStart}
                </dd>
              </div>

              {/* End Date */}
              <div className="border-t border-zinc-100 px-4 py-6 sm:px-0 dark:border-white/10">
                <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span>End Date</span>
                  </div>
                </dt>
                <dd className="mt-1 text-sm/6 text-zinc-700 sm:mt-2 dark:text-zinc-400">
                  {formatCalendarDate(dateEnd) || dateEnd}
                </dd>
              </div>

              {/* Country/Region */}
              <div className="border-t border-zinc-100 px-4 py-6 sm:px-0 dark:border-white/10">
                <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <GlobeAltIcon className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <span>Country/Region</span>
                  </div>
                </dt>
                <dd className="mt-1 text-sm/6 text-zinc-700 sm:mt-2 dark:text-zinc-400">{countryRegion}</dd>
              </div>

              {/* Total Expected Amount - Hidden for User */}
              {!hideTotalContributed && (
                <div className="border-t border-zinc-100 px-4 py-6 sm:px-0 dark:border-white/10">
                  <dt className="text-sm/6 font-medium text-zinc-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <BanknotesIcon className="size-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                      <span>Token Balance</span>
                    </div>
                  </dt>
                  <dd className="mt-1 text-sm/6 text-zinc-700 sm:mt-2 dark:text-zinc-400">
                    {formatCurrency(totalContributedAmount)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
