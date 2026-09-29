'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Link } from '@/components/link'
import { Select } from '@/components/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { TableActionsIcon, TableNextIcon, TablePreviousIcon, TableSearchIcon } from '@/components/table-icons'
import { Textarea } from '@/components/textarea'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import { useAddTaskToPhaseProject, useApiClient, useFetchAvailableTasks, useFetchEnums } from '@/lib/api-services'
import { getBackendEnumValues } from '@/lib/enum-utils'
import { getStatusLabel } from '@/lib/status-labels'
import type { Task } from '@/types/api'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

interface TasksTableWithNewTaskButtonProps {
  tasks: Task[]
  projectId: string
  phaseProjectId: string
  phaseId?: string
  isLoading?: boolean
  emptyMessage?: string
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  onButtonClick?: () => void
  showCreateModal?: boolean
  onTasksChanged?: () => void
}

function normalizeStatus(status?: string): string {
  return (status || '').trim().toLowerCase()
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const typedError = error as {
    message?: unknown
    backendMessage?: unknown
    details?: unknown
    status?: unknown
  }

  if (typeof typedError.backendMessage === 'string' && typedError.backendMessage.trim()) {
    if (typeof typedError.status === 'number') {
      return `${typedError.status} | ${typedError.backendMessage.trim()}`
    }

    return typedError.backendMessage.trim()
  }

  if (typedError.details && typeof typedError.details === 'object') {
    const details = typedError.details as { message?: unknown; error?: unknown }
    if (typeof details.message === 'string' && details.message.trim()) {
      return details.message.trim()
    }
    if (typeof details.error === 'string' && details.error.trim()) {
      return details.error.trim()
    }
  }

  if (typeof typedError.message === 'string' && typedError.message.trim()) {
    return typedError.message.trim()
  }

  return fallback
}

function requiresCancellationDescription(status?: string): boolean {
  const normalized = normalizeStatus(status)
  return normalized === 'canceled'
}

/**
 * Reusable Tasks Table Component with New Task Button
 * Displays a list of tasks in a table format with ability to create new tasks
 */
