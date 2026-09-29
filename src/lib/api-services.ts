'use client'

import { useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { ApiClient } from './api-client'
import { config } from './config'
import { withDefaultPhaseProjectTaskStatus } from './task-payload'
import {
  transformApiOrganization,
  transformApiPhase,
  transformApiProject,
  transformApiTask,
  transformApiUser,
  transformApiContribution,
  transformApiTransaction,
  transformApiAuditRevision,
} from './api-mappers'
import type {
  Project,
  Organization,
  Phase,
  ApiPhase,
  Evidence,
  EnumsResponse,
  UploadEvidenceRequest,
  ApiResponse,
  ApiProject,
  Task,
  ApiTask,
  AvailablePhase,
  AvailablePhasesResponse,
  User,
  Contribution,
  ApiContribution,
  ImportProjectPhaseEvidencesResponse,
  CreateOrganizationPayload,
  CreateUserPayload,
  CreatePhaseProjectPayload,
  CreatePhaseProjectTaskPayload,
  UpdatePhaseProjectTaskPayload,
  CreateAuditRevisionPayload,
  ApiAuditRevision,
  AuditRevision,
  Transaction,
  ApiTransaction,
  AssetToken,
  PhaseCompletionInfo,
} from '@/types/api'

function extractUsersArray(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  }

  if (!input || typeof input !== 'object') {
    return []
  }

  const container = input as Record<string, unknown>
  const directCandidates = [container.data, container.members, container.users, container.items, container.results]

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    }
  }

  for (const candidate of directCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>
      const nestedCandidates = [nested.data, nested.members, nested.users, nested.items, nested.results]

      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) {
          return nestedCandidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        }
      }
    }
  }

  return []
}

function extractAuditRevisionsArray(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  }

  if (!input || typeof input !== 'object') {
    return []
  }

  const container = input as Record<string, unknown>
  const directCandidates = [container.data, container.audits, container.audit_revisions, container.items, container.results]

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    }
  }

  for (const candidate of directCandidates) {
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>
      const nestedCandidates = [nested.data, nested.audits, nested.audit_revisions, nested.items, nested.results]

      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) {
          return nestedCandidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        }
      }
    }
  }

  return []
}

/**
 * Client-side API services
 * Use these hooks in client components
 */

/**
 * Hook to get API client instance with authentication
 * Use this hook to get a configured API client for making requests
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const api = useApiClient()
 *   
 *   const handleFetch = async () => {
 *     const projects = await api.get('/projects')
 *   }
 * }
 * ```
 */
export function useApiClient() {
  const { getAuthorizationHeader } = useAuth()

  return new ApiClient(() => {
    const header = getAuthorizationHeader()
    return header?.replace('Bearer ', '')
  })
}

/**
 * Hook that returns a function to fetch all projects
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const fetchProjects = useFetchProjects()
 *   
 *   useEffect(() => {
 *     fetchProjects().then(setProjects)
 *   }, [])
 * }
 * ```
 */
export function useFetchProjects() {
  const api = useApiClient()
  return async (): Promise<Project[]> => {
    const response = await api.get<ApiResponse<ApiProject[]>>('/projects')

    // Extract data array and transform projects
    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiProject)
    }

    // Fallback: return empty array if response structure is unexpected
    return []
  }
}

/**
 * Hook that returns a function to fetch a single project by ID
 */
export function useFetchProject() {
  const api = useApiClient()
  return async (id: string): Promise<Project> => {
    const response = await api.get<ApiResponse<ApiProject | { project: ApiProject; token_balance?: string }>>(
      `/projects/${id}`
    )

    if (response?.data) {
      return transformApiProject(response.data)
    }

    throw new Error('Project not found')
  }
}

/**
 * Hook that returns a function to create a new project
 * Uses client-side API client which automatically includes auth token
 * 
 * @example
 * ```tsx
 * const createProject = useCreateProject()
 * 
 * const handleCreate = async (data) => {
 *   const project = await createProject({
 *     name_project: 'My Project',
 *     description: 'Description',
 *     // ...other fields
 *   })
 * }
 * ```
 */
export function useCreateProject() {
  const api = useApiClient()
  return async (projectData: {
    name_project: string
    description?: string
    id_organization?: string
    type_project?: string
    type_currency?: string
    date_start?: string
    date_end?: string
    country_region?: string
    status?: string
    total_contributed_amount?: number
    wallet_provider?: string
    asset_token?: string
    [key: string]: unknown
  }): Promise<Project> => {
    const response = await api.post<ApiResponse<ApiProject | { project: ApiProject; token_balance?: string }>>(
      '/projects',
      projectData
    )

    // Extract data and transform project
    if (response && response.data) {
      return transformApiProject(response.data)
    }

    throw new Error('Failed to create project')
  }
}

