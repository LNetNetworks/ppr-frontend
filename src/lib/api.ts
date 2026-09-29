import 'server-only'
import { getServerApiBaseUrl } from './api-config'
import { config } from './config'
import { buildBackendApiError, buildNetworkApiError } from './backend-errors'

/**
 * Server-side API client
 * Use this in server components and server actions
 */
export class ServerApiClient {
  private baseUrl: string
  private token?: string

  constructor(token?: string) {
    this.baseUrl = getServerApiBaseUrl()
    console.log('[ServerApiClient] env', {
      API_URL: config.server('API_URL'),
      NEXT_PUBLIC_API_URL: config.build.apiUrl,
      resolvedBaseUrl: this.baseUrl,
    })
    if (!this.baseUrl) {
      throw new Error('Missing API_URL for server runtime')
    }
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, '')
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${cleanBaseUrl}${cleanEndpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Authentication is optional for now but ready to be implemented
    // When authentication is required, this will always include the token
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    let response: Response
    try {
      response = await fetch(url, {
        ...options,
        headers,
        cache: options.cache ?? 'no-store',
        next: {
          revalidate: 0,
          ...(options as { next?: { revalidate?: number } }).next,
        },
      })
    } catch (error) {
      throw buildNetworkApiError(error)
    }

    if (!response.ok) {
      throw await buildBackendApiError(response)
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    })
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    })
  }
}