export function TasksTableWithNewTaskButton({
  tasks,
  projectId,
  phaseProjectId,
  phaseId,
  isLoading = false,
  emptyMessage = 'No tasks found',
  title,
  description,
  buttonText = 'New Task',
  buttonHref,
  onButtonClick,
  showCreateModal = false,
  onTasksChanged,
}: TasksTableWithNewTaskButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const api = useApiClient()
  const addTaskToPhaseProject = useAddTaskToPhaseProject()
  const fetchAvailableTasks = useFetchAvailableTasks()
  const fetchEnums = useFetchEnums()
  const fetchAvailableTasksRef = useRef(fetchAvailableTasks)
  const fetchEnumsRef = useRef(fetchEnums)
  const { hasRole, isLoading: isAuthLoading, isAuthenticated, token } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const showErrorRef = useRef(showError)
  const canManageTaskStatus = pathname?.startsWith('/provider') && hasRole('provider')
  const canLoadTaskStatuses = !isAuthLoading && isAuthenticated && Boolean(token)

  // Keep ref updated with latest function
  useEffect(() => {
    fetchAvailableTasksRef.current = fetchAvailableTasks
  }, [fetchAvailableTasks])

  useEffect(() => {
    fetchEnumsRef.current = fetchEnums
  }, [fetchEnums])

  useEffect(() => {
    showErrorRef.current = showError
  }, [showError])

  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  // formSuccess state removed
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [taskStatusDrafts, setTaskStatusDrafts] = useState<Record<string, string>>({})
  const [taskStatusOptions, setTaskStatusOptions] = useState<string[]>([])
  const taskStatusesLoadedRef = useRef(false)
  const [isLoadingTaskStatuses, setIsLoadingTaskStatuses] = useState(false)
  const [taskStatusesError, setTaskStatusesError] = useState<string | null>(null)

  useEffect(() => {
    if (taskStatusesLoadedRef.current || !canLoadTaskStatuses) {
      return
    }

    let isCancelled = false
    setIsLoadingTaskStatuses(true)
    setTaskStatusesError(null)

    const loadTaskStatuses = async () => {
      const timeoutMs = 10000
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out loading task status options.')), timeoutMs)
      )

      try {
        const enums = await Promise.race([fetchEnumsRef.current(), timeoutPromise])
        if (isCancelled) return

        const statuses = getBackendEnumValues(enums, 'phaseProjectTaskStatus')
          .map((status) => status.trim().toLowerCase())
          .filter(Boolean)
        const uniqueStatuses = Array.from(new Set(statuses))

        if (uniqueStatuses.length > 0) {
          setTaskStatusOptions(uniqueStatuses)
          taskStatusesLoadedRef.current = true
          return
        }

        const errorMessage = 'No task status values returned by backend enums.'
        setTaskStatusOptions([])
        setTaskStatusesError(errorMessage)
        showErrorRef.current(errorMessage)
        taskStatusesLoadedRef.current = true
      } catch (error) {
        if (isCancelled) return
        console.error('Failed to fetch task status enums:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unable to load task statuses'
        setTaskStatusOptions([])
        setTaskStatusesError(errorMessage)
        showErrorRef.current(errorMessage)
        taskStatusesLoadedRef.current = true
      } finally {
        if (isCancelled) return
        setIsLoadingTaskStatuses(false)
      }
    }

    void loadTaskStatuses()

    return () => {
      isCancelled = true
    }
  }, [canLoadTaskStatuses])

  // Available tasks modal state
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [tasksPage, setTasksPage] = useState(0)
  const [tasksTotal, setTasksTotal] = useState(0)
  const [tasksSearchQuery, setTasksSearchQuery] = useState('')
  const tasksLimit = 9
  const [addingTaskIds, setAddingTaskIds] = useState<Set<string>>(new Set())
  const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set())

  // Keep existing task IDs to mark them as disabled/gray in the "Add Task" modal.
  const existingTaskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks])

  useEffect(() => {
    const nextDrafts: Record<string, string> = {}
    tasks.forEach((task) => {
      nextDrafts[task.id] = normalizeStatus(task.status)
    })
    setTaskStatusDrafts(nextDrafts)
  }, [tasks])

  // Form state to preserve values on error
  const [formData, setFormData] = useState({
    description: '',
    status: '',
  })

  const notifyTasksChanged = () => {
    if (onTasksChanged) {
      onTasksChanged()
      return
    }

    router.refresh()
  }

  const handleOpenModal = () => {
    if (showCreateModal) {
      // Open add task modal (select from available tasks)
      setIsAddTaskModalOpen(true)
      setAddingTaskIds(new Set())
      setAddedTaskIds(new Set())
      setTasksPage(0)
      setTasksSearchQuery('')
      // Tasks will be loaded automatically by useEffect when modal opens
    } else {
      // Open edit modal (legacy behavior)
      setEditingTask(null)
      setFormData({
        description: '',
        status: '',
      })
      setIsModalOpen(true)
      setFormError(null)
      // setFormSuccess(false) removed
    }
  }

  useEffect(() => {
    if (!isAddTaskModalOpen) {
      return
    }

    let isCancelled = false

    const loadAvailableTasks = async () => {
      setIsLoadingTasks(true)
      setTasksError(null)
      try {
        const offset = tasksPage * tasksLimit
        const result = await fetchAvailableTasksRef.current(tasksLimit, offset, tasksSearchQuery)

        if (!isCancelled) {
          setAvailableTasks(result.data)
          setTasksTotal(result.total || 0)
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch available tasks:', err)
          const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks'
          setTasksError(errorMessage)
          showError(errorMessage)
          setAvailableTasks([])
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTasks(false)
        }
      }
    }

    loadAvailableTasks()

    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddTaskModalOpen, tasksPage, tasksSearchQuery, tasksLimit])

  const handleTaskSearch = (query: string) => {
    setTasksSearchQuery(query)
    setTasksPage(0) // Reset to first page when searching
  }

  const handleAddTask = async (taskId: string) => {
    // Don't add if already adding or already added
    if (addingTaskIds.has(taskId) || addedTaskIds.has(taskId) || existingTaskIds.has(taskId)) {
      return
    }

    setTasksError(null)
    setAddingTaskIds((prev) => new Set(prev).add(taskId))

    try {
      await addTaskToPhaseProject(projectId, phaseId || phaseProjectId, {
        id_task: taskId,
      })

      // Mark as added
      setAddedTaskIds((prev) => new Set(prev).add(taskId))

      // Refresh the tasks list to show updated state
      notifyTasksChanged()
    } catch (error) {
      console.error('Failed to add task:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add task'
      setTasksError(errorMessage)
      showError(errorMessage)
    } finally {
      setAddingTaskIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleCloseAddTaskModal = () => {
    setIsAddTaskModalOpen(false)
    setAddingTaskIds(new Set())
    setAddedTaskIds(new Set())
    setTasksError(null)
    setTasksSearchQuery('')
    setTasksPage(0)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!canManageTaskStatus) {
      showError('Only provider can update task status')
      return
    }

    const normalizedNewStatus = normalizeStatus(newStatus)
    const currentTask = tasks.find((task) => task.id === taskId)
    const previousStatus = normalizeStatus(taskStatusDrafts[taskId] || currentTask?.status)

    if (!taskStatusOptions.some((status) => normalizeStatus(status) === normalizedNewStatus)) {
      showError('Task status value is not available in backend enums.')
      return
    }

    if (!normalizedNewStatus || normalizedNewStatus === previousStatus) {
      return
    }

    const cancellationDescription = requiresCancellationDescription(normalizedNewStatus)
      ? window.prompt('Please provide a description for canceling this task:')?.trim() || ''
      : ''

    if (requiresCancellationDescription(normalizedNewStatus) && !cancellationDescription) {
      showError('A description is required when changing status to Canceled.')
      return
    }

    setTaskStatusDrafts((currentStatuses) => ({
      ...currentStatuses,
      [taskId]: normalizedNewStatus,
    }))

    const payload: { status_task: string; description?: string } = {
      status_task: normalizedNewStatus,
    }

    if (cancellationDescription) {
      payload.description = cancellationDescription
    }

    setUpdatingTaskId(taskId)
    try {
      await api.put(`/projects/${projectId}/phasesproject/${phaseProjectId}/tasks/${taskId}`, payload)
      // Refresh the page to show updated status
      notifyTasksChanged()
    } catch (error) {
      console.error('Failed to update task status:', error)
      showError(getApiErrorMessage(error, 'Failed to update task status'))
      setTaskStatusDrafts((currentStatuses) => ({
        ...currentStatuses,
        [taskId]: previousStatus,
      }))
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task)
    setFormData({
      description: task.description || '',
      status: normalizeStatus(task.status),
    })
    setIsModalOpen(true)
    setFormError(null)
    // setFormSuccess(false) removed
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTask(null)
    setFormError(null)
    // setFormSuccess(false) removed
    // Reset form data when closing
    setFormData({
      description: '',
      status: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    // setFormSuccess(false) removed

    const currentEditingTask = editingTask
    const isEditingTask = currentEditingTask !== null
    const resolvedStatus = isEditingTask
      ? canManageTaskStatus
        ? normalizeStatus(formData.status || currentEditingTask?.status)
        : normalizeStatus(currentEditingTask?.status)
      : ''

    if (isEditingTask && canManageTaskStatus && !resolvedStatus) {
      setFormError('Task status is required and must come from backend enums.')
      return
    }

    if (
      isEditingTask &&
      canManageTaskStatus &&
      !taskStatusOptions.some((status) => normalizeStatus(status) === resolvedStatus)
    ) {
      setFormError('Selected task status is not available in backend enums.')
      return
    }

    if (isEditingTask && requiresCancellationDescription(resolvedStatus) && !formData.description.trim()) {
      setFormError('Description is required when changing status to Canceled.')
      return
    }

    if (!currentEditingTask) {
      setFormError('Create is only supported from "Add Task" (task catalog).')
      return
    }

    const updateTaskData = {
      description: formData.description.trim() || undefined,
      status_task: isEditingTask ? resolvedStatus || undefined : undefined,
    }

    startTransition(async () => {
      try {
        if (currentEditingTask) {
          // Update task
          await api.put(
            `/projects/${projectId}/phasesproject/${phaseProjectId}/tasks/${currentEditingTask.id}`,
            updateTaskData
          )
        }

        showSuccess(`Task ${isEditingTask ? 'updated' : 'created'} successfully!`)
        handleCloseModal()
        notifyTasksChanged()
      } catch (error) {
        console.error(`Failed to ${isEditingTask ? 'update' : 'create'} task:`, error)
        const errorMessage = getApiErrorMessage(error, `Failed to ${isEditingTask ? 'update' : 'create'} task`)
        setFormError(errorMessage)
        showError(errorMessage)
      }
    })
  }

  // Filter tasks based on search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) {
      return tasks
    }

    const query = searchQuery.toLowerCase().trim()
    return tasks.filter((task) => {
      const name = ((task as any).task_nameTask || task.name || '').toLowerCase()
      const status = task.status?.toLowerCase() || ''
      const id = task.id?.toLowerCase() || ''

      return name.includes(query) || status.includes(query) || id.includes(query)
    })
  }, [tasks, searchQuery])

  const resolvedFormStatus = canManageTaskStatus
    ? normalizeStatus(formData.status || editingTask?.status)
    : normalizeStatus(editingTask?.status)
  const cancellationDescriptionRequired = requiresCancellationDescription(resolvedFormStatus)
  const selectedEditStatus = normalizeStatus(formData.status || editingTask?.status)
  const safeSelectedEditStatus = taskStatusOptions.some((status) => normalizeStatus(status) === selectedEditStatus)
    ? selectedEditStatus
    : ''

  const renderTable = () => {
    if (isLoading) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader>Created At</TableHeader>
              <TableHeader>Due Date</TableHeader>
              <TableHeader className="text-center">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                Loading tasks...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (filteredTasks.length === 0) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader className="text-center">Status</TableHeader>
              <TableHeader>Created At</TableHeader>
              <TableHeader>Due Date</TableHeader>
              <TableHeader className="text-center">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                {searchQuery ? `No tasks found matching "${searchQuery}"` : emptyMessage}
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
            <TableHeader>Created At</TableHeader>
            <TableHeader>Due Date</TableHeader>
            <TableHeader className="text-center">Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredTasks.map((task) => {
            const selectedStatus = normalizeStatus(taskStatusDrafts[task.id] || task.status)
            const safeSelectedStatus = taskStatusOptions.some((status) => normalizeStatus(status) === selectedStatus)
              ? selectedStatus
              : ''

            return (
              <TableRow key={task.id} title={`Task ${(task as any).task_nameTask || task.name || 'N/A'}`}>
                {/** id */}
                <TableCell className="font-mono text-sm">{task.id}</TableCell>
                {/** name */}
                <TableCell className="font-medium">{(task as any).task_nameTask || task.name || 'N/A'}</TableCell>
                {/** status - editable dropdown */}
                <TableCell className="text-center">
                  {canManageTaskStatus && taskStatusOptions.length > 0 ? (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={safeSelectedStatus}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={updatingTaskId === task.id || isLoadingTaskStatuses}
                        className={`w-32 text-xs ${updatingTaskId === task.id ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <option value="">Select status</option>
                        {taskStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <span>{getStatusLabel(task.status, 'Not set')}</span>
                  )}
                </TableCell>
                {/** created at */}
                <TableCell className="text-zinc-500">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
                </TableCell>
                {/** due date */}
                <TableCell className="text-zinc-500">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                </TableCell>
                {/** actions */}
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
                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditModal(task)
                          }}
                        >
                          <DropdownLabel>Edit</DropdownLabel>
                        </DropdownItem>
                        <DropdownItem
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingTaskId(task.id)
                            setDeleteConfirmOpen(true)
                          }}
                          disabled={deletingTaskId === task.id}
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
                  placeholder="Search tasks"
                  aria-label="Search tasks"
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
            setDeletingTaskId(null)
          }
        }}
      >
        <DialogTitle>Delete Task</DialogTitle>
        <DialogBody>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Are you sure you want to delete this task? This action cannot be undone.
          </p>
        </DialogBody>
        <DialogActions>
          <Button
            type="button"
            outline
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeletingTaskId(null)
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
              if (!deletingTaskId) return

              setIsDeleting(true)
              try {
                await api.delete(`/projects/${projectId}/phasesproject/${phaseProjectId}/tasks/${deletingTaskId}`)
                setDeleteConfirmOpen(false)
                setDeletingTaskId(null)
                setIsDeleting(false)
                notifyTasksChanged()
              } catch (error) {
                console.error('Failed to delete task:', error)
                showError(error instanceof Error ? error.message : 'Failed to delete task')
                setIsDeleting(false)
              }
            }}
            disabled={isDeleting || deletingTaskId === null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Tasks Modal - Select from available tasks */}
      <Dialog open={isAddTaskModalOpen} onClose={handleCloseAddTaskModal} size="4xl">
        <DialogTitle>Add Tasks to Stage</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            {tasksError && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{tasksError}</p>
              </div>
            )}

            {/* Search input */}
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={tasksSearchQuery}
                  onChange={(e) => handleTaskSearch(e.target.value)}
                  className="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-400 dark:focus:outline-blue-500"
                />
                <TableSearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500 sm:size-4 dark:text-zinc-400"
                />
              </div>
            </div>

            {/* Tasks grid */}
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading tasks...</p>
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {tasksSearchQuery ? `No tasks found matching "${tasksSearchQuery}"` : 'No tasks available to add'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {/* Deduplicate tasks by ID to prevent UI duplication if API returns duplicates */}
                  {Array.from(new Map(availableTasks.map((task) => [task.id, task])).values()).map((task) => {
                    const isAdding = addingTaskIds.has(task.id)
                    const isAdded = addedTaskIds.has(task.id)
                    const isExisting = existingTaskIds.has(task.id)
                    const isDisabled = isAdding || isAdded || isExisting

                    return (
                      <div
                        key={task.id}
                        className={`relative rounded-lg border p-4 transition-colors ${
                          isAdded
                            ? 'cursor-default border-green-500 bg-green-50 dark:bg-green-950/20'
                            : isAdding
                              ? 'cursor-wait border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                              : isExisting
                                ? 'cursor-not-allowed border-zinc-300 bg-zinc-100 opacity-70 dark:border-zinc-700 dark:bg-zinc-800/60'
                                : 'cursor-pointer border-zinc-200 bg-white hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500'
                        }`}
                        onClick={() => !isDisabled && handleAddTask(task.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                                {task.name || 'Unnamed Task'}
                              </h3>
                              {isAdding && (
                                <span className="inline-flex items-center">
                                  <svg
                                    className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                </span>
                              )}
                              {isAdded && (
                                <span className="inline-flex items-center text-green-600 dark:text-green-400">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                                {task.description}
                              </p>
                            )}
                            {task.id && (
                              <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">ID: {task.id}</p>
                            )}
                            {/* Prioritize added status over existing status to avoid dual labels */}
                            {isAdded ? (
                              <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                                Added to stage
                              </p>
                            ) : isExisting ? (
                              <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                Already in stage
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination controls */}
                <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-white/10">
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {tasksTotal > 0 ? (
                      <>
                        Showing {availableTasks.length} task{availableTasks.length !== 1 ? 's' : ''} on this page
                        (Total: {tasksTotal})
                      </>
                    ) : (
                      <>
                        Showing {availableTasks.length} task{availableTasks.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      outline
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setTasksPage((p) => Math.max(0, p - 1))
                      }}
                      disabled={tasksPage === 0 || isLoadingTasks}
                      className="flex items-center gap-1"
                    >
                      <TablePreviousIcon className="size-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      outline
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setTasksPage((p) => p + 1)
                      }}
                      disabled={
                        isLoadingTasks ||
                        (tasksTotal > 0
                          ? (tasksPage + 1) * tasksLimit >= tasksTotal
                          : availableTasks.length < tasksLimit)
                      }
                      className="flex items-center gap-1"
                    >
                      Next
                      <TableNextIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button type="button" outline onClick={handleCloseAddTaskModal} disabled={isLoadingTasks}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} size="4xl">
        <DialogTitle>Edit Task</DialogTitle>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* formSuccess card removed */}

            {formError && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{formError}</p>
              </div>
            )}

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Description {cancellationDescriptionRequired ? <span className="text-red-500">*</span> : null}
              </label>
              <div className="mt-2">
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Enter task description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required={cancellationDescriptionRequired}
                  disabled={isPending}
                  className="w-full"
                />
              </div>
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Status
                </label>
                <div className="mt-2">
                  <Select
                    id="status"
                    name="status"
                    value={safeSelectedEditStatus}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={
                      isPending || !canManageTaskStatus || isLoadingTaskStatuses || taskStatusOptions.length === 0
                    }
                    className="w-full"
                  >
                    <option value="">{isLoadingTaskStatuses ? 'Loading statuses...' : 'Select status'}</option>
                    {taskStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </Select>
                  {taskStatusesError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{taskStatusesError}</p>
                  )}
                </div>
              </div>
            </div>
            {/* Due date is shown in the table but cannot be set here yet. See docs/DEUDA-TECNICA.md */}
            {/*
              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Due Date
                </label>
                <div className="mt-2">
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    disabled={isPending}
                    className="w-full"
                  />
                </div>
              </div>
            */}

            <DialogActions>
              <Button type="button" outline onClick={handleCloseModal} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" disabled={isPending}>
                {isPending ? 'Updating...' : 'Update Task'}
              </Button>
            </DialogActions>
          </form>
        </DialogBody>
      </Dialog>
    </>
  )
}