/**
 * Hook that returns a function to update an existing project
 * Uses client-side API client which automatically includes auth token
 * 
 * @example
 * ```tsx
 * const updateProject = useUpdateProject()
 * 
 * const handleUpdate = async (projectId, data) => {
 *   const project = await updateProject(projectId, {
 *     name_project: 'Updated Name',
 *     // ...other fields
 *   })
 * }
 * ```
 */
export function useUpdateProject() {
  const api = useApiClient()
  return async (
    projectId: string,
    projectData: {
      name_project?: string
      description?: string
      id_organization?: string
      type_project?: string
      type_currency?: string
      date_start?: string
      date_end?: string
      country_region?: string
      status?: string
      total_contributed_amount?: number
      wallet_provider?: string
      asset_token?: string
      [key: string]: unknown
    }
  ): Promise<Project> => {
    const response = await api.put<ApiResponse<ApiProject | { project: ApiProject; token_balance?: string }>>(
      `/projects/${projectId}`,
      projectData
    )

    // Extract data and transform project
    if (response && response.data) {
      return transformApiProject(response.data)
    }

    throw new Error('Failed to update project')
  }
}

/**
 * Hook that returns a function to fetch all organizations
 */
export function useFetchOrganizations() {
  const api = useApiClient()
  return async (): Promise<Organization[]> => {
    const response = await api.get<unknown>('/organizations')

    const extractArray = (input: unknown): Record<string, unknown>[] => {
      if (Array.isArray(input)) {
        return input.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      }

      if (!input || typeof input !== 'object') {
        return []
      }

      const container = input as Record<string, unknown>
      const directCandidates = [container.data, container.organizations, container.items, container.results]

      for (const candidate of directCandidates) {
        if (Array.isArray(candidate)) {
          return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
        }
      }

      if (container.data && typeof container.data === 'object') {
        const nested = container.data as Record<string, unknown>
        const nestedCandidates = [nested.data, nested.organizations, nested.items, nested.results]

        for (const candidate of nestedCandidates) {
          if (Array.isArray(candidate)) {
            return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          }
        }
      }

      return []
    }

    const rawOrganizations = extractArray(response)

    if (!Array.isArray(rawOrganizations)) {
      return []
    }

    return rawOrganizations
      .map(transformApiOrganization)
      .filter((organization): organization is Organization => organization !== null)
  }
}

/**
 * Hook that returns a function to fetch a single organization by ID
 */
export function useFetchOrganization() {
  const api = useApiClient()
  return async (id: string): Promise<Organization> => {
    return api.get<Organization>(`/organizations/${id}`)
  }
}

/**
 * Hook that returns a function to fetch all phases with optional limit
 * 
 * @example
 * ```tsx
 * const fetchStages = useFetchStages()
 * const phases = await fetchStages(10) // limit to 10
 * ```
 */
export function useFetchStages() {
  const api = useApiClient()
  return async (limit?: number): Promise<Phase[]> => {
    const query = limit ? `?limit=${limit}` : ''
    return api.get<Phase[]>(`/phases${query}`)
  }
}

/**
 * Hook that returns a function to fetch phases for a specific project
 */
