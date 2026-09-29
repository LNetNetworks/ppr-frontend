import 'server-only'
import { ServerApiClient } from './api'
import { config } from './config'
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
import { cookies } from 'next/headers'
import { withDefaultPhaseProjectTaskStatus } from './task-payload'
import type {
  Project,
  Organization,
  Phase,
  ApiPhase,
  EnumsResponse,
  ApiResponse,
  ApiProject,
  Task,
  ApiTask,
  User,
  Evidence,
  Contribution,
  ApiContribution,
  Transaction,
  ApiTransaction,
  AuditRevision,
  ApiAuditRevision,
  AssetToken,
  AvailablePhase,
  CreateOrganizationPayload,
  CreateUserPayload,
  CreatePhaseProjectPayload,
  CreatePhaseProjectTaskPayload,
  UpdatePhaseProjectTaskPayload,
  CreateAuditRevisionPayload,
} from '@/types/api'

/**
 * Server-side API services
 * Use these functions in server components and server actions
 */

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

async function getServerAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get('kc_token')?.value
}

async function getServerApiClient(token?: string) {
  const resolvedToken = token ?? (await getServerAuthToken())
  return new ServerApiClient(resolvedToken)
}

/**
 * Fetch all projects (server-side)
 * Authentication is optional for now but ready to be implemented
 * 
 * @param token - Optional authentication token (will be required in the future)
 */
export async function fetchProjects(token?: string): Promise<Project[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiProject[]>>('/projects')

  // Extract data array and transform projects
  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiProject)
  }

  // Fallback: return empty array if response structure is unexpected
  return []
}

/**
 * Fetch a single project by ID (server-side)
 * Backend returns: { project: ApiProject, token_balance: string }
 */
export async function fetchProject(id: string, token?: string): Promise<Project> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<{ project: ApiProject; token_balance: string }>>(`/projects/${id}`)

  // Extract data and transform project
  // Backend response.data has structure: { project: {...}, token_balance: string }
  if (response && response.data) {
    const { project: apiProject, token_balance } = response.data
    // Merge token_balance into the project before transforming
    const projectWithBalance = { ...apiProject, token_balance }
    return transformApiProject(projectWithBalance)
  }

  throw new Error('Project not found')
}

/**
 * Fetch all organizations (server-side)
 */
