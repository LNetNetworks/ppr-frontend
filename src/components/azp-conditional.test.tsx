// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AzpConditional } from './azp-conditional'

// The expected azp is the Keycloak client id, resolved at runtime from
// window.__ENV, so the runtime config has to be in place for these cases.
const EXPECTED_CLIENT_ID = 'ppr-api-client'

beforeEach(() => {
  window.__ENV = { KEYCLOAK_CLIENT_ID: EXPECTED_CLIENT_ID }
})

afterEach(() => {
  delete window.__ENV
})

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: useAuthMock,
}))

describe('AzpConditional', () => {
  it('renders the loading fallback while auth is loading', () => {
    useAuthMock.mockReturnValue({
      azp: undefined,
      isLoading: true,
    })

    render(
      <AzpConditional
        renderA={<span>Option A</span>}
        renderB={<span>Option B</span>}
        loadingFallback={<span>Loading branding</span>}
      />
    )

    expect(screen.getByText('Loading branding')).toBeTruthy()
  })

  it('renders A when azp does not match the expected client', () => {
    useAuthMock.mockReturnValue({
      azp: 'partner-client',
      isLoading: false,
    })

    render(
      <AzpConditional
        renderA={<span>Option A</span>}
        renderB={<span>Option B</span>}
      />
    )

    expect(screen.getByText('Option A')).toBeTruthy()
  })

  it('renders B when azp matches the expected client', () => {
    useAuthMock.mockReturnValue({
      azp: EXPECTED_CLIENT_ID,
      isLoading: false,
    })

    render(
      <AzpConditional
        renderA={<span>Option A</span>}
        renderB={<span>Option B</span>}
      />
    )

    expect(screen.getByText('Option B')).toBeTruthy()
  })
})
