import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ServerApiClient } from './api'

const originalApiUrl = process.env.API_URL
const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL

function createResponse({
  ok = true,
  status = 200,
  statusText = 'OK',
  contentType = 'application/json',
  jsonData,
  textData = '',
  jsonImplementation,
}: {
  ok?: boolean
  status?: number
  statusText?: string
  contentType?: string
  jsonData?: unknown
  textData?: string
  jsonImplementation?: () => Promise<unknown>
} = {}) {
  const response = {
    ok,
    status,
    statusText,
    headers: {
      get: vi.fn().mockImplementation((name: string) => {
        return name.toLowerCase() === 'content-type' ? contentType : null
      }),
    },
    json: jsonImplementation ?? vi.fn().mockResolvedValue(jsonData),
    text: vi.fn().mockResolvedValue(textData),
  } as unknown as Response & { clone: () => Response }

  response.clone = vi.fn().mockReturnValue(response)

  return response as unknown as Response
}

describe('ServerApiClient', () => {
  beforeEach(() => {
    process.env.API_URL = 'https://server.example.com'
    process.env.NEXT_PUBLIC_API_URL = 'https://public.example.com'
    vi.stubGlobal('fetch', vi.fn())
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()

    if (originalApiUrl === undefined) {
      delete process.env.API_URL
    } else {
      process.env.API_URL = originalApiUrl
    }

    if (originalNextPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl
    }
  })

  it('throws immediately when no server API base URL is configured', () => {
    delete process.env.API_URL
    delete process.env.NEXT_PUBLIC_API_URL

    expect(() => new ServerApiClient()).toThrow('Missing API_URL for server runtime')
  })

  it('sends requests with no-store caching and merges next options', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(createResponse({ jsonData: { ok: true } }))

    const client = new ServerApiClient('server-token')
    const result = await client.get<{ ok: boolean }>('/projects', {
      next: { tags: ['projects'] } as any,
    })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://server.example.com/projects',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        next: {
          revalidate: 0,
          tags: ['projects'],
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer server-token',
        },
      })
    )
  })

  it('formats HTTP errors as status and message when the error response is not JSON', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      createResponse({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        jsonImplementation: vi.fn().mockRejectedValue(new Error('invalid json')),
      })
    )

    const client = new ServerApiClient()

    await expect(client.delete('/projects/1')).rejects.toMatchObject({
      message: '503 | HTTP 503: Service Unavailable',
      code: '503',
      backendMessage: 'HTTP 503: Service Unavailable',
      status: 503,
    })
  })

  it('returns plain text responses when content-type is not JSON', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      createResponse({
        contentType: 'text/plain',
        textData: 'accepted',
      })
    )

    const client = new ServerApiClient()
    const result = await client.post<string>('/sync')

    expect(result).toBe('accepted')
  })
})
