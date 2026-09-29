import type { ApiError } from '@/types/api'

export enum BackendErrorCode {
  BAD_REQUEST = '400',
  UNAUTHORIZED = '401',
  FORBIDDEN = '403',
  NOT_FOUND = '404',
  CONFLICT = '409',
  VALIDATION = '422',
  TOO_MANY_REQUESTS = '429',
  INTERNAL_SERVER = '500',
  SERVICE_UNAVAILABLE = '503',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

const BACKEND_ERROR_MESSAGES: Record<string, string> = {
  [BackendErrorCode.NETWORK]: 'No pudimos conectarnos al servidor. Verifica tu conexion e intenta nuevamente.',
}

interface ApiErrorPayload {
  message?: unknown
  code?: unknown
  details?: unknown
  error?: unknown
  statusCode?: unknown
}

export class BackendApiError extends Error implements ApiError {
  code?: string
  details?: unknown
  status?: number
  backendMessage?: string

  constructor({
    message,
    code,
    details,
    status,
    backendMessage,
  }: {
    message: string
    code?: string
    details?: unknown
    status?: number
    backendMessage?: string
  }) {
    super(message)
    this.name = 'BackendApiError'
    this.code = code
    this.details = details
    this.status = status
    this.backendMessage = backendMessage
  }
}

function normalizeCode(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined

  const code = String(value).trim()
  if (!code) return undefined

  return code.toUpperCase()
}

function extractPayloadMessage(payload: ApiErrorPayload | undefined): string | undefined {
  if (!payload) return undefined

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }

  return undefined
}

function normalizeStatusCode(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function extractStatusCode(payload: ApiErrorPayload | undefined): number | undefined {
  if (!payload) return undefined
  return normalizeStatusCode(payload.statusCode)
}

function getFallbackHttpMessage(status: number, statusText: string): string {
  const resolvedStatusText = statusText?.trim() || 'Unknown error'
  return `HTTP ${status}: ${resolvedStatusText}`
}

function buildBackendErrorMessage({
  status,
  backendMessage,
}: {
  status: number
  backendMessage?: string
}): string {
  const safeMessage = backendMessage?.trim() || getFallbackHttpMessage(status, '')
  return `${status} | ${safeMessage}`
}

async function parseErrorPayload(response: Response): Promise<ApiErrorPayload | undefined> {
  try {
    const payload = (await response.clone().json()) as unknown
    if (payload && typeof payload === 'object') {
      return payload as ApiErrorPayload
    }
  } catch {
    // No-op. We fall back to a plain HTTP message.
  }

  return undefined
}

export async function buildBackendApiError(response: Response): Promise<BackendApiError> {
  const payload = await parseErrorPayload(response)
  const rawCode = normalizeCode(payload?.code)
  const payloadStatusCode = extractStatusCode(payload)
  const status = payloadStatusCode ?? response.status
  const statusCode = normalizeCode(status)
  const code = rawCode || statusCode || BackendErrorCode.UNKNOWN
  const backendMessage = extractPayloadMessage(payload) || getFallbackHttpMessage(status, response.statusText)
  const message = buildBackendErrorMessage({
    status,
    backendMessage,
  })

  return new BackendApiError({
    message,
    code,
    details: payload?.details ?? payload,
    status,
    backendMessage,
  })
}

export function buildNetworkApiError(error: unknown): BackendApiError {
  return new BackendApiError({
    message: BACKEND_ERROR_MESSAGES[BackendErrorCode.NETWORK],
    code: BackendErrorCode.NETWORK,
    details: error,
  })
}
