import { afterEach, describe, expect, it, vi } from 'vitest'
import { createKeycloakClient, keycloakConfig, keycloakInitOptions } from './keycloak'

const { keycloakCtor, keycloakInstance } = vi.hoisted(() => ({
  keycloakCtor: vi.fn(),
  keycloakInstance: { instance: true },
}))

vi.mock('keycloak-js', () => ({
  default: class MockKeycloak {
    constructor(config: unknown) {
      keycloakCtor(config)
      return keycloakInstance
    }
  },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('keycloakConfig', () => {
  it('returns empty values when runtime env is unavailable', () => {
    expect(keycloakConfig.url).toBe('')
    expect(keycloakConfig.realm).toBe('')
    expect(keycloakConfig.clientId).toBe('')
  })

  it('reads Keycloak settings from runtime env.js in the browser', () => {
    vi.stubGlobal('window', {
      __ENV: {
        KEYCLOAK_URL: 'https://auth.example.com',
        KEYCLOAK_REALM: 'ppr',
        KEYCLOAK_CLIENT_ID: 'frontend-client',
      },
    })

    expect(keycloakConfig.url).toBe('https://auth.example.com')
    expect(keycloakConfig.realm).toBe('ppr')
    expect(keycloakConfig.clientId).toBe('frontend-client')
  })
})

describe('createKeycloakClient', () => {
  it('constructs the client with the resolved runtime configuration', () => {
    vi.stubGlobal('window', {
      __ENV: {
        KEYCLOAK_URL: 'https://auth.example.com',
        KEYCLOAK_REALM: 'ppr',
        KEYCLOAK_CLIENT_ID: 'frontend-client',
      },
    })

    expect(createKeycloakClient()).toBe(keycloakInstance)
    expect(keycloakCtor).toHaveBeenCalledWith({
      url: 'https://auth.example.com',
      realm: 'ppr',
      clientId: 'frontend-client',
    })
  })

  it('exposes the expected init options', () => {
    expect(keycloakInitOptions).toEqual({
      onLoad: 'check-sso',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    })
  })
})