export function useFetchProjectStages() {
  const api = useApiClient()

  return async (projectId: string): Promise<Phase[]> => {
    const response = await api.get<ApiResponse<ApiPhase[]>>(`/projects/${projectId}/phases`)

    // Extract data array and transform phases
    let phases: Phase[] = []
    if (response && response.data && Array.isArray(response.data)) {
      phases = response.data.map(transformApiPhase)
    }

    // Fetch evidences and link them to phases
    try {
      const evidencesResponse = await api.get<ApiResponse<Evidence[]>>(`/evidences/project/${projectId}`)
      const evidences = evidencesResponse && evidencesResponse.data && Array.isArray(evidencesResponse.data)
        ? evidencesResponse.data
        : []
      if (!config.isProduction()) {
        console.log('[fetchProjectStages][client] evidences response:', {
          projectId,
          count: evidences.length,
          sample: evidences[0],
        })
      }

      // Create a map of evidences by all known phase ID shapes
      const evidencesByPhase = new Map<string, Evidence[]>()

      const normalizeId = (value: unknown): string | null => {
        if (value === null || value === undefined) return null
        const normalized = String(value).trim()
        return normalized.length > 0 ? normalized : null
      }

      const pushEvidenceForKey = (key: unknown, evidence: Evidence) => {
        const normalizedKey = normalizeId(key)
        if (!normalizedKey) return
        if (!evidencesByPhase.has(normalizedKey)) {
          evidencesByPhase.set(normalizedKey, [])
        }
        evidencesByPhase.get(normalizedKey)!.push(evidence)
      }

      const extractPhaseIdFromEvidence = (evidence: Evidence): string | null => {
        const evidenceRecord = evidence as Evidence & Record<string, unknown>
        const rawCandidates: unknown[] = [
          evidence.file_name,
          evidenceRecord.fileName,
          evidence.name,
          evidence.uri,
          evidence.fileUrl,
          evidenceRecord.file_url,
        ]

        for (const candidate of rawCandidates) {
          const normalizedCandidate = normalizeId(candidate)
          if (!normalizedCandidate) continue

          const baseName = normalizedCandidate.split('/').pop() || normalizedCandidate
          const withoutUuid = baseName.replace(
            /-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            ''
          )
          const tokens = withoutUuid.split('-').map((token) => token.trim()).filter(Boolean)
          const phaseToken = tokens.find((token) => /^(pha|pp|phase)_[a-z0-9_]+$/i.test(token))
          if (phaseToken) {
            return phaseToken
          }
        }

        return null
      }

      evidences.forEach((evidence) => {
        const evidenceRecord = evidence as Evidence & Record<string, unknown>
          ;[
            evidence.id_phase_project,
            evidence.phaseId,
            evidenceRecord.id_phase,
            evidenceRecord.phase_id,
            extractPhaseIdFromEvidence(evidence),
          ].forEach((key) => pushEvidenceForKey(key, evidence))
      })

      const parseEvidenceDate = (evidence: Evidence): number => {
        const evidenceRecord = evidence as Evidence & Record<string, unknown>
        const rawDate =
          evidence.uploadedAt ||
          evidence.created_at ||
          (evidenceRecord.updated_at as string | undefined) ||
          (evidenceRecord.date_uploaded as string | undefined)
        if (!rawDate) return 0
        const parsed = Date.parse(String(rawDate))
        return Number.isNaN(parsed) ? 0 : parsed
      }

      const dedupeEvidences = (items: Evidence[]): Evidence[] => {
        const seen = new Set<string>()
        return items.filter((evidence, index) => {
          const evidenceRecord = evidence as Evidence & Record<string, unknown>
          const fallbackId = `${normalizeId(evidence.hash || evidence.tx_hash || evidence.txHash) || 'no-hash'}:${normalizeId(evidence.fileUrl || evidence.uri || evidenceRecord.file_url) || 'no-file'
            }:${normalizeId(evidence.created_at || evidence.uploadedAt || evidenceRecord.updated_at) || String(index)}`

          const identity =
            normalizeId(evidence.id) ||
            normalizeId(evidence.id_evidence) ||
            normalizeId(evidenceRecord.evidence_id) ||
            fallbackId

          if (seen.has(identity)) return false
          seen.add(identity)
          return true
        })
      }

      // Link evidence data to phases
      phases = phases.map((phase) => {
        const phaseRecord = phase as Phase & Record<string, unknown>
        const phaseEvidences = dedupeEvidences(
          [
            phase.idPhaseProject,
            phase.idPhase,
            phase.id,
            phaseRecord.id_phase_project,
            phaseRecord.id_phase,
            phaseRecord.phase_id,
          ].flatMap((key) => {
            const normalizedKey = normalizeId(key)
            return normalizedKey ? evidencesByPhase.get(normalizedKey) || [] : []
          })
        )

        if (phaseEvidences.length > 0) {
          const sortedByDate = [...phaseEvidences].sort((a, b) => parseEvidenceDate(b) - parseEvidenceDate(a))
          const preferredEvidence =
            sortedByDate.find((evidence) => evidence.hash || evidence.tx_hash || evidence.txHash) || sortedByDate[0]
          const preferredRecord = preferredEvidence as Evidence & Record<string, unknown>
          const evidenceHash = preferredEvidence.hash || preferredEvidence.tx_hash || preferredEvidence.txHash

          return {
            ...phase,
            hash: evidenceHash,
            txHash: evidenceHash,
            tx_hash: evidenceHash,
            fileUrl: preferredEvidence.fileUrl || preferredEvidence.uri || preferredRecord.file_url,
            uri: preferredEvidence.uri || preferredEvidence.fileUrl || preferredRecord.file_url,
            // Store all evidences if needed
            evidences: phaseEvidences,
          }
        }
        return phase
      })
    } catch (error) {
      // If fetching evidences fails, continue with phases only
      console.warn('Failed to fetch evidences for phases:', error)
    }

    return phases
  }
}

/**
 * Hook that returns a function to upload evidence
 * 
 * @example
 * ```tsx
 * const uploadEvidence = useUploadEvidence()
 * 
 * const handleUpload = async (file: File) => {
 *   const evidence = await uploadEvidence({
 *     file,
 *     projectId: '123',
 *     name: 'Evidence name'
 *   })
 * }
 * ```
 */
