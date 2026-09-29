'use client'

import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from '@/components/dropdown'
import { Link } from '@/components/link'
import type { Project } from '@/types/api'
import { EllipsisVerticalIcon } from '@heroicons/react/16/solid'

interface ProjectCardProps {
  project: Project
  rolePrefix: string
  variant?: 'link' | 'div'
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  deletingProjectId?: string | null
}

export function ProjectCard({
  project,
  rolePrefix,
  variant = 'div',
  onEdit,
  onDelete,
  deletingProjectId = null,
}: ProjectCardProps) {
  const projectId = String(project.id || (project as any).id_project || (project as any).project_id || '').trim()
  const projectUrl = projectId ? `${rolePrefix}/projects/${projectId}` : undefined

  const getStatusBadgeClass = (status?: string) => {
    if (status === 'inprogress') {
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800/50'
    }
    if (status === 'closed') {
      return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/50 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800/50'
    }
    if (status === 'canceled') {
      return 'bg-red-100 text-red-700 ring-1 ring-red-200/50 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800/50'
    }
    if (status === 'pending') {
      return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200/50 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800/50'
    }
    return 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/50 dark:bg-zinc-800/60 dark:text-zinc-300 dark:ring-zinc-700/50'
  }

  const formatStatus = (status?: string) => {
    if (!status) return 'N/A'
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const cardClassName =
    variant === 'link'
      ? 'group relative block h-full overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/30 dark:hover:shadow-blue-900/20'
      : 'group relative block h-full overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/30 dark:hover:shadow-blue-900/20'

  const handleActionClick: React.MouseEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const baseContent = (
    <>
      {/* Decorative gradient overlay */}
      <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-blue-50/0 via-blue-50/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-blue-950/0 dark:via-blue-950/20" />

      <div className="relative z-0 flex h-full flex-col gap-3">
        {/* Top row: title + status + menu */}
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h3>
            {project.description && (
              <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Status badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow-sm backdrop-blur-sm ${getStatusBadgeClass(
                project.status
              )}`}
            >
              {formatStatus(project.status)}
            </span>

            {/* Actions menu */}
            <div onClick={handleActionClick}>
              <Dropdown>
                <DropdownButton
                  plain
                  aria-label="More options"
                  className="rounded-lg bg-white/80 p-1.5 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <EllipsisVerticalIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                </DropdownButton>
                <DropdownMenu anchor="bottom end">
                  {onEdit && (
                    <DropdownItem
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onEdit(project)
                      }}
                    >
                      <DropdownLabel>Edit</DropdownLabel>
                    </DropdownItem>
                  )}
                  {onDelete && (
                    <DropdownItem
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onDelete(project)
                      }}
                      disabled={true}
                    >
                      <DropdownLabel>Delete</DropdownLabel>
                    </DropdownItem>
                  )}
                  {!onEdit && !onDelete && (
                    <DropdownItem href={projectUrl} disabled={!projectUrl}>
                      <DropdownLabel>View</DropdownLabel>
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-zinc-100 to-transparent dark:via-white/10" />

        {/* Metadata footer */}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {project.organizationId && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Org:</span>
              <span className="text-zinc-700 dark:text-zinc-300">{project.organizationId}</span>
            </div>
          )}

          {project.createdAt && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Created:</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}

          <span className="hidden h-3 w-px bg-zinc-200 sm:inline dark:bg-white/10" />

          <span className="font-mono text-[11px] tracking-wide text-zinc-400 uppercase">#{project.id}</span>
        </div>
      </div>
    </>
  )

  return (
    <Link href={projectUrl || '#'} className={cardClassName}>
      {baseContent}
    </Link>
  )
}
