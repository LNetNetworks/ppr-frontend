'use client'

import { Link } from '@/components/link'
import { useAuth } from '@/hooks/use-auth'
import type { Project } from '@/types/api'
import { usePathname } from 'next/navigation'
import { ProjectCard } from './project-card'

interface GridProjectsProps {
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
 * Reusable Projects Grid Component
 * Displays a list of projects in a grid/card format
 */
export function GridProjects({
  projects,
  isLoading = false,
  emptyMessage = 'No projects found',
  title,
  description,
  buttonText,
  buttonHref,
  onButtonClick,
}: GridProjectsProps) {
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

  const renderGrid = () => {
    if (isLoading) {
      return (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <div className="animate-pulse space-y-4">
                <div className="space-y-2">
                  <div className="h-5 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-1/2 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="h-4 w-full rounded-md bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-4 w-5/6 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-white/10">
                  <div className="h-3 w-2/3 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-1/2 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (projects.length === 0) {
      return (
        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} rolePrefix={rolePrefix} variant="div" />
        ))}
      </div>
    )
  }

  // If title or buttonText is provided, wrap in container with header
  if (title || buttonText) {
    return (
      <>
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            {title && <h1 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h1>}
            {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
          </div>
          {buttonText && (
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
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
        {renderGrid()}
      </>
    )
  }

  // Otherwise, return grid without header wrapper
  return renderGrid()
}