export function useUploadEvidence() {
  const api = useApiClient()
  const { userInfo } = useAuth()

  return async (data: UploadEvidenceRequest): Promise<ApiResponse<Evidence>> => {
    const formData = new FormData()

    if (data.file) {
      formData.append('file', data.file)
    }

    // Use id_project instead of projectId
    if (data.projectId) {
      formData.append('id_project', data.projectId)
    }

    // Prefer explicit phase-project relation ID when available
    if (data.phaseProjectId) {
      formData.append('id_phase_project', data.phaseProjectId)
    }

    // Accept phase template ID as phaseId
    if (data.phaseId) {
      formData.append('id_phase', data.phaseId)
      if (!data.phaseProjectId) {
        formData.append('id_phase_project', data.phaseId)
      }
    }

    // Get user ID from auth context
    const userId = userInfo?.sub
    if (userId) {
      formData.append('id_user', userId)
    } else {
      throw new Error('User ID not found. Please ensure you are authenticated.')
    }

    // Add name if provided
    if (data.name) {
      formData.append('name', data.name)
    }

    // Add description if provided
    if (data.description) {
      formData.append('description', data.description)
    }

    // Add any additional fields (excluding already handled ones)
    Object.keys(data).forEach((key) => {
      if (!['file', 'projectId', 'phaseId', 'phaseProjectId', 'name', 'description'].includes(key)) {
        const value = data[key as keyof UploadEvidenceRequest]
        if (value !== undefined && value !== null) {
          formData.append(key, String(value))
        }
      }
    })

    return api.upload<ApiResponse<Evidence>>('/evidences', formData)
  }
}

/**
 * Hook that returns a function to fetch enums
 */
export function useFetchEnums() {
  const api = useApiClient()
  return async (): Promise<EnumsResponse> => {
    return api.get<EnumsResponse>('/enums')
  }
}

/**
 * Hook that returns a function to fetch evidences for a project
 */
export function useFetchProjectEvidences() {
  const api = useApiClient()
  return async (projectId: string): Promise<Evidence[]> => {
    try {
      const response = await api.get<ApiResponse<Evidence[]>>(`/evidences/project/${projectId}`)

      if (response && response.data && Array.isArray(response.data)) {
        return response.data
      }

      return []
    } catch (error) {
      console.warn('Failed to fetch project evidences:', error)
      return []
    }
  }
}

/**
 * Hook that returns a function to fetch evidences for a project
 */
export function useFetchEvidences() {
  const api = useApiClient()
  return async (projectId: string): Promise<Evidence[]> => {
    if (!projectId) {
      return []
    }

    try {
      const response = await api.get<ApiResponse<Evidence[]>>(`/evidences/project/${projectId}`)

      if (response && response.data && Array.isArray(response.data)) {
        return response.data
      }

      return []
    } catch (error) {
      console.warn(`Failed to fetch evidences for project ${projectId}:`, error)
      return []
    }
  }
}

/**
 * Hook that returns a function to fetch tasks for a specific phase
 */
export function useFetchPhaseTasks() {
  const api = useApiClient()
  return async (phaseId: string): Promise<Task[]> => {
    const response = await api.get<ApiResponse<ApiTask[]>>(`/phases/${phaseId}/tasks`)

    // Extract data array and transform tasks
    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiTask)
    }

    // Fallback: return empty array if response structure is unexpected
    return []
  }
}

/**
 * Hook that returns a function to fetch tasks for a specific project phase
 * Uses the endpoint: /projects/{projectId}/phases/{phaseProjectId}/tasks
 */
export function useFetchProjectPhaseTasks() {
  const api = useApiClient()
  return useCallback(async (projectId: string, phaseProjectId: string): Promise<Task[]> => {
    const response = await api.get<ApiResponse<ApiTask[]>>(`/projects/${projectId}/phases/${phaseProjectId}/tasks`)

    // Log the raw response for debugging
    console.log('Raw API response:', JSON.stringify(response, null, 2))

    // Handle different response structures
    let tasksArray: ApiTask[] = []

    if (!response) {
      console.warn('No response received from API')
      return []
    }

    // Check for standard ApiResponse structure with Success and data
    if (response && typeof response === 'object' && 'data' in response) {
      const data = (response as any).data
      if (Array.isArray(data)) {
        tasksArray = data
        console.log('Found tasks in response.data:', tasksArray.length)
      }
    } else if (Array.isArray(response)) {
      // Direct array response (no wrapper)
      tasksArray = response
      console.log('Response is direct array:', tasksArray.length)
    } else if (response && typeof response === 'object') {
      // Try other possible structures
      console.warn('Unexpected response structure:', Object.keys(response))
      // Maybe the data is at the root level with different property names
      if ('tasks' in response && Array.isArray((response as any).tasks)) {
        tasksArray = (response as any).tasks
      } else if ('items' in response && Array.isArray((response as any).items)) {
        tasksArray = (response as any).items
      }
    }

    if (tasksArray.length === 0) {
      console.warn('No tasks found in response. Response structure:', response)
    }

    // Transform and log transformed tasks
    const transformedTasks = tasksArray.map(transformApiTask)
    console.log('Transformed tasks:', transformedTasks)

    return transformedTasks
  }, [api])
}

// ============================================================================
// User API Services
// ============================================================================

interface ApiUserSearchItem {
  id_user: string
  id_organization?: string
  name: string
  surname?: string
  user_email: string
  active?: boolean
  role?: string
  keycloak_sub?: string
  [key: string]: unknown
}

interface ApiUserSearchResponse {
  Success: boolean
  data: ApiUserSearchItem | ApiUserSearchItem[]
}

