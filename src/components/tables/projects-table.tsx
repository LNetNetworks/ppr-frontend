'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { TableActionsIcon, TableSearchIcon } from '@/components/table-icons'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import { useApiClient } from '@/lib/api-services'
import { getStatusLabel } from '@/lib/status-labels'
import { getStatusClass, STATUS_BADGE_BASE_CLASS } from '@/lib/status-styles'
import type { Project } from '@/types/api'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface ProjectsTableProps {
  projects: Project[]
  isLoading?: boolean
  emptyMessage?: string
  title?: string
  description?: string
}

/**
 * Reusable Projects Table Component
 * Displays a list of projects in a table format
 */
export function ProjectsTable({
  projects,
  isLoading = false,
  emptyMessage = 'No projects found',
  title,
  description,
}: ProjectsTableProps) {
  const pathname = usePathname()
  const router = useRouter()
  const api = useApiClient()
  const { hasRole } = useAuth()
  const { error: showError } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

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

  // Filter and sort projects based on search query
  const filteredProjects = useMemo(() => {
    // Sort projects by createdAt (most recent first)
    const sortedProjects = [...projects].sort((a, b) => {
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
  }, [projects, searchQuery])

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
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProjects.map((project, index) => {
            const projectId = String(
              project.id || (project as any).id_project || (project as any).project_id || ''
            ).trim()
            const projectUrl = projectId ? `${rolePrefix}/projects/${projectId}` : undefined
            return (
              <TableRow key={projectId || `project-${index}`} href={projectUrl} title={`Project ${project.name}`}>
                <TableCell className="font-mono text-sm">{projectId || 'N/A'}</TableCell>
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
                        <DropdownItem href={projectUrl} disabled={!projectUrl}>
                          <DropdownLabel>View</DropdownLabel>
                        </DropdownItem>
                        <DropdownItem href={projectUrl ? `${projectUrl}/edit` : undefined} disabled={!projectUrl}>
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

  // If title is provided, wrap in container with header
  if (title) {
    return (
      <div>
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            {title && <h1 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h1>}
            {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
          </div>
        </div>
        <div className="border-b border-zinc-200 pb-5 sm:flex sm:items-center sm:justify-end dark:border-white/10">
          <div className="mt-3 flex sm:mt-0">
            <div className="-mr-px grid grow grid-cols-1 focus-within:relative">
              <input
                id="query"
                name="query"
                type="text"
                placeholder="Search projects"
                aria-label="Search projects"
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

                setIsDeleting(true)
                try {
                  await api.delete(`/projects/${deletingProjectId}`)
                  setDeleteConfirmOpen(false)
                  setDeletingProjectId(null)
                  setIsDeleting(false)
                  router.refresh()
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
      </div>
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
              placeholder="Search projects"
              aria-label="Search projects"
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

              setIsDeleting(true)
              try {
                await api.delete(`/projects/${deletingProjectId}`)
                setDeleteConfirmOpen(false)
                setDeletingProjectId(null)
                setIsDeleting(false)
                router.refresh()
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
    </>
  )
}
