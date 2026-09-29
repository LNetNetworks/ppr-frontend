import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from './api-client'

const originalNextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL

function createResponse({
  ok = true,
  status = 200,
  statusText = 'OK',
  contentType = 'application/json',
  jsonData,
  textData = '',
}: {
  ok?: boolean
  status?: number
  statusText?: string
  contentType?: string
  jsonData?: unknown
  textData?: string
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
    json: vi.fn().mockResolvedValue(jsonData),
    text: vi.fn().mockResolvedValue(textData),
  } as unknown as Response & { clone: () => Response }

  response.clone = vi.fn().mockReturnValue(response)

  return response as unknown as Response
}

describe('ApiClient', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://client.example.com'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    if (originalNextPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalNextPublicApiUrl
    }
  })

  it('sends GET requests with the authorization header and parses JSON responses', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(createResponse({ jsonData: { data: ['project-1'] } }))

    const client = new ApiClient(() => 'token-123')
    const result = await client.get<{ data: string[] }>('/projects')

    expect(result).toEqual({ data: ['project-1'] })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://client.example.com/projects',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
      })
    )
  })

  it('stringifies request bodies and returns plain text when the response is not JSON', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      createResponse({
        contentType: 'text/plain',
        textData: 'created',
      })
    )

    const client = new ApiClient(() => undefined)
    const result = await client.post<string>('/projects', { name: 'Demo' })

    expect(result).toBe('created')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://client.example.com/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Demo' }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
  })

  it('formats backend JSON errors as status and message', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(
      createResponse({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        jsonData: { message: 'Validation failed', code: '422', statusCode: 422 },
      })
    )

    const client = new ApiClient(() => 'token-123')

    await expect(client.patch('/projects/1', { status: 'archived' })).rejects.toMatchObject({
      message: '422 | Validation failed',
      code: '422',
      backendMessage: 'Validation failed',
      status: 422,
    })
  })

  it('uploads form data without forcing a JSON content type', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue(createResponse({ jsonData: { ok: true } }))

    const client = new ApiClient(() => 'upload-token')
    const formData = new FormData()
    formData.set('file', new Blob(['content']), 'proof.txt')

    const result = await client.upload<{ ok: boolean }>('/evidences', formData)
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(result).toEqual({ ok: true })
    expect(requestOptions.headers).toEqual({
      Authorization: 'Bearer upload-token',
    })
    expect(requestOptions.body).toBe(formData)
  })

  it('maps network failures to a friendly error message', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const client = new ApiClient(() => 'token-123')

    await expect(client.get('/projects')).rejects.toMatchObject({
      message: 'No pudimos conectarnos al servidor. Verifica tu conexion e intenta nuevamente.',
      code: 'NETWORK_ERROR',
    })
  })
})