export interface UserSearchResult {
  id: string
  id_user?: string
  name: string
  surname?: string
  email: string
  user_email?: string
  role?: string
  [key: string]: unknown
}

/**
 * Hook that returns a function to search users by email
 * 
 * @example
 * ```tsx
 * const searchUsers = useSearchUsersByEmail()
 * 
 * const handleSearch = async (email: string) => {
 *   const users = await searchUsers(email)
 * }
 * ```
 */
export function useSearchUsersByEmail() {
  const api = useApiClient()
  return async (email: string): Promise<UserSearchResult[]> => {
    const response = await api.get<ApiUserSearchResponse>(
      `/users/by-email/${encodeURIComponent(email.trim())}`
    )

    // Parse the API response structure
    let users: UserSearchResult[] = []

    if (!response) {
      return []
    }

    // Helper to map a raw user object to UserSearchResult
    const mapUser = (item: any): UserSearchResult => ({
      id: item.id_user || item.id || '',
      id_user: item.id_user,
      name: item.name || '',
      surname: item.surname,
      email: item.user_email || item.email || '',
      user_email: item.user_email,
      role: item.role || item.type,
    })

    if (response && typeof response === 'object') {
      // Check if it's the expected ApiResponse format with Success and data
      if (response.Success === true && response.data) {
        if (Array.isArray(response.data)) {
          // Backend returns array for partial matches
          users = response.data.map(mapUser)
        } else {
          // Single user object
          users = [mapUser(response.data)]
        }
      } else if ('data' in response && response.data) {
        // Handle case where data exists but Success might be missing
        const data = (response as any).data
        if (Array.isArray(data)) {
          users = data.map(mapUser)
        } else if (data.id_user || data.user_email) {
          users = [mapUser(data)]
        }
      } else if (Array.isArray(response)) {
        // Handle top-level array response
        users = response.map(mapUser)
      } else if ('id_user' in response || 'user_email' in response || 'name' in response) {
        // Handle direct user object (without Success wrapper)
        users = [mapUser(response)]
      }
    }

    return users
  }
}

// ============================================================================
// Project Members API Services
// ============================================================================

/**
 * Hook that returns a function to fetch members (users) for a project
 * 
 * @example
 * ```tsx
 * const fetchProjectMembers = useFetchProjectMembers()
 * 
 * const handleFetch = async (projectId: string) => {
 *   const members = await fetchProjectMembers(projectId)
 * }
 * ```
 */
export function useFetchProjectMembers() {
  const api = useApiClient()
  return async (projectId: string): Promise<User[]> => {
    try {
      const membersResponse = await api.get<unknown>(`/projects/${projectId}/members`)
      const members = extractUsersArray(membersResponse)

      if (members.length > 0) {
        return members.map(transformApiUser)
      }
    } catch (error) {
      console.warn('Failed to fetch project members from /members endpoint:', error)
    }

    try {
      const usersResponse = await api.get<unknown>(`/projects/${projectId}/users`)
      const users = extractUsersArray(usersResponse)

      if (users.length > 0) {
        return users.map(transformApiUser)
      }
    } catch (error) {
      console.warn('Failed to fetch project members from /users endpoint:', error)
    }

    return []
  }
}

/**
 * Hook that returns a function to add members to a project
 * 
 * @example
 * ```tsx
 * const addProjectMember = useAddProjectMember()
 * 
 * const handleAdd = async (projectId: string, userId: string) => {
 *   await addProjectMember(projectId, userId)
 * }
 * ```
 */
export function useAddProjectMember() {
  const api = useApiClient()
  return async (projectId: string, userId: string): Promise<void> => {
    const payload = [
      {
        id_user: userId,
      },
    ]
    await api.post(`/projects/${projectId}/members`, payload)
  }
}

/**
 * Hook that returns a function to fetch available phases
 * 
 * @example
 * ```tsx
 * const fetchAvailablePhases = useFetchAvailablePhases()
 * 
 * const handleFetch = async () => {
 *   const phases = await fetchAvailablePhases()
 * }
 * ```
 */
export function useFetchAvailablePhases() {
  const api = useApiClient()
  return async (): Promise<AvailablePhase[]> => {
    const response = await api.get<AvailablePhasesResponse>('/phases')

    // Extract data array
    if (response && response.Success && response.data && Array.isArray(response.data)) {
      return response.data
    }

    // Fallback: return empty array if response structure is unexpected
    return []
  }
}

/**
 * Interface for paginated tasks response
 */
export interface PaginatedTasksResponse {
  Success?: boolean
  data: Task[]
  total?: number
  limit?: number
  offset?: number
  filters?: {
    limit?: number
    offset?: number
  }
}

/**
 * Hook that returns a function to fetch available tasks with pagination
 * 
 * @example
 * ```tsx
 * const fetchAvailableTasks = useFetchAvailableTasks()
 * 
 * const handleFetch = async (limit: number, offset: number, search?: string) => {
 *   const result = await fetchAvailableTasks(limit, offset, search)
 * }
 * ```
 */