export async function fetchOrganizations(token?: string): Promise<Organization[]> {
  const api = await getServerApiClient(token)
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

/**
 * Fetch a single organization by ID (server-side)
 */
export async function fetchOrganization(id: string, token?: string): Promise<Organization> {
  const api = await getServerApiClient(token)
  return api.get<Organization>(`/organizations/${id}`)
}

/**
 * Fetch all phases with optional limit (server-side)
 */
export async function fetchStages(limit?: number, token?: string): Promise<Phase[]> {
  const api = await getServerApiClient(token)
  const query = limit ? `?limit=${limit}` : ''
  return api.get<Phase[]>(`/phases${query}`)
}

/**
 * Fetch stages for a specific project (server-side)
 */
export async function fetchProjectStages(
  projectId: string,
  token?: string
): Promise<Phase[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiPhase[]>>(`/projects/${projectId}/phases`)

  // Extract data array and transform phases
  let phases: Phase[] = []
  if (response && response.data && Array.isArray(response.data)) {
    phases = response.data.map(transformApiPhase)
  }

  // Fetch evidences and link them to phases
  try {
    const evidences = await fetchProjectEvidences(projectId, token)
    if (!config.isProduction()) {
      console.log('[fetchProjectStages][server] evidences response:', {
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

/**
 * Check whether a project has at least one stage requiring audit (server-side).
 * Uses a lightweight phases fetch without evidence enrichment.
 */
export async function fetchProjectHasAuditableStages(
  projectId: string,
  token?: string
): Promise<boolean> {
  if (!projectId) return false

  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiPhase[]>>(`/projects/${projectId}/phases`)

  if (!response || !Array.isArray(response.data)) {
    return false
  }

  return response.data.some((phase) => phase.require_auditory === true || phase.require_audit === true)
}

/**
 * Fetch enums (server-side)
 */
export async function fetchEnums(token?: string): Promise<EnumsResponse> {
  const api = await getServerApiClient(token)
  return api.get<EnumsResponse>('/enums')
}

/**
 * Create a new project (server-side)
 * 
 * @param projectData - Project data to create
 * @param token - Optional authentication token (will be required in the future)
 */
export async function createProject(
  projectData: {
    name_project: string
    description?: string
    id_organization?: string
    type_project?: string
    type_currency?: string
    [key: string]: unknown
  },
  token?: string
): Promise<Project> {
  const api = await getServerApiClient(token)
  const response = await api.post<ApiResponse<ApiProject>>('/projects', projectData)

  // Extract data and transform project
  if (response && response.data) {
    return transformApiProject(response.data)
  }

  throw new Error('Failed to create project')
}

/**
 * Update an existing project (server-side)
 * 
 * @param projectId - ID of the project to update
 * @param projectData - Project data to update
 * @param token - Optional authentication token (will be required in the future)
 */
export async function updateProject(
  projectId: string,
  projectData: {
    name_project: string
    description?: string
    id_organization?: string
    type_project?: string
    type_currency?: string
    [key: string]: unknown
  },
  token?: string
): Promise<Project> {
  const api = await getServerApiClient(token)
  const response = await api.put<ApiResponse<ApiProject>>(`/projects/${projectId}`, projectData)

  // Extract data and transform project
  if (response && response.data) {
    return transformApiProject(response.data)
  }

  throw new Error('Failed to update project')
}

/**
 * Fetch tasks for a specific phase (server-side)
 * @deprecated Use fetchProjectPhaseTasks instead
 */
export async function fetchPhaseTasks(
  phaseId: string,
  token?: string
): Promise<Task[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiTask[]>>(`/phases/${phaseId}/tasks`)

  // Extract data array and transform tasks
  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiTask)
  }

  // Fallback: return empty array if response structure is unexpected
  return []
}

/**
 * Fetch tasks for a specific project phase (server-side)
 * Uses the endpoint: /projects/{projectId}/phases/{phaseProjectId}/tasks
 */
export async function fetchProjectPhaseTasks(
  projectId: string,
  phaseProjectId: string,
  token?: string
): Promise<Task[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiTask[]>>(`/projects/${projectId}/phases/${phaseProjectId}/tasks`)

  // Extract data array and transform tasks
  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiTask)
  }

  // Fallback: return empty array if response structure is unexpected
  return []
}

/**
 * Fetch users (members) for a specific project (server-side)
 * Uses the /projects/{projectId}/members endpoint
 */
export async function fetchProjectUsers(
  projectId: string,
  token?: string
): Promise<User[]> {
  const api = await getServerApiClient(token)
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

/**
 * Fetch evidences for a specific project (server-side)
 */
export async function fetchProjectEvidences(
  projectId: string,
  token?: string
): Promise<Evidence[]> {
  const api = await getServerApiClient(token)
  try {
    const response = await api.get<ApiResponse<Evidence[]>>(`/evidences/project/${projectId}`)

    // Extract data array
    if (response && response.data && Array.isArray(response.data)) {
      return response.data
    }

    // Fallback: return empty array if response structure is unexpected
    return []
  } catch (error) {
    // If endpoint doesn't exist yet, return empty array
    console.warn('Failed to fetch project evidences:', error)
    return []
  }
}

/**
 * Fetch evidences for a specific project (server-side)
 */
export async function fetchEvidences(projectId: string, token?: string): Promise<Evidence[]> {
  if (!projectId) {
    return []
  }

  const api = await getServerApiClient(token)
  try {
    const response = await api.get<ApiResponse<Evidence[]>>(`/evidences/project/${projectId}`)

    // Extract data array
    if (response && response.data && Array.isArray(response.data)) {
      return response.data
    }

    // Fallback: return empty array if response structure is unexpected
    return []
  } catch (error) {
    // If endpoint doesn't exist yet, return empty array
    console.warn(`Failed to fetch evidences for project ${projectId}:`, error)
    return []
  }
}

// ============================================================================
// User Extended Services (server-side)
// ============================================================================

/**
 * Create a new user (server-side)
 * POST /users
 */
export async function createUser(
  userData: CreateUserPayload,
  token?: string
): Promise<ApiResponse<User>> {
  const api = await getServerApiClient(token)
  return api.post<ApiResponse<User>>('/users', userData)
}

/**
 * Fetch projects for a specific user (server-side)
 * GET /users/:userId/projects
 */
export async function fetchUserProjects(
  userId: string,
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<Project[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiProject[]>>(
    `/users/${userId}/projects?limit=${limit}&offset=${offset}`
  )

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiProject)
  }

  return []
}

/**
 * Fetch users by role (server-side)
 * GET /users/by-role/:role
 */
export async function fetchUsersByRole(
  role: string,
  token?: string
): Promise<User[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<any[]>>(`/users/by-role/${encodeURIComponent(role)}`)

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiUser)
  }

  return []
}

// ============================================================================
// Organization Extended Services (server-side)
// ============================================================================

/**
 * Create a new organization (server-side)
 * POST /organizations
 */
