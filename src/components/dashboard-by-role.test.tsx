// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardByRole } from './dashboard-by-role'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('./dashboards/dashboard-content-user', () => ({
  DashboardContent: ({ projects, isLoading }: any) => `user-dashboard:${projects.length}:${String(isLoading)}`,
}))

vi.mock('./dashboards/dashboard-content-verifier', () => ({
  DashboardContent: ({ projects, isLoading }: any) => `verifier-dashboard:${projects.length}:${String(isLoading)}`,
}))

vi.mock('./dashboards/dashboard-content-sponsor', () => ({
  DashboardContent: ({ projects, isLoading }: any) => `sponsor-dashboard:${projects.length}:${String(isLoading)}`,
}))

vi.mock('./dashboards/dashboard-content-provider', () => ({
  DashboardContent: ({ projects, isLoading }: any) => `provider-dashboard:${projects.length}:${String(isLoading)}`,
}))

describe('DashboardByRole', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      hasRole: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
    })
  })

  it('shows a loading state while authentication is unresolved', () => {
    useAuthMock.mockReturnValue({
      hasRole: vi.fn(),
      isLoading: true,
      isAuthenticated: false,
    })

    render(<DashboardByRole projects={[]} />)

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('uses the highest-priority matching dashboard', () => {
    useAuthMock.mockReturnValue({
      hasRole: (role: string) => role === 'user' || role === 'provider',
      isLoading: false,
      isAuthenticated: true,
    })

    render(<DashboardByRole projects={[{ id: 'project-1', name: 'Project 1' } as any]} />)

    expect(screen.getByText('user-dashboard:1:false')).toBeTruthy()
  })

  it('shows an explicit message when the user has no recognized role', () => {
    useAuthMock.mockReturnValue({
      hasRole: () => false,
      isLoading: false,
      isAuthenticated: true,
    })

    render(<DashboardByRole projects={[]} />)

    expect(screen.getByText('No role assigned. Please contact your administrator.')).toBeTruthy()
  })
})
