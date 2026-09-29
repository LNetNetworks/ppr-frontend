'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Input } from '@/components/input'
import { Link } from '@/components/link'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { TableActionsIcon, TableSearchIcon } from '@/components/table-icons'
import { Textarea } from '@/components/textarea'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import {
  useApiClient,
  useCreateProject,
  useFetchEnums,
  useFetchOrganizations,
  useUpdateProject,
} from '@/lib/api-services'
import { formatDateForInput } from '@/lib/date-utils'
import { getBackendEnumOptions, getBackendEnumValues } from '@/lib/enum-utils'
import { getStatusLabel } from '@/lib/status-labels'
import { getStatusClass, STATUS_BADGE_BASE_CLASS } from '@/lib/status-styles'
import type { Organization, Project } from '@/types/api'
import { COUNTRY_REGION_OPTIONS } from '@/types/enums'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export interface CreateProjectFormData {
  name: string
  description?: string
  organizationId?: string
  typeProject?: string
  typeCurrency?: string
  assetToken?: string
  dateStart?: string
  dateEnd?: string
  countryRegion?: string
  status?: string
  totalContributedAmount?: number
  walletProvider?: string
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Helper function to get date 1 month in the future in YYYY-MM-DD format
const getOneMonthFutureDate = (): string => {
  const future = new Date()
  future.setMonth(future.getMonth() + 1)
  return future.toISOString().split('T')[0]
}

/**
 * Validates if a string is a valid Ethereum/EVM address
 */
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

interface ProjectsTableProps {
  projects: Project[]
  isLoading?: boolean
  emptyMessage?: string
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  onButtonClick?: () => void
  showCreateModal?: boolean
}

/**
 * Reusable Projects Table Component
 * Displays a list of projects in a table format
 */
export function ProjectsTableWithNewProjectButton({
  projects,
  isLoading = false,
  emptyMessage = 'No projects found',
  title,
  description,
  buttonText = 'New Project',
  buttonHref,
  onButtonClick,
  showCreateModal = false,
}: ProjectsTableProps) {
  const pathname = usePathname()
  const api = useApiClient()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const fetchOrganizations = useFetchOrganizations()
  const fetchEnums = useFetchEnums()
  const { hasRole } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [displayProjects, setDisplayProjects] = useState<Project[]>(projects)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // formSuccess removed
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)
  const [organizationsError, setOrganizationsError] = useState<string | null>(null)
  const [projectTypeOptions, setProjectTypeOptions] = useState<Array<{ value: string; label: string }>>([])
  const [typeCurrencyOptions, setTypeCurrencyOptions] = useState<Array<{ value: string; label: string }>>([])
  const [isLoadingEnumOptions, setIsLoadingEnumOptions] = useState(false)
  const [projectTypesError, setProjectTypesError] = useState<string | null>(null)
  const [typeCurrencyError, setTypeCurrencyError] = useState<string | null>(null)
  const [assetTokenOptions, setAssetTokenOptions] = useState<string[]>([])
  const [assetTokensError, setAssetTokensError] = useState<string | null>(null)

  // Keep local list synchronized with server data while allowing immediate optimistic UI updates.
  useEffect(() => {
    setDisplayProjects(projects)
  }, [projects])

  // Form state to preserve values on error
  const [formData, setFormData] = useState<CreateProjectFormData>({
    name: '',
    description: '',
    organizationId: '',
    typeProject: '',
    typeCurrency: '',
    assetToken: '',
    dateStart: '',
    dateEnd: '',
    countryRegion: '',
    status: '',
    totalContributedAmount: undefined,
    walletProvider: '',
  })

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

  const loadOrganizations = async () => {
    if (organizations.length > 0 || isLoadingOrganizations) {
      return
    }

    setIsLoadingOrganizations(true)
    setOrganizationsError(null)

    try {
      const fetchedOrganizations = await fetchOrganizations()
      setOrganizations(fetchedOrganizations)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to load organizations'
      setOrganizationsError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoadingOrganizations(false)
    }
  }

  const loadEnumOptions = async () => {
    if (
      (projectTypeOptions.length > 0 && typeCurrencyOptions.length > 0 && assetTokenOptions.length > 0) ||
      isLoadingEnumOptions
    ) {
      return
    }

    setIsLoadingEnumOptions(true)
    setProjectTypesError(null)
    setTypeCurrencyError(null)
    setAssetTokensError(null)

    try {
      const enums = await fetchEnums()

      const resolvedProjectTypes = getBackendEnumOptions(enums, 'projectTypes').map((option) => ({
        value: option.value,
        label: option.label,
      }))
      setProjectTypeOptions(resolvedProjectTypes)
      if (resolvedProjectTypes.length === 0) {
        setProjectTypesError('No project types returned by backend enums.')
      }

      const resolvedTypeCurrencies = getBackendEnumOptions(enums, 'typeCurrency').map((option) => ({
        value: option.value,
        label: option.label,
      }))
      setTypeCurrencyOptions(resolvedTypeCurrencies)
      if (resolvedTypeCurrencies.length === 0) {
        setTypeCurrencyError('No currency types returned by backend enums.')
      }

      let resolvedTokens = getBackendEnumValues(enums, 'assetTokenSymbol')
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)

      const prioritized = ['USDC', 'PPR'].filter((token) => resolvedTokens.includes(token))
      const remaining = resolvedTokens.filter((token) => !prioritized.includes(token))
      const finalTokens = [...prioritized, ...remaining]

      setAssetTokenOptions(finalTokens)
      if (finalTokens.length === 0) {
        setAssetTokensError('No asset tokens returned by backend enums.')
      }
    } catch (error) {
      console.error('Failed to fetch enum options:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to load project options'
      setProjectTypesError(errorMessage)
      setTypeCurrencyError(errorMessage)
      setAssetTokensError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoadingEnumOptions(false)
    }
  }

  const handleOpenModal = () => {
    setEditingProject(null)
    setFormData({
      name: '',
      description: '',
      organizationId: '',
      typeProject: '',
      typeCurrency: '',
      assetToken: '',
      dateStart: getTodayDate(),
      dateEnd: getOneMonthFutureDate(),
      countryRegion: '',
      status: '',
      totalContributedAmount: undefined,
      walletProvider: '',
    })
    setIsModalOpen(true)
    setFormError(null)
    // setFormSuccess(false) removed
    void loadOrganizations()
    void loadEnumOptions()
  }

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name || '',
      description: project.description || '',
      organizationId: project.organizationId || '',
      typeProject: ((project.typeProject || project.type_project) as string) || '',
      typeCurrency: ((project.typeCurrency || project.type_currency) as string) || '',
      assetToken: ((project.assetToken || project.asset_token) as string) || '',
      dateStart: formatDateForInput((project.dateStart || project.date_start) as string),
      dateEnd: formatDateForInput((project.dateEnd || project.date_end) as string),
      countryRegion: ((project.countryRegion || project.country_region) as string) || '',
      status: project.status || '',
      totalContributedAmount:
        ((project.totalContributedAmount ||
          project.total_contributed_amount ||
          project.monto_total_subvencionado) as number) || undefined,
      walletProvider: ((project.walletProvider || project.wallet_provider) as string) || '',
    })
    setIsModalOpen(true)
    setFormError(null)
    // setFormSuccess(false) removed
    void loadOrganizations()
    void loadEnumOptions()
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
    setFormError(null)
    // setFormSuccess(false) removed
    // Reset form data when closing
    setFormData({
      name: '',
      description: '',
      organizationId: '',
      typeProject: '',
      typeCurrency: '',
      assetToken: '',
      dateStart: '',
      dateEnd: '',
      countryRegion: '',
      status: '',
      totalContributedAmount: undefined,
      walletProvider: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    // setFormSuccess(false) removed

    const projectData: CreateProjectFormData = {
      name: formData.name || '',
      description: formData.description || undefined,
      organizationId: formData.organizationId || undefined,
      typeProject: formData.typeProject || undefined,
      typeCurrency: formData.typeCurrency || undefined,
      assetToken: formData.assetToken || undefined,
      dateStart: formData.dateStart || undefined,
      dateEnd: formData.dateEnd || undefined,
      countryRegion: formData.countryRegion || undefined,
      status: editingProject ? formData.status || undefined : undefined,
      totalContributedAmount: formData.totalContributedAmount || undefined,
      walletProvider: formData.walletProvider || undefined,
    }

    // Validate required fields
    if (!projectData.name || !projectData.name.trim()) {
      setFormError('Project name is required')
      return
    }

    if (!projectData.description || !projectData.description.trim()) {
      setFormError('Project description is required')
      return
    }

    if (!projectData.organizationId || !projectData.organizationId.trim()) {
      setFormError('Organization ID is required')
      return
    }

    if (!projectData.typeProject || !projectData.typeProject.trim()) {
      setFormError('Project type is required')
      return
    }

    if (!projectData.typeCurrency || !projectData.typeCurrency.trim()) {
      setFormError('Currency type is required')
      return
    }

    if (!projectData.assetToken || !projectData.assetToken.trim()) {
      setFormError('Asset token is required')
      return
    }

    if (!projectData.countryRegion || !projectData.countryRegion.trim()) {
      setFormError('Country/Region is required')
      return
    }

    if (!projectData.totalContributedAmount || projectData.totalContributedAmount <= 0) {
      setFormError('Total Expected Amount is required and must be greater than 0')
      return
    }

    // Validate that end date is greater than start date
    if (projectData.dateStart && projectData.dateEnd) {
      const startDate = new Date(projectData.dateStart)
      const endDate = new Date(projectData.dateEnd)

      if (endDate <= startDate) {
        setFormError('End date must be greater than start date')
        return
      }
    }

    // Validate wallet provider address if provided
    if (projectData.walletProvider && projectData.walletProvider.trim() !== '') {
      if (!isValidEthereumAddress(projectData.walletProvider.trim())) {
        setFormError('Invalid Wallet Provider address format (must be 0x followed by 40 hex characters)')
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Transform form data to API format
      const apiData = {
        name_project: projectData.name,
        description: projectData.description,
        id_organization: projectData.organizationId,
        type_project: projectData.typeProject,
        type_currency: projectData.typeCurrency,
        asset_token: projectData.assetToken,
        date_start: projectData.dateStart,
        date_end: projectData.dateEnd,
        country_region: projectData.countryRegion,
        status: projectData.status,
        total_contributed_amount: projectData.totalContributedAmount,
        wallet_provider: projectData.walletProvider,
      }

      if (editingProject) {
        const updatedProject = await updateProject(editingProject.id, apiData)
        setDisplayProjects((currentProjects) => {
          const existingIndex = currentProjects.findIndex((project) => project.id === updatedProject.id)
          if (existingIndex === -1) {
            return [updatedProject, ...currentProjects]
          }

          return currentProjects.map((project) => (project.id === updatedProject.id ? updatedProject : project))
        })
      } else {
        const createdProject = await createProject(apiData)
        setDisplayProjects((currentProjects) => [
          createdProject,
          ...currentProjects.filter((project) => project.id !== createdProject.id),
        ])
      }

      showSuccess(`Project ${editingProject ? 'updated' : 'created'} successfully!`)
      handleCloseModal()
    } catch (error) {
      console.error(`Failed to ${editingProject ? 'update' : 'create'} project:`, error)
      const errorMessage =
        error instanceof Error ? error.message : `Failed to ${editingProject ? 'update' : 'create'} project`
      setFormError(errorMessage)
      showError(errorMessage)
      // Form data is preserved in state, so user can fix errors and resubmit
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter and sort projects based on search query
  const filteredProjects = useMemo(() => {
    // Sort projects by createdAt (most recent first)
    const sortedProjects = [...displayProjects].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    if (!searchQuery.trim()) {
      return sortedProjects
    }

    const query = searchQuery.toLowerCase().trim()
    return sortedProjects.filter((project) => {
      const name = project.name?.toLowerCase() || ''
      const status = project.status?.toLowerCase() || ''
      const organizationId = project.organizationId?.toLowerCase() || ''
      const id = project.id?.toLowerCase() || ''
      const description = project.description?.toLowerCase() || ''

      return (
        name.includes(query) ||
        status.includes(query) ||
        organizationId.includes(query) ||
        id.includes(query) ||
        description.includes(query)
      )
    })
  }, [displayProjects, searchQuery])

  const renderTable = () => {
    if (isLoading) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Organization</TableHeader>
              <TableHeader>Created At</TableHeader>
              <TableHeader className="text-center">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                Loading projects...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (filteredProjects.length === 0) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Organization</TableHeader>
              <TableHeader>Created At</TableHeader>
              <TableHeader className="text-center">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                {searchQuery ? `No projects found matching "${searchQuery}"` : emptyMessage}
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
            <TableHeader>Status</TableHeader>
            <TableHeader>Organization</TableHeader>
            <TableHeader>Created At</TableHeader>
            <TableHeader className="text-center">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProjects.map((project) => {
            const projectUrl = `${rolePrefix}/projects/${project.id}`
            return (
              <TableRow key={project.id} href={projectUrl} title={`Project ${project.name}`}>
                <TableCell className="font-mono text-sm">{project.id}</TableCell>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  <span className={`${STATUS_BADGE_BASE_CLASS} ${getStatusClass(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </TableCell>
                <TableCell className="text-zinc-500">{project.organizationId || 'N/A'}</TableCell>
                <TableCell className="text-zinc-500">
                  {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                  <div
                    className="relative z-10 flex min-h-[2.5rem] items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Dropdown>
                      <DropdownButton plain aria-label="More options" className="p-1.5">
                        <TableActionsIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem href={projectUrl}>
                          <DropdownLabel>View</DropdownLabel>
                        </DropdownItem>
                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditModal(project)
                          }}
                        >
                          <DropdownLabel>Edit</DropdownLabel>
                        </DropdownItem>
                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingProjectId(project.id)
                            setDeleteConfirmOpen(true)
                          }}
                          disabled={true}
                        >
                          <DropdownLabel>Delete</DropdownLabel>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </TableCell>
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
                  placeholder="Search projects"
                  aria-label="Search projects"
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
              {showCreateModal ? (
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500"
                >
                  {buttonText}
                </button>
              ) : buttonHref ? (
                <Link
                  href={buttonHref}
                  className="inline-block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500"
                >
                  {buttonText}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onButtonClick}
                  className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500"
                >
                  {buttonText}
                </button>
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
            setDeletingProjectId(null)
          }
        }}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogBody>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogActions>
          <Button
            type="button"
            outline
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeletingProjectId(null)
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
              if (!deletingProjectId) return
              const projectIdToDelete = deletingProjectId

              setIsDeleting(true)
              try {
                await api.delete(`/projects/${projectIdToDelete}`)
                setDisplayProjects((currentProjects) =>
                  currentProjects.filter((project) => project.id !== projectIdToDelete)
                )
                setDeleteConfirmOpen(false)
                setDeletingProjectId(null)
                setIsDeleting(false)
              } catch (error) {
                console.error('Failed to delete project:', error)
                showError(error instanceof Error ? error.message : 'Failed to delete project')
                setIsDeleting(false)
              }
            }}
            disabled={isDeleting || deletingProjectId === null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Project Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} size="4xl">
        <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* formSuccess card removed */}

            {formError && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{formError}</p>
              </div>
            )}

            {/* Full width fields */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Project Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Project Description <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  placeholder="Enter project description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full"
                />
              </div>
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="organizationId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Organization ID <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Select
                    id="organizationId"
                    name="organizationId"
                    required
                    value={formData.organizationId || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, organizationId: e.target.value })
                      setOrganizationsError(null)
                    }}
                    disabled={isSubmitting || isLoadingOrganizations}
                    className="w-full"
                  >
                    <option value="">
                      {isLoadingOrganizations ? 'Loading organizations...' : 'Select organization'}
                    </option>
                    {organizations.slice(0, 1).map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name} ({organization.id})
                      </option>
                    ))}
                    {formData.organizationId &&
                      !organizations.some((organization) => organization.id === formData.organizationId) && (
                        <option value={formData.organizationId}>{formData.organizationId}</option>
                      )}
                  </Select>
                  {organizationsError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{organizationsError}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="typeProject" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Project Type <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Select
                    id="typeProject"
                    name="typeProject"
                    required
                    value={formData.typeProject || ''}
                    onChange={(e) => setFormData({ ...formData, typeProject: e.target.value })}
                    disabled={isSubmitting || isLoadingEnumOptions}
                    className="w-full"
                  >
                    <option value="">
                      {isLoadingEnumOptions ? 'Loading project options...' : 'Select project type'}
                    </option>
                    {projectTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                    {formData.typeProject &&
                      !projectTypeOptions.some((type) => type.value === formData.typeProject) && (
                        <option value={formData.typeProject}>{formData.typeProject}</option>
                      )}
                  </Select>
                  {projectTypesError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{projectTypesError}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="typeCurrency" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Currency Type <span className="text-red-500">*</span>
              </label>
              <div className="mt-2">
                <Select
                  id="typeCurrency"
                  name="typeCurrency"
                  required
                  value={formData.typeCurrency || ''}
                  onChange={(e) => setFormData({ ...formData, typeCurrency: e.target.value })}
                  disabled={isSubmitting || isLoadingEnumOptions}
                  className="w-full"
                >
                  <option value="">
                    {isLoadingEnumOptions ? 'Loading currency types...' : 'Select currency type'}
                  </option>
                  {typeCurrencyOptions.map((typeCurrency) => (
                    <option key={typeCurrency.value} value={typeCurrency.value}>
                      {typeCurrency.label}
                    </option>
                  ))}
                  {formData.typeCurrency &&
                    !typeCurrencyOptions.some((typeCurrency) => typeCurrency.value === formData.typeCurrency) && (
                      <option value={formData.typeCurrency}>{formData.typeCurrency}</option>
                    )}
                </Select>
                {typeCurrencyError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{typeCurrencyError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="dateStart" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Start Date
                </label>
                <div className="mt-2">
                  <Input
                    id="dateStart"
                    name="dateStart"
                    type="date"
                    value={formData.dateStart || ''}
                    onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dateEnd" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  End Date
                </label>
                <div className="mt-2">
                  <Input
                    id="dateEnd"
                    name="dateEnd"
                    type="date"
                    value={formData.dateEnd || ''}
                    onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                    min={
                      formData.dateStart
                        ? (() => {
                            // Set min to the day after start date
                            const startDate = new Date(formData.dateStart)
                            startDate.setDate(startDate.getDate() + 1)
                            return startDate.toISOString().split('T')[0]
                          })()
                        : undefined
                    }
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="countryRegion" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Country/Region <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Select
                    id="countryRegion"
                    name="countryRegion"
                    required
                    value={formData.countryRegion || ''}
                    onChange={(e) => setFormData({ ...formData, countryRegion: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <option value="">Select country/region</option>
                    {COUNTRY_REGION_OPTIONS.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <label htmlFor="assetToken" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Asset Token <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Select
                    id="assetToken"
                    name="assetToken"
                    required
                    value={formData.assetToken || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, assetToken: e.target.value })
                      setAssetTokensError(null)
                    }}
                    disabled={isSubmitting || isLoadingEnumOptions}
                    className="w-full"
                  >
                    <option value="">{isLoadingEnumOptions ? 'Loading asset tokens...' : 'Select asset token'}</option>
                    {assetTokenOptions.map((token) => (
                      <option key={token} value={token}>
                        {token}
                      </option>
                    ))}
                    {formData.assetToken && !assetTokenOptions.includes(formData.assetToken) && (
                      <option value={formData.assetToken}>{formData.assetToken}</option>
                    )}
                  </Select>
                  {assetTokensError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{assetTokensError}</p>
                  )}
                </div>
              </div>
            </div>

            {editingProject && (
              <div>
                <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</span>
                <div className="mt-2">
                  <div className="w-full rounded-lg border border-zinc-950/10 bg-zinc-50 px-3.5 py-[calc(--spacing(2.5)-1px)] text-sm/6 text-zinc-700 sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                    {formData.status
                      ? formData.status.replace(/_/g, ' ').charAt(0).toUpperCase() +
                        formData.status.replace(/_/g, ' ').slice(1)
                      : 'Not set'}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="totalContributedAmount"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Total Expected Amount <span className="text-red-500">*</span>
                </label>
                <div className="mt-2">
                  <Input
                    id="totalContributedAmount"
                    name="totalContributedAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Enter Total Expected Amount"
                    value={formData.totalContributedAmount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalContributedAmount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="walletProvider" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Wallet Provider Address
                </label>
                <div className="mt-2">
                  <Input
                    id="walletProvider"
                    name="walletProvider"
                    type="text"
                    placeholder="Enter wallet provider address"
                    value={formData.walletProvider || ''}
                    onChange={(e) => setFormData({ ...formData, walletProvider: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <DialogActions>
              <Button type="button" outline onClick={handleCloseModal} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" disabled={isSubmitting} loading={isSubmitting}>
                {editingProject ? 'Update Project' : 'Create Project'}
              </Button>
            </DialogActions>
          </form>
        </DialogBody>
      </Dialog>
    </>
  )
}