export function useFetchAvailableTasks() {
  const api = useApiClient()
  return async (limit: number = 50, offset: number = 0, search?: string): Promise<PaginatedTasksResponse> => {
    let endpoint = `/tasks?limit=${limit}&offset=${offset}`
    if (search && search.trim()) {
      endpoint += `&search=${encodeURIComponent(search.trim())}`
    }

    const response = await api.get<ApiResponse<ApiTask[]> | PaginatedTasksResponse>(endpoint)

    // Handle different response structures
    if (response && typeof response === 'object') {
      // Check for standard ApiResponse structure
      if ('data' in response && Array.isArray(response.data)) {
        const tasks = response.data.map(transformApiTask)
        return {
          data: tasks,
          total: (response as any).total,
          limit: (response as any).limit || limit,
          offset: (response as any).offset || offset,
        }
      }

      // Check for PaginatedTasksResponse structure
      if ('data' in response && Array.isArray((response as any).data)) {
        return {
          data: (response as any).data.map(transformApiTask),
          total: (response as any).total,
          limit: (response as any).limit || limit,
          offset: (response as any).offset || offset,
        }
      }
    }

    // Fallback: return empty array
    return {
      data: [],
      total: 0,
      limit,
      offset,
    }
  }
}

// ============================================================================
// Contribution API Services
// ============================================================================

/**
 * Hook that returns a function to fetch all contributions
 * 
 * @example
 * ```tsx
 * const fetchContributions = useFetchContributions()
 * 
 * const handleFetch = async () => {
 *   const contributions = await fetchContributions()
 * }
 * ```
 */
export function useFetchContributions() {
  const api = useApiClient()
  return async (): Promise<Contribution[]> => {
    const response = await api.get<ApiResponse<ApiContribution[]>>('/contributions')

    // Extract data array and transform contributions
    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiContribution)
    }

    // Fallback: return empty array if response structure is unexpected
    return []
  }
}

/**
 * Hook that returns a function to create a contribution
 * 
 * @example
 * ```tsx
 * const createContribution = useCreateContribution()
 * 
 * const handleCreate = async () => {
 *   await createContribution({
 *     id_project: 'prj_001',
 *     id_user: 'usr_001',
 *     deposit_amount: 120000,
 *     id_phase_project: 'pp_0001',
 *     date_contribution: '2026-01-01'
 *   })
 * }
 * ```
 */
export function useCreateContribution() {
  const api = useApiClient()
  return async (data: {
    id_project: string
    id_user: string
    deposit_amount: number
    id_phase_project: string
    date_contribution: string
  }): Promise<ApiResponse<ApiContribution>> => {
    return api.post<ApiResponse<ApiContribution>>('/contributions', data)
  }
}

/**
 * Hook that returns a function to create an audit revision
 */
export function useCreateAuditRevision() {
  const api = useApiClient()
  return async (data: CreateAuditRevisionPayload): Promise<ApiResponse<any>> => {
    return api.post<ApiResponse<any>>('/audit', data)
  }
}

/**
 * Hook that returns a function to fetch all audit revisions.
 * Tries common endpoints to handle backend variations.
 */
export function useFetchAuditRevisions() {
  const api = useApiClient()

  return async (): Promise<AuditRevision[]> => {
    const endpoints = ['/audit', '/audits']

    for (const endpoint of endpoints) {
      try {
        const response = await api.get<unknown>(endpoint)
        const auditsArray = extractAuditRevisionsArray(response)
        if (auditsArray.length > 0) {
          return auditsArray.map((audit) => transformApiAuditRevision(audit as ApiAuditRevision))
        }
      } catch {
        // Try next known endpoint shape
      }
    }

    return []
  }
}

/**
 * Hook that returns a function to fetch audit revisions by project.
 * Uses the project endpoint when available, otherwise filters all audits.
 */
export function useFetchProjectAuditRevisions() {
  const api = useApiClient()
  const fetchAuditRevisions = useFetchAuditRevisions()

  return async (projectId: string): Promise<AuditRevision[]> => {
    if (!projectId) return []

    try {
      const response = await api.get<unknown>(`/audit/project/${projectId}`)
      const auditsArray = extractAuditRevisionsArray(response)
      if (auditsArray.length > 0) {
        return auditsArray.map((audit) => transformApiAuditRevision(audit as ApiAuditRevision))
      }
    } catch {
      // Fallback to all audits below
    }

    const allAudits = await fetchAuditRevisions()
    return allAudits.filter((audit) => String(audit.idProject || '').trim() === String(projectId).trim())
  }
}

/**
 * Hook that returns a function to trigger evidences import from POK by project and phase
 */
export function useImportProjectPhaseEvidences() {
  const api = useApiClient()
  return async (projectId: string, phaseId: string): Promise<ImportProjectPhaseEvidencesResponse> => {
    return api.post<ImportProjectPhaseEvidencesResponse>(
      `/projects/${projectId}/phases/${phaseId}/import-evidences`,
      {}
    )
  }
}

