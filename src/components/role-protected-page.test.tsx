// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleProtectedPage } from './role-protected-page'

const { roleProtectedRouteMock } = vi.hoisted(() => ({
  roleProtectedRouteMock: vi.fn(({ children }: any) => children),
}))

vi.mock('./role-protected-route', () => ({
  RoleProtectedRoute: roleProtectedRouteMock,
}))

vi.mock('./dashboards/dashboard-content-user', () => ({
  DashboardContent: () => 'user-dashboard',
}))

vi.mock('./dashboards/dashboard-content-verifier', () => ({
  DashboardContent: () => 'verifier-dashboard',
}))

vi.mock('./dashboards/dashboard-content-sponsor', () => ({
  DashboardContent: () => 'sponsor-dashboard',
}))

vi.mock('./dashboards/dashboard-content-provider', () => ({
  DashboardContent: () => 'provider-dashboard',
}))

describe('RoleProtectedPage', () => {
  beforeEach(() => {
    roleProtectedRouteMock.mockClear()
  })

  it('wraps the selected dashboard in the role guard', () => {
    render(
      <RoleProtectedPage
        requiredRole="sponsor"
        projects={[{ id: 'project-1', name: 'Project 1' } as any]}
      />
    )

    expect(screen.getByText('sponsor-dashboard')).toBeTruthy()
    expect(roleProtectedRouteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requiredRole: 'sponsor',
      }),
      undefined
    )
  })

  it('falls back to the user dashboard for unknown roles', () => {
    render(<RoleProtectedPage requiredRole="unknown" projects={[]} isLoading />)

    expect(screen.getByText('user-dashboard')).toBeTruthy()
  })
})
