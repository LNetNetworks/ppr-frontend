// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBranding } from './use-branding'

const {
  useAuthMock,
  originalSidebarLogo,
  originalShowImportEvidence,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  originalSidebarLogo: process.env.NEXT_PUBLIC_SIDEBAR_LOGO,
  originalShowImportEvidence: process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE,
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: useAuthMock,
}))

describe('useBranding', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SIDEBAR_LOGO = '/logos/acme.png'
    process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE = 'true'
    useAuthMock.mockReturnValue({
      azp: 'frontend-client',
      isLoading: false,
    })
  })

  it('returns branding values from environment', () => {
    const { result } = renderHook(() => useBranding())

    expect(result.current).toEqual({
      azp: 'frontend-client',
      isLoading: false,
      sidebarLogo: '/logos/acme.png',
      showImportEvidence: true,
    })
  })

  it('parses show import evidence when set to false', () => {
    process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE = 'false'

    const { result } = renderHook(() => useBranding())

    expect(result.current.showImportEvidence).toBe(false)
  })

  it('throws for invalid show import evidence values', () => {
    process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE = 'maybe'

    expect(() => renderHook(() => useBranding())).toThrow(
      'Invalid boolean value for NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE'
    )
  })
})

afterEach(() => {
  if (originalSidebarLogo === undefined) {
    delete process.env.NEXT_PUBLIC_SIDEBAR_LOGO
  } else {
    process.env.NEXT_PUBLIC_SIDEBAR_LOGO = originalSidebarLogo
  }

  if (originalShowImportEvidence === undefined) {
    delete process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE
  } else {
    process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE = originalShowImportEvidence
  }
})
