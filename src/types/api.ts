/**
 * API Response Types
 */

// Headers type for API requests
export type HeadersInit = Record<string, string>

// Common types
export interface ApiError {
  message: string
  code?: string
  details?: unknown
  status?: number
  backendMessage?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total?: number
  limit?: number
  offset?: number
}

// API Response wrapper
export interface ApiResponse<T> {
  Success: boolean
  data: T
  filters?: {
    limit?: number
    offset?: number
  }
}

// Raw API Project (as returned from API)
export interface ApiProject {
  id_project: string
  name_project: string
  type_project?: string
  type_currency?: string
  date_start?: string
  date_end?: string
  id_organization?: string
  description?: string
  monto_total_subvencionado?: number
  total_contributed_amount?: number
  token_balance?: string  // Real-time balance from blockchain
  wallet_provider?: string
  wallet_token?: string
  wallet_index_token?: string
  status?: string
  country_region?: string
  asset_token?: string
  [key: string]: unknown
}

// Project types
export interface Project {
  id: string
  name: string
  description?: string
  status?: string
  organizationId?: string
  tokenBalance?: string  // Real-time balance from blockchain
  walletProvider?: string
  countryRegion?: string
  assetToken?: string
  typeCurrency?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

// Organization types
export interface Organization {
  id: string
  name: string
  description?: string
  type?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

// Payload for POST /organizations
export interface CreateOrganizationPayload {
  name_organization: string
  date_registration: string
  address_organization?: string
  did_organization?: string
}

// Raw API Phase (as returned from API)
export interface ApiPhase {
  id_phase_project: string
  id_phase: string
  id_project: string
  type_project?: string
  require_evidence?: boolean
  require_contribution?: boolean
  require_auditory?: boolean
  require_audit?: boolean
  status?: string
  order?: number
  contribution_required?: number
  contribution_received?: number
  stage_weight?: number
  phaseName?: string
  date_start?: string
  date_end?: string
  type?: string           // PhaseType: definition | operational | clossing
  close_auditory?: boolean
  close_auditor?: boolean
  close_contribution?: boolean
  close_evidence?: boolean
  description?: string
  [key: string]: unknown
}

// Phase types
export interface Phase {
  id: string
  idPhaseProject: string
  idPhase: string
  projectId: string
  name: string
  typeProject?: string
  requireEvidence?: boolean
  requireContribution?: boolean
  requireAuditory?: boolean
  status?: string
  order?: number
  contributionRequired?: number
  contributionReceived?: number
  stageWeight?: number
  dateStart?: string
  dateEnd?: string
  phaseType?: string
  closeAuditory?: boolean
  closeContribution?: boolean
  closeEvidence?: boolean
  [key: string]: unknown
}

// Evidence types
export interface Evidence {
  id?: string
  id_evidence?: string
  projectId?: string
  id_project?: string
  phaseId?: string
  id_phase_project?: string
  id_user?: string
  name?: string
  file_name?: string
  description?: string
  fileUrl?: string
  uri?: string
  fileType?: string
  status?: string
  uploadedAt?: string
  created_at?: string
  hash?: string
  tx_hash?: string
  txHash?: string
  [key: string]: unknown
}

export interface UploadEvidenceRequest {
  projectId?: string
  phaseId?: string
  phaseProjectId?: string
  file: File | Blob
  name?: string
  description?: string
  [key: string]: unknown
}

// Enum types
export interface EnumValue {
  key: string
  value: string
  label?: string
  [key: string]: unknown
}

export interface EnumsResponse {
  [enumName: string]: EnumValue[]
}

// Task types
export interface Task {
  id: string
  name: string
  description?: string
  status?: string
  phaseId?: string
  id_phase_project?: string
  assignedTo?: string
  dueDate?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface ApiTask {
  id_task?: string
  id_phase_project?: string
  name_task?: string
  description?: string
  status?: string
  status_task?: string
  assigned_to?: string
  due_date?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// User types
export interface User {
  id: string
  username: string
  mail: string
  type?: string
  date?: string
  createdAt?: string
  addressSeedToken?: string
  walletAddressToken?: string
  didUser?: string
  apikeypok?: string
  [key: string]: unknown
}

// Payload for POST /users
export interface CreateUserPayload {
  id_organization: string
  name: string
  surname: string
  address_street: string
  address_number: string
  address_state: string
  address_country: string
  user_email: string
  phone_mobile: string
  active: boolean
  birthday: string
  role: 'verifier' | 'user' | 'sponsor' | 'provider' | 'superadmin'
  address_seed_token?: string
  wallet_address_token?: string
  did_user?: string
  keycloak_sub?: string
  apikeypok?: string
}

// Available Phase types (from /ppr/phases endpoint)
export interface AvailablePhase {
  id_phase: string
  name_phase: string
  brief_description: string
}

export interface AvailablePhasesResponse {
  Success: boolean
  data: AvailablePhase[]
  filters?: {
    limit?: number
    offset?: number
  }
}

// Contribution types
export interface Contribution {
  id?: string
  id_contribution?: string
  id_project: string
  id_user: string
  deposit_amount: number
  id_phase_project: string
  date_contribution: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface ApiContribution {
  id_contribution?: string
  id_project: string
  id_user: string
  deposit_amount: number
  id_phase_project: string
  date_contribution: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

// Phase completion info (returned by contribution and evidence creation)
export interface PhaseCompletionInfo {
  completed: boolean
  message?: string
}

// Audit Revision types
export interface AuditRevision {
  id: string
  objetive: string
  idUser: string
  idProject: string
  observation: string
  idPhaseProject: string
  dateRevision: string
  status: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface ApiAuditRevision {
  id_audit_revision?: string
  objetive: string
  id_user: string
  id_project: string
  observation: string
  id_phase_project: string
  date_revision: string
  status: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface CreateAuditRevisionPayload {
  objetive: string
  id_user: string
  id_project: string
  observation: string
  id_phase_project: string
  date_revision: string
  status: string
}

// Transaction types
export interface Transaction {
  id: string
  type: string
  projectId?: string
  userId?: string
  txHash?: string
  createdAt?: string
  [key: string]: unknown
}

export interface ApiTransaction {
  id_transaction?: string
  type_transaction?: string
  id_project?: string
  id_user?: string
  tx_hash?: string
  created_at?: string
  [key: string]: unknown
}

// Asset Token types
export interface AssetToken {
  symbol: string
  name: string
  decimals: number
  [key: string]: unknown
}

// Phase Project creation payload (POST /projects/:projectId/phase)
export interface CreatePhaseProjectPayload {
  id_phase: string
  require_evidence: boolean
  status: string
  order: number
  stage_weight: number
  contribution_required: number
  contribution_received: number
  date_start: string
  date_end: string
  type: string
  require_auditory: boolean
  require_contribution: boolean
  close_auditory: boolean
  close_auditor?: boolean
  close_contribution: boolean
  close_evidence: boolean
  description: string
}

// Phase Project Task creation payload (POST /projects/:projectId/phases/:ppId/tasks)
export interface CreatePhaseProjectTaskPayload {
  id_task: string
  status_task?: string
}

// Phase Project Task update payload (PUT /projects/:projectId/phasesproject/:ppId/tasks/:taskId)
export interface UpdatePhaseProjectTaskPayload {
  description?: string
  status_task?: string
}

export interface SyncImport {
  jobId: string
  total: number
  status: string
}

export interface ImportProjectPhaseEvidencesResponse {
  Success: boolean
  sync: SyncImport
}
