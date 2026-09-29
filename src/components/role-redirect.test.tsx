// @vitest-environment jsdom

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleRedirect } from './role-redirect'

const { useAuthMock, useRouterMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: useAuthMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
}))

describe('RoleRedirect', () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({
      replace: vi.fn(),
    })
  })

  it('shows a loading state while auth is loading', () => {
    useAuthMock.mockReturnValue({
      hasRole: vi.fn(),
      isLoading: true,
      isAuthenticated: false,
    })

    render(<RoleRedirect />)

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('redirects to the highest-priority matching role', async () => {
    const replace = vi.fn()
    useRouterMock.mockReturnValue({ replace })
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      hasRole: (role: string) => role === 'user' || role === 'provider',
    })

    render(<RoleRedirect />)

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/user')
    })
  })

  it('does not redirect when the user is not authenticated', async () => {
    const replace = vi.fn()
    useRouterMock.mockReturnValue({ replace })
    useAuthMock.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      hasRole: vi.fn(),
    })

    render(<RoleRedirect />)

    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled()
    })
  })
})
