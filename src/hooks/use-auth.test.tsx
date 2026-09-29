// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './use-auth'

const { useKeycloakMock } = vi.hoisted(() => ({
  useKeycloakMock: vi.fn(),
}))

vi.mock('@react-keycloak/web', () => ({
  useKeycloak: useKeycloakMock,
}))

vi.mock('@/lib/keycloak', () => ({
  keycloakConfig: {
    clientId: 'frontend-client',
  },
}))

function createKeycloak(overrides: Record<string, unknown> = {}) {
  return {
    authenticated: true,
    token: 'jwt-token',
    tokenParsed: {
      azp: 'frontend-client',
      name: 'Alice',
      email: 'alice@example.com',
      preferred_username: 'alice',
      sub: 'user-1',
      resource_access: {
        'frontend-client': {
          roles: ['verifier', 'sponsor'],
        },
      },
    },
    idTokenParsed: {
      sid: 'session-1',
    },
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    useKeycloakMock.mockReturnValue({
      keycloak: createKeycloak(),
      initialized: true,
    })
  })

  it('exposes authentication state, roles and helper methods', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.token).toBe('jwt-token')
    expect(result.current.azp).toBe('frontend-client')
    expect(result.current.roles).toEqual(['verifier', 'sponsor'])
    expect(result.current.hasRole('verifier')).toBe(true)
    expect(result.current.hasAnyRole(['provider', 'sponsor'])).toBe(true)
    expect(result.current.userInfo).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
      preferredUsername: 'alice',
      sub: 'user-1',
    })
    expect(result.current.getAuthorizationHeader()).toBe('Bearer jwt-token')
  })

  it('delegates login and logout with sensible redirect defaults', () => {
    const keycloak = createKeycloak()
    useKeycloakMock.mockReturnValue({
      keycloak,
      initialized: true,
    })

    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.login()
    })

    expect(keycloak.login).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    })

    act(() => {
      result.current.logout({ redirectUri: 'https://app.example.com/logout' })
    })

    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: 'https://app.example.com/logout',
    })
  })

  it('handles missing token data safely while still reporting loading state', () => {
    useKeycloakMock.mockReturnValue({
      keycloak: createKeycloak({
        authenticated: false,
        token: undefined,
        tokenParsed: undefined,
        idTokenParsed: undefined,
      }),
      initialized: false,
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(true)
    expect(result.current.roles).toEqual([])
    expect(result.current.userInfo).toBeUndefined()
    expect(result.current.getAuthorizationHeader()).toBeUndefined()
  })
})