// ============================================================================
// User Extended Services
// ============================================================================

/**
 * Hook that returns a function to create a new user
 * POST /users
 */
export function useCreateUser() {
  const api = useApiClient()
  return async (userData: CreateUserPayload): Promise<ApiResponse<User>> => {
    return api.post<ApiResponse<User>>('/users', userData)
  }
}

/**
 * Hook that returns a function to fetch projects for a specific user
 * GET /users/:userId/projects
 */
export function useFetchUserProjects() {
  const api = useApiClient()
  return async (userId: string, limit: number = 50, offset: number = 0): Promise<Project[]> => {
    const response = await api.get<ApiResponse<ApiProject[]>>(
      `/users/${userId}/projects?limit=${limit}&offset=${offset}`
    )

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiProject)
    }

    return []
  }
}

/**
 * Hook that returns a function to fetch users by role
 * GET /users/by-role/:role
 */
export function useFetchUsersByRole() {
  const api = useApiClient()
  return async (role: string): Promise<User[]> => {
    const response = await api.get<ApiResponse<any[]>>(`/users/by-role/${encodeURIComponent(role)}`)

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiUser)
    }

    return []
  }
}

// ============================================================================
// Organization Extended Services
// ============================================================================

/**
 * Hook that returns a function to create a new organization
 * POST /organizations
 */
export function useCreateOrganization() {
  const api = useApiClient()
  return async (data: CreateOrganizationPayload): Promise<ApiResponse<Organization>> => {
    const response = await api.post<ApiResponse<Record<string, unknown>>>('/organizations', data)

    if (response && response.data) {
      const org = transformApiOrganization(response.data)
      if (org) {
        return { Success: true, data: org }
      }
    }

    throw new Error('Failed to create organization')
  }
}

/**
 * Hook that returns a function to fetch projects for a user within an organization
 * GET /organizations/:orgId/users/:userId/projects
 */
export function useFetchOrgUserProjects() {
  const api = useApiClient()
  return async (
    orgId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Project[]> => {
    const response = await api.get<ApiResponse<ApiProject[]>>(
      `/organizations/${orgId}/users/${userId}/projects?limit=${limit}&offset=${offset}`
    )

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiProject)
    }

    return []
  }
}

// ============================================================================
// Phase Project Services
// ============================================================================

/**
 * Hook that returns a function to add a phase to a project
 * POST /projects/:projectId/phase
 */
export function useAddPhaseToProject() {
  const api = useApiClient()
  return async (
    projectId: string,
    phaseData: CreatePhaseProjectPayload
  ): Promise<ApiResponse<Phase>> => {
    const response = await api.post<ApiResponse<ApiPhase>>(
      `/projects/${projectId}/phase`,
      phaseData
    )

    if (response && response.data) {
      return { Success: true, data: transformApiPhase(response.data) }
    }

    throw new Error('Failed to add phase to project')
  }
}

/**
 * Hook that returns a function to update a phase within a project
 * PUT /projects/:projectId/phase/:phaseId
 */
export function useUpdatePhaseProject() {
  const api = useApiClient()
  return async (
    projectId: string,
    phaseId: string,
    phaseData: Partial<CreatePhaseProjectPayload>
  ): Promise<ApiResponse<Phase>> => {
    const response = await api.put<ApiResponse<ApiPhase>>(
      `/projects/${projectId}/phase/${phaseId}`,
      phaseData
    )

    if (response && response.data) {
      return { Success: true, data: transformApiPhase(response.data) }
    }

    throw new Error('Failed to update phase project')
  }
}

// ============================================================================
// Phase Project Task Services
// ============================================================================

async function postPhaseProjectTask(
  api: ApiClient,
  projectId: string,
  phaseId: string,
  taskData: CreatePhaseProjectTaskPayload
): Promise<ApiResponse<Task>> {
  const response = await api.post<ApiResponse<ApiTask>>(
    `/projects/${projectId}/phases/${phaseId}/tasks`,
    withDefaultPhaseProjectTaskStatus(taskData)
  )

  if (response && response.data) {
    return { Success: true, data: transformApiTask(response.data) as Task }
  }

  throw new Error('Failed to add task to phase project')
}

/**
 * Hook that returns a function to add a task to a phase project
 * POST /projects/:projectId/phases/:phaseId/tasks
 */
export function useAddTaskToPhaseProject() {
  const api = useApiClient()
  return async (
    projectId: string,
    phaseId: string,
    taskData: CreatePhaseProjectTaskPayload
  ): Promise<ApiResponse<Task>> => postPhaseProjectTask(api, projectId, phaseId, taskData)
}

/**
 * Hook that returns a function to update a task within a phase project
 * PUT /projects/:projectId/phasesproject/:phaseProjectId/tasks/:taskId
 */
