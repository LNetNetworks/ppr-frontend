// @vitest-environment jsdom

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleProtectedRoute } from './role-protected-route'

const { useAuthMock, useRouterMock, protectedRouteMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  protectedRouteMock: vi.fn(({ children }: any) => children),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
}))

vi.mock('./protected-route', () => ({
  ProtectedRoute: protectedRouteMock,
}))

describe('RoleProtectedRoute', () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({
      push: vi.fn(),
    })
  })

  it('shows a loading state while role validation is pending', () => {
    useAuthMock.mockReturnValue({
      hasRole: vi.fn(),
      isLoading: true,
      isAuthenticated: false,
    })

    render(
      <RoleProtectedRoute requiredRole="provider">
        <span>Protected content</span>
      </RoleProtectedRoute>
    )

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('renders children when the authenticated user has the required role', () => {
    useAuthMock.mockReturnValue({
      hasRole: (role: string) => role === 'provider',
      isLoading: false,
      isAuthenticated: true,
    })

    render(
      <RoleProtectedRoute requiredRole="provider">
        <span>Protected content</span>
      </RoleProtectedRoute>
    )

    expect(screen.getByText('Protected content')).toBeTruthy()
  })

  it('redirects authenticated users without the required role', async () => {
    const push = vi.fn()
    useRouterMock.mockReturnValue({ push })
    useAuthMock.mockReturnValue({
      hasRole: () => false,
      isLoading: false,
      isAuthenticated: true,
    })

    const { container } = render(
      <RoleProtectedRoute requiredRole="provider" redirectTo="/unauthorized">
        <span>Protected content</span>
      </RoleProtectedRoute>
    )

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/unauthorized')
    })

    expect(container.textContent).toBe('')
  })
})
