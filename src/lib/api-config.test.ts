import { afterEach, describe, expect, it, vi } from 'vitest'
import { getClientApiBaseUrl, getServerApiBaseUrl } from './api-config'

const originalApiUrl = process.env.API_URL
const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL

function restoreEnv(key: 'API_URL' | 'NEXT_PUBLIC_API_URL', value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

afterEach(() => {
  vi.unstubAllGlobals()
  restoreEnv('API_URL', originalApiUrl)
  restoreEnv('NEXT_PUBLIC_API_URL', originalNextPublicApiUrl)
})

describe('getClientApiBaseUrl', () => {
  it('prefers runtime env.js values over build-time public env values', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://build.example.com'
    vi.stubGlobal('window', {
      __ENV: {
        API_URL: 'https://runtime.example.com',
      },
    })

    expect(getClientApiBaseUrl()).toBe('https://runtime.example.com')
  })

  it('falls back to NEXT_PUBLIC_API_URL when runtime env is missing', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://build.example.com'
    vi.stubGlobal('window', {})

    expect(getClientApiBaseUrl()).toBe('https://build.example.com')
  })

  it('returns an empty string when no client env is configured', () => {
    delete process.env.NEXT_PUBLIC_API_URL

    expect(getClientApiBaseUrl()).toBe('')
  })
})

describe('getServerApiBaseUrl', () => {
  it('prefers API_URL on the server', () => {
    process.env.API_URL = 'https://internal.example.com'
    process.env.NEXT_PUBLIC_API_URL = 'https://public.example.com'

    expect(getServerApiBaseUrl()).toBe('https://internal.example.com')
  })

  it('falls back to NEXT_PUBLIC_API_URL when API_URL is missing', () => {
    delete process.env.API_URL
    process.env.NEXT_PUBLIC_API_URL = 'https://public.example.com'

    expect(getServerApiBaseUrl()).toBe('https://public.example.com')
  })

  it('returns an empty string when executed in the browser', () => {
    process.env.API_URL = 'https://internal.example.com'
    vi.stubGlobal('window', {})

    expect(getServerApiBaseUrl()).toBe('')
  })
})
