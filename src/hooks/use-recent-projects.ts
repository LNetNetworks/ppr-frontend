'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Project } from '@/types/api'

const STORAGE_KEY_PREFIX = 'recent_projects_'

interface RecentProject extends Project {
  lastOpened: number // timestamp
}

function getProjectId(project: Partial<Project>): string {
  const rawId = project.id ?? (project as any).id_project
  return typeof rawId === 'string' ? rawId.trim() : ''
}

function normalizeProject(project: Partial<Project>): Project | null {
  const id = getProjectId(project)
  if (!id) return null

  const rawName = project.name ?? (project as any).name_project
  const name = typeof rawName === 'string' && rawName.trim() ? rawName : 'Unnamed Project'

  return {
    ...project,
    id,
    name,
  } as Project
}

function normalizeRecentProject(project: Partial<RecentProject>): RecentProject | null {
  const normalizedProject = normalizeProject(project)
  if (!normalizedProject) return null

  return {
    ...normalizedProject,
    lastOpened: typeof project.lastOpened === 'number' ? project.lastOpened : Date.now(),
  }
}

function toRecentProjectsState(projects: RecentProject[], limit: number): Project[] {
  return projects
    .sort((a, b) => b.lastOpened - a.lastOpened)
    .slice(0, limit)
    .map(({ lastOpened, ...project }) => project)
}

/**
 * Hook to manage recent projects in localStorage
 * Tracks the last 3 projects opened by the user for each role
 */
export function useRecentProjects(role: string, limit: number = 3) {
  const storageKey = `${STORAGE_KEY_PREFIX}${role}`

  const [recentProjects, setRecentProjects] = useState<Project[]>([])

  // Load recent projects from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (!Array.isArray(parsed)) return

        const normalizedProjects = parsed
          .map((project) => normalizeRecentProject(project))
          .filter((project): project is RecentProject => project !== null)

        const recentProjectsState = toRecentProjectsState(normalizedProjects, limit)
        setRecentProjects(recentProjectsState)

        // Keep storage normalized so sidebars can rely on stable `id`
        localStorage.setItem(
          storageKey,
          JSON.stringify(normalizedProjects.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, limit))
        )
      }
    } catch (error) {
      console.error('Error loading recent projects:', error)
    }
  }, [storageKey, limit])

  /**
   * Add or update a project in recent projects
   * Memoized to prevent infinite loops in useEffect dependencies
   */
  const addRecentProject = useCallback((project: Project) => {
    if (typeof window === 'undefined') return

    try {
      const normalizedIncomingProject = normalizeProject(project)
      if (!normalizedIncomingProject) return

      const stored = localStorage.getItem(storageKey)
      const parsed = stored ? JSON.parse(stored) : []
      let projects: RecentProject[] = Array.isArray(parsed)
        ? parsed
            .map((storedProject) => normalizeRecentProject(storedProject))
            .filter((storedProject): storedProject is RecentProject => storedProject !== null)
        : []

      // Remove if already exists
      projects = projects.filter((p) => p.id !== normalizedIncomingProject.id)

      // Add to beginning with current timestamp
      projects.unshift({
        ...normalizedIncomingProject,
        lastOpened: Date.now(),
      })

      // Keep only the last 3 projects
      projects = projects.sort((a, b) => b.lastOpened - a.lastOpened).slice(0, limit)

      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(projects))

      // Update state - remove timestamp before setting
      setRecentProjects(toRecentProjectsState(projects, limit))
    } catch (error) {
      console.error('Error saving recent project:', error)
    }
  }, [storageKey, limit])

  /**
   * Clear all recent projects for this role
   */
  const clearRecentProjects = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(storageKey)
      setRecentProjects([])
    } catch (error) {
      console.error('Error clearing recent projects:', error)
    }
  }, [storageKey])

  return {
    recentProjects,
    addRecentProject,
    clearRecentProjects,
  }
}
