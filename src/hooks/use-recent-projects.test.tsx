// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecentProjects } from './use-recent-projects'

describe('useRecentProjects', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-13T12:00:00Z'))
  })

  afterEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('loads normalized recent projects from localStorage and keeps storage consistent', async () => {
    localStorage.setItem(
      'recent_projects_provider',
      JSON.stringify([
        { id_project: ' project-2 ', name_project: 'Second project', lastOpened: 200 },
        { id_project: '', name_project: 'Invalid project', lastOpened: 300 },
        { id: 'project-1', name: 'First project', lastOpened: 100 },
      ])
    )

    const { result } = renderHook(() => useRecentProjects('provider', 2))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.recentProjects).toMatchObject([
      { id: 'project-2', name: 'Second project' },
      { id: 'project-1', name: 'First project' },
    ])

    expect(JSON.parse(localStorage.getItem('recent_projects_provider') || '[]')).toMatchObject([
      { id: 'project-2', name: 'Second project', lastOpened: 200 },
      { id: 'project-1', name: 'First project', lastOpened: 100 },
    ])
  })

  it('adds, deduplicates and trims recent projects by recency', () => {
    const { result } = renderHook(() => useRecentProjects('user', 2))

    act(() => {
      result.current.addRecentProject({ id: 'project-1', name: 'First project' } as any)
    })

    vi.setSystemTime(new Date('2026-03-13T12:01:00Z'))
    act(() => {
      result.current.addRecentProject({ id: 'project-2', name: 'Second project' } as any)
    })

    vi.setSystemTime(new Date('2026-03-13T12:02:00Z'))
    act(() => {
      result.current.addRecentProject({ id: 'project-1', name: 'First project updated' } as any)
    })

    vi.setSystemTime(new Date('2026-03-13T12:03:00Z'))
    act(() => {
      result.current.addRecentProject({ id: 'project-3', name: 'Third project' } as any)
    })

    expect(result.current.recentProjects).toEqual([
      { id: 'project-3', name: 'Third project' },
      { id: 'project-1', name: 'First project updated' },
    ])
    expect(JSON.parse(localStorage.getItem('recent_projects_user') || '[]')).toEqual([
      { id: 'project-3', name: 'Third project', lastOpened: Date.now() },
      { id: 'project-1', name: 'First project updated', lastOpened: new Date('2026-03-13T12:02:00Z').getTime() },
    ])
  })

  it('clears recent projects for the active role', () => {
    const { result } = renderHook(() => useRecentProjects('sponsor'))

    act(() => {
      result.current.addRecentProject({ id: 'project-1', name: 'First project' } as any)
    })

    expect(result.current.recentProjects).toHaveLength(1)

    act(() => {
      result.current.clearRecentProjects()
    })

    expect(result.current.recentProjects).toEqual([])
    expect(localStorage.getItem('recent_projects_sponsor')).toBeNull()
  })
})
