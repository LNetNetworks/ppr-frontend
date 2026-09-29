'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useRecentProjects } from '@/hooks/use-recent-projects'
import type { Project } from '@/types/api'

interface TrackProjectViewProps {
  project: Project
  role: string
}

/**
 * Client component that tracks when a project is viewed
 * and adds it to the recent projects list in localStorage
 */
export function TrackProjectView({ project, role }: TrackProjectViewProps) {
  const { addRecentProject } = useRecentProjects(role, 3)
  const pathname = usePathname()

  useEffect(() => {
    // Only track if we're on a project detail page
    if (pathname?.includes('/projects/') && project) {
      addRecentProject(project)
    }
  }, [project, pathname, addRecentProject])

  return null // This component doesn't render anything
}

