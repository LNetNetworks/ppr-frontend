'use client'

import { ProjectsTable } from '@/components/projects-table'
import type { Project } from '@/types/api'
import { BarsArrowUpIcon, MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import { useMemo, useState } from 'react'

interface ProjectsWithSearchProps {
  projects: Project[]
  isLoading?: boolean
  emptyMessage?: string
}

type SortOption = 'name' | 'status' | 'createdAt' | 'organizationId'

export function ProjectsWithSearch({
  projects,
  isLoading = false,
  emptyMessage = 'No projects found',
}: ProjectsWithSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('createdAt')
  const [sortAscending, setSortAscending] = useState(false)

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = projects.filter((project) => {
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
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number | undefined
      let bValue: string | number | undefined

      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'status':
          aValue = a.status?.toLowerCase() || ''
          bValue = b.status?.toLowerCase() || ''
          break
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          break
        case 'organizationId':
          aValue = a.organizationId?.toLowerCase() || ''
          bValue = b.organizationId?.toLowerCase() || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortAscending ? -1 : 1
      if (aValue > bValue) return sortAscending ? 1 : -1
      return 0
    })

    return sorted
  }, [projects, searchQuery, sortBy, sortAscending])

  const handleSortClick = () => {
    // Cycle through sort options: name -> status -> createdAt -> organizationId -> name
    const sortOptions: SortOption[] = ['name', 'status', 'createdAt', 'organizationId']
    const currentIndex = sortOptions.indexOf(sortBy)
    const nextIndex = (currentIndex + 1) % sortOptions.length
    setSortBy(sortOptions[nextIndex])
    setSortAscending(true)
  }

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name':
        return 'Name'
      case 'status':
        return 'Status'
      case 'createdAt':
        return 'Date'
      case 'organizationId':
        return 'Organization'
      default:
        return 'Sort'
    }
  }

  return (
    <div className="space-y-4">
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
              className="col-start-1 row-start-1 block w-full rounded-l-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-900 outline-1 -outline-offset-1 outline-zinc-300 placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 sm:pl-9 sm:text-sm/6 dark:bg-zinc-800/50 dark:text-white dark:outline-zinc-700 dark:placeholder:text-zinc-500 dark:focus:outline-blue-500"
            />
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-zinc-400 sm:size-4"
            />
          </div>
          <button
            type="button"
            onClick={handleSortClick}
            className="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-1 -outline-offset-1 outline-zinc-300 hover:bg-zinc-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 dark:bg-white/10 dark:text-white dark:outline-zinc-700 dark:hover:bg-white/20 dark:focus:outline-blue-500"
          >
            <BarsArrowUpIcon aria-hidden="true" className="-ml-0.5 size-4 text-zinc-400" />
            {getSortLabel()}
          </button>
        </div>
      </div>
      <ProjectsTable
        projects={filteredAndSortedProjects}
        isLoading={isLoading}
        emptyMessage={searchQuery ? `No projects found matching "${searchQuery}"` : emptyMessage}
      />
    </div>
  )
}