export function useUpdatePhaseProjectTask() {
  const api = useApiClient()
  return async (
    projectId: string,
    phaseProjectId: string,
    taskId: string,
    taskData: UpdatePhaseProjectTaskPayload
  ): Promise<ApiResponse<Task>> => {
    const response = await api.put<ApiResponse<ApiTask>>(
      `/projects/${projectId}/phasesproject/${phaseProjectId}/tasks/${taskId}`,
      taskData
    )

    if (response && response.data) {
      return { Success: true, data: transformApiTask(response.data) as Task }
    }

    throw new Error('Failed to update phase project task')
  }
}

// ============================================================================
// Project Contributions Services
// ============================================================================

/**
 * Hook that returns a function to fetch contributions for a specific project
 * GET /projects/:projectId/contributions
 */
export function useFetchProjectContributions() {
  const api = useApiClient()
  return async (projectId: string, limit: number = 50, offset: number = 0): Promise<Contribution[]> => {
    const response = await api.get<ApiResponse<ApiContribution[]>>(
      `/projects/${projectId}/contributions?limit=${limit}&offset=${offset}`
    )

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiContribution)
    }

    return []
  }
}

// ============================================================================
// Audit Extended Services
// ============================================================================

/**
 * Hook that returns a function to update an audit revision
 * PUT /audit/:id
 */
export function useUpdateAuditRevision() {
  const api = useApiClient()
  return async (auditId: string, data: CreateAuditRevisionPayload): Promise<ApiResponse<AuditRevision>> => {
    const response = await api.put<ApiResponse<ApiAuditRevision>>(`/audit/${auditId}`, data)

    if (response && response.data) {
      return { Success: true, data: transformApiAuditRevision(response.data) }
    }

    throw new Error('Failed to update audit revision')
  }
}

// ============================================================================
// Transaction Services
// ============================================================================

/**
 * Hook that returns a function to fetch all transactions
 * GET /transactions
 */
export function useFetchTransactions() {
  const api = useApiClient()
  return async (limit: number = 50, offset: number = 0): Promise<Transaction[]> => {
    const response = await api.get<ApiResponse<ApiTransaction[]>>(
      `/transactions?limit=${limit}&offset=${offset}`
    )

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiTransaction)
    }

    return []
  }
}

/**
 * Hook that returns a function to fetch transactions by project
 * GET /transactions/project/:projectId
 */
export function useFetchProjectTransactions() {
  const api = useApiClient()
  return async (projectId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> => {
    const response = await api.get<ApiResponse<ApiTransaction[]>>(
      `/transactions/project/${projectId}?limit=${limit}&offset=${offset}`
    )

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiTransaction)
    }

    return []
  }
}

/**
 * Hook that returns a function to fetch transactions by project and type
 * GET /transactions/project/:projectId/type/:typeTransaction
 */
export function useFetchProjectTransactionsByType() {
  const api = useApiClient()
  return async (
    projectId: string,
    typeTransaction: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> => {
    const response = await api.get<ApiResponse<ApiTransaction[]>>(
      `/transactions/project/${projectId}/type/${typeTransaction}?limit=${limit}&offset=${offset}`
    )

    if (response && response.data && Array.isArray(response.data)) {
      return response.data.map(transformApiTransaction)
    }

    return []
  }
}

// ============================================================================
// Asset Token Services
// ============================================================================

/**
 * Hook that returns a function to fetch all asset tokens
 * GET /assetTokenSymbol (public)
 */
export function useFetchAssetTokens() {
  const api = useApiClient()
  return async (): Promise<any[]> => {
    const response = await api.get<any[]>('/enums/assetTokenSymbol')

    if (Array.isArray(response)) {
      return response
    }

    // Handle wrapped response
    const wrapped = response as unknown as ApiResponse<any[]>
    if (wrapped && wrapped.data && Array.isArray(wrapped.data)) {
      return wrapped.data
    }

    return []
  }
}

// ============================================================================
// Blockchain Services
// ============================================================================

/**
 * Hook that returns a function to deploy a blockchain certification contract
 * POST /blockchain/deploy/evidence
 */
export function useDeployEvidenceContract() {
  const api = useApiClient()
  return async (): Promise<ApiResponse<unknown>> => {
    return api.post<ApiResponse<unknown>>('/blockchain/deploy/evidence')
  }
}

// ============================================================================
// Phase & Task Template Services
// ============================================================================

/**
 * Hook that returns a function to create a new phase template
 * POST /phases
 */
export function useCreatePhaseTemplate() {
  const api = useApiClient()
  return async (data: { name_phase: string; brief_description: string }): Promise<ApiResponse<AvailablePhase>> => {
    return api.post<ApiResponse<AvailablePhase>>('/phases', data)
  }
}

/**
 * Hook that returns a function to create a new task template
 * POST /tasks
 */
export function useCreateTaskTemplate() {
  const api = useApiClient()
  return async (data: { name_task: string }): Promise<ApiResponse<ApiTask>> => {
    return api.post<ApiResponse<ApiTask>>('/tasks', data)
  }
}
