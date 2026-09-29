'use client'

import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Link } from '@/components/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { TableActionsIcon } from '@/components/table-icons'
import { useAuth } from '@/hooks/use-auth'
import { getStatusLabel } from '@/lib/status-labels'
import { getStatusClass, STATUS_BADGE_BASE_CLASS } from '@/lib/status-styles'
import type { Project } from '@/types/api'
import { usePathname } from 'next/navigation'

interface ProjectsTableProps {
  projects: Project[]
  isLoading?: boolean
  emptyMessage?: string
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  onButtonClick?: () => void
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
  buttonText,
  buttonHref,
  onButtonClick,
}: ProjectsTableProps) {
  const pathname = usePathname()
  const { hasRole } = useAuth()

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

    if (projects.length === 0) {
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
                {emptyMessage}
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
          {[...projects]
            .sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
              return dateB - dateA
            })
            .map((project, index) => {
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
                    <div className="relative z-10 flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <Dropdown>
                        <DropdownButton plain aria-label="More options">
                          <TableActionsIcon />
                        </DropdownButton>
                        <DropdownMenu anchor="bottom end">
                          <DropdownItem href={projectUrl} disabled={!projectUrl}>
                            <DropdownLabel>View</DropdownLabel>
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

  // If title or buttonText is provided, render with the same section header layout used across resource views.
  if (title || buttonText) {
    return (
      <>
        <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="sm:flex-auto">
              {title && <h1 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h1>}
              {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
            </div>
            {buttonText && (
              <div className="mt-4 sm:mt-0 sm:ml-4 sm:flex-none">
                {buttonHref ? (
                  <Link
                    href={buttonHref}
                    className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500"
                  >
                    {buttonText}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onButtonClick}
                    className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500"
                  >
                    {buttonText}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {renderTable()}
      </>
    )
  }

  // Otherwise, return table without header wrapper
  return renderTable()
}
