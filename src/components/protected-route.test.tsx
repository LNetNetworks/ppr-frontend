// @vitest-environment jsdom

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './protected-route'

const { useKeycloakMock, useRouterMock } = vi.hoisted(() => ({
  useKeycloakMock: vi.fn(),
  useRouterMock: vi.fn(),
}))

vi.mock('@react-keycloak/web', () => ({
  useKeycloak: useKeycloakMock,
}))

vi.mock('next/navigation', () => ({
  useRouter: useRouterMock,
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    })
  })

  it('renders a loading state while Keycloak is initializing', () => {
    useKeycloakMock.mockReturnValue({
      initialized: false,
      keycloak: {
        authenticated: false,
        login: vi.fn(),
      },
    })

    render(<ProtectedRoute><span>Private content</span></ProtectedRoute>)

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('redirects unauthenticated users to login and renders nothing', async () => {
    const login = vi.fn()
    useKeycloakMock.mockReturnValue({
      initialized: true,
      keycloak: {
        authenticated: false,
        login,
      },
    })
    window.history.replaceState({}, '', '/private')

    const { container } = render(<ProtectedRoute><span>Private content</span></ProtectedRoute>)

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        redirectUri: `${window.location.origin}/private`,
      })
    })

    expect(container.textContent).toBe('')
  })

  it('renders protected content for authenticated users', () => {
    useKeycloakMock.mockReturnValue({
      initialized: true,
      keycloak: {
        authenticated: true,
        login: vi.fn(),
      },
    })

    render(<ProtectedRoute><span>Private content</span></ProtectedRoute>)

    expect(screen.getByText('Private content')).toBeTruthy()
  })
})