export async function createOrganization(
  data: CreateOrganizationPayload,
  token?: string
): Promise<Organization> {
  const api = await getServerApiClient(token)
  const response = await api.post<ApiResponse<Record<string, unknown>>>('/organizations', data)

  if (response && response.data) {
    const org = transformApiOrganization(response.data)
    if (org) return org
  }

  throw new Error('Failed to create organization')
}

/**
 * Fetch projects for a user within an organization (server-side)
 * GET /organizations/:orgId/users/:userId/projects
 */
export async function fetchOrgUserProjects(
  orgId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<Project[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiProject[]>>(
    `/organizations/${orgId}/users/${userId}/projects?limit=${limit}&offset=${offset}`
  )

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiProject)
  }

  return []
}

// ============================================================================
// Phase Project Services (server-side)
// ============================================================================

/**
 * Add a phase to a project (server-side)
 * POST /projects/:projectId/phase
 */
export async function addPhaseToProject(
  projectId: string,
  phaseData: CreatePhaseProjectPayload,
  token?: string
): Promise<Phase> {
  const api = await getServerApiClient(token)
  const response = await api.post<ApiResponse<ApiPhase>>(
    `/projects/${projectId}/phase`,
    phaseData
  )

  if (response && response.data) {
    return transformApiPhase(response.data)
  }

  throw new Error('Failed to add phase to project')
}

/**
 * Update a phase within a project (server-side)
 * PUT /projects/:projectId/phase/:phaseId
 */
export async function updatePhaseProject(
  projectId: string,
  phaseId: string,
  phaseData: Partial<CreatePhaseProjectPayload>,
  token?: string
): Promise<Phase> {
  const api = await getServerApiClient(token)
  const response = await api.put<ApiResponse<ApiPhase>>(
    `/projects/${projectId}/phase/${phaseId}`,
    phaseData
  )

  if (response && response.data) {
    return transformApiPhase(response.data)
  }

  throw new Error('Failed to update phase project')
}

// ============================================================================
// Phase Project Task Services (server-side)
// ============================================================================

async function postPhaseProjectTask(
  api: ServerApiClient,
  projectId: string,
  phaseId: string,
  taskData: CreatePhaseProjectTaskPayload
): Promise<Task> {
  const response = await api.post<ApiResponse<ApiTask>>(
    `/projects/${projectId}/phases/${phaseId}/tasks`,
    withDefaultPhaseProjectTaskStatus(taskData)
  )

  if (response && response.data) {
    return transformApiTask(response.data) as Task
  }

  throw new Error('Failed to add task to phase project')
}

/**
 * Add a task to a phase project (server-side)
 * POST /projects/:projectId/phases/:phaseProjectId/tasks
 */
export async function addTaskToPhaseProject(
  projectId: string,
  phaseId: string,
  taskData: CreatePhaseProjectTaskPayload,
  token?: string
): Promise<Task> {
  const api = await getServerApiClient(token)
  return postPhaseProjectTask(api, projectId, phaseId, taskData)
}

/**
 * Update a task within a phase project (server-side)
 * PUT /projects/:projectId/phasesproject/:phaseProjectId/tasks/:taskId
 */
export async function updatePhaseProjectTask(
  projectId: string,
  phaseProjectId: string,
  taskId: string,
  taskData: UpdatePhaseProjectTaskPayload,
  token?: string
): Promise<Task> {
  const api = await getServerApiClient(token)
  const response = await api.put<ApiResponse<ApiTask>>(
    `/projects/${projectId}/phasesproject/${phaseProjectId}/tasks/${taskId}`,
    taskData
  )

  if (response && response.data) {
    return transformApiTask(response.data) as Task
  }

  throw new Error('Failed to update phase project task')
}

// ============================================================================
// Project Contributions Services (server-side)
// ============================================================================

/**
 * Fetch contributions for a specific project (server-side)
 * GET /projects/:projectId/contributions
 */
export async function fetchProjectContributions(
  projectId: string,
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<Contribution[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiContribution[]>>(
    `/projects/${projectId}/contributions?limit=${limit}&offset=${offset}`
  )

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiContribution)
  }

  return []
}

// ============================================================================
// Audit Extended Services (server-side)
// ============================================================================

/**
 * Fetch all audit revisions (server-side).
 * Tries common endpoints to support backend variations.
 */
export async function fetchAuditRevisions(token?: string): Promise<AuditRevision[]> {
  const api = await getServerApiClient(token)
  const endpoints = ['/audit', '/audits']

  for (const endpoint of endpoints) {
    try {
      const response = await api.get<unknown>(endpoint)
      const auditsArray = extractAuditRevisionsArray(response)
      if (auditsArray.length > 0) {
        return auditsArray.map((audit) => transformApiAuditRevision(audit as ApiAuditRevision))
      }
    } catch {
      // Continue with the next endpoint
    }
  }

  return []
}

/**
 * Fetch audit revisions for a specific project (server-side).
 * Uses dedicated endpoint when available, otherwise filters all audits.
 */
export async function fetchProjectAuditRevisions(
  projectId: string,
  token?: string
): Promise<AuditRevision[]> {
  if (!projectId) return []

  const api = await getServerApiClient(token)
  try {
    const response = await api.get<unknown>(`/audit/project/${projectId}`)
    const auditsArray = extractAuditRevisionsArray(response)
    if (auditsArray.length > 0) {
      return auditsArray.map((audit) => transformApiAuditRevision(audit as ApiAuditRevision))
    }
  } catch {
    // Fallback below
  }

  const allAudits = await fetchAuditRevisions(token)
  return allAudits.filter((audit) => String(audit.idProject || '').trim() === String(projectId).trim())
}

/**
 * Update an audit revision (server-side)
 * PUT /audit/:id
 */
export async function updateAuditRevision(
  auditId: string,
  data: CreateAuditRevisionPayload,
  token?: string
): Promise<AuditRevision> {
  const api = await getServerApiClient(token)
  const response = await api.put<ApiResponse<ApiAuditRevision>>(`/audit/${auditId}`, data)

  if (response && response.data) {
    return transformApiAuditRevision(response.data)
  }

  throw new Error('Failed to update audit revision')
}

// ============================================================================
// Transaction Services (server-side)
// ============================================================================

/**
 * Fetch all transactions (server-side)
 * GET /transactions
 */
export async function fetchTransactions(
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<Transaction[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiTransaction[]>>(
    `/transactions?limit=${limit}&offset=${offset}`
  )

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiTransaction)
  }

  return []
}

/**
 * Fetch transactions by project (server-side)
 * GET /transactions/project/:projectId
 */
export async function fetchProjectTransactions(
  projectId: string,
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<Transaction[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiTransaction[]>>(
    `/transactions/project/${projectId}?limit=${limit}&offset=${offset}`
  )

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiTransaction)
  }

  return []
}

/**
 * Fetch transactions by project and type (server-side)
 * GET /transactions/project/:projectId/type/:typeTransaction
 */
export async function fetchProjectTransactionsByType(
  projectId: string,
  typeTransaction: string,
  limit: number = 50,
  offset: number = 0,
  token?: string
): Promise<Transaction[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<ApiResponse<ApiTransaction[]>>(
    `/transactions/project/${projectId}/type/${typeTransaction}?limit=${limit}&offset=${offset}`
  )

  if (response && response.data && Array.isArray(response.data)) {
    return response.data.map(transformApiTransaction)
  }

  return []
}

// ============================================================================
// Asset Token Services (server-side)
// ============================================================================

/**
 * Fetch all asset tokens (server-side)
 * GET /assetTokenSymbol (public)
 */
export async function fetchAssetTokens(token?: string): Promise<any[]> {
  const api = await getServerApiClient(token)
  const response = await api.get<any[]>('/enums/assetTokenSymbol')

  if (Array.isArray(response)) {
    return response
  }

  const wrapped = response as unknown as ApiResponse<any[]>
  if (wrapped && wrapped.data && Array.isArray(wrapped.data)) {
    return wrapped.data
  }

  return []
}

// ============================================================================
// Blockchain Services (server-side)
// ============================================================================

/**
 * Deploy a blockchain certification contract (server-side)
 * POST /blockchain/deploy/evidence
 */
export async function deployEvidenceContract(
  token?: string
): Promise<ApiResponse<unknown>> {
  const api = await getServerApiClient(token)
  return api.post<ApiResponse<unknown>>('/blockchain/deploy/evidence')
}

// ============================================================================
// Phase & Task Template Services (server-side)
// ============================================================================

/**
 * Create a new phase template (server-side)
 * POST /phases
 */
export async function createPhaseTemplate(
  data: { name_phase: string; brief_description: string },
  token?: string
): Promise<ApiResponse<AvailablePhase>> {
  const api = await getServerApiClient(token)
  return api.post<ApiResponse<AvailablePhase>>('/phases', data)
}

/**
 * Create a new task template (server-side)
 * POST /tasks
 */
export async function createTaskTemplate(
  data: { name_task: string },
  token?: string
): Promise<ApiResponse<ApiTask>> {
  const api = await getServerApiClient(token)
  return api.post<ApiResponse<ApiTask>>('/tasks', data)
}
