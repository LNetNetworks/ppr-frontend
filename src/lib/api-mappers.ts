import type {
  ApiAuditRevision,
  ApiContribution,
  ApiPhase,
  ApiProject,
  ApiTask,
  ApiTransaction,
  AuditRevision,
  Contribution,
  Organization,
  Phase,
  Project,
  Task,
  Transaction,
  User,
} from '@/types/api'

/**
 * Transform API project to Project type
 */
export function transformApiProject(apiProject: ApiProject | Record<string, unknown>): Project {
  // Support nested structure (e.g. { project: { ... }, token_balance: "..." })
  const nestedProject = (apiProject as { project?: Record<string, unknown> }).project
  const normalizedProject = (nestedProject || apiProject) as ApiProject & Record<string, unknown>

  const id =
    String(
      normalizedProject.id_project ||
      normalizedProject.idProject ||
      normalizedProject.project_id ||
      normalizedProject.id ||
      ''
    ).trim()

  const name =
    String(
      normalizedProject.name_project ||
      normalizedProject.nameProject ||
      normalizedProject.project_name ||
      normalizedProject.name ||
      ''
    ).trim()

  return {
    // Preserve all other fields first, then enforce normalized aliases.
    ...normalizedProject,
    id,
    name,
    description: (normalizedProject.description as string) || undefined,
    status: (normalizedProject.status as string) || undefined,
    organizationId:
      (normalizedProject.id_organization as string) ||
      (normalizedProject.organization_id as string) ||
      (normalizedProject.organizationId as string) ||
      undefined,
    tokenBalance:
      (normalizedProject.token_balance as string) ||
      (normalizedProject.tokenBalance as string) ||
      (apiProject as any).token_balance ||
      (apiProject as any).tokenBalance ||
      undefined,
    walletProvider:
      (normalizedProject.wallet_provider as string) ||
      (normalizedProject.walletProvider as string) ||
      undefined,
    countryRegion:
      (normalizedProject.country_region as string) ||
      (normalizedProject.countryRegion as string) ||
      undefined,
    assetToken:
      (normalizedProject.asset_token as string) ||
      (normalizedProject.assetToken as string) ||
      undefined,
    typeCurrency:
      (normalizedProject.type_currency as string) ||
      (normalizedProject.typeCurrency as string) ||
      undefined,
    createdAt:
      (normalizedProject.date_start as string) ||
      (normalizedProject.created_at as string) ||
      (normalizedProject.createdAt as string) ||
      undefined,
    updatedAt:
      (normalizedProject.date_end as string) ||
      (normalizedProject.updated_at as string) ||
      (normalizedProject.updatedAt as string) ||
      undefined,
  }
}

/**
 * Transform API phase to Phase type
 */
export function transformApiPhase(apiPhase: ApiPhase): Phase {
  const normalizedPhase = apiPhase as ApiPhase & Record<string, unknown>
  const idPhaseProject =
    String(
      normalizedPhase.id_phase_project ||
      normalizedPhase.idPhaseProject ||
      normalizedPhase.phase_project_id ||
      normalizedPhase.id ||
      ''
    ).trim()

  const idPhase =
    String(
      normalizedPhase.id_phase ||
      normalizedPhase.idPhase ||
      normalizedPhase.phase_id ||
      idPhaseProject
    ).trim()

  const projectId =
    String(
      normalizedPhase.id_project ||
      normalizedPhase.project_id ||
      normalizedPhase.projectId ||
      ''
    ).trim()

  return {
    // Preserve all other fields first, then enforce normalized aliases.
    ...normalizedPhase,
    id: idPhaseProject || idPhase,
    idPhaseProject: idPhaseProject || idPhase,
    idPhase,
    projectId,
    name:
      (normalizedPhase.phaseName as string) ||
      (normalizedPhase.name_phase as string) ||
      (normalizedPhase.name as string) ||
      '',
    typeProject:
      (normalizedPhase.type_project as string) ||
      (normalizedPhase.typeProject as string) ||
      undefined,
    requireEvidence:
      (normalizedPhase.require_evidence as boolean) ??
      (normalizedPhase.requireEvidence as boolean) ??
      undefined,
    requireContribution:
      (normalizedPhase.require_contribution as boolean) ??
      (normalizedPhase.requireContribution as boolean) ??
      undefined,
    requireAuditory:
      (normalizedPhase.require_auditory as boolean) ??
      (normalizedPhase.require_audit as boolean) ??
      (normalizedPhase.requireAuditory as boolean) ??
      (normalizedPhase.requireAudit as boolean) ??
      undefined,
    status:
      (normalizedPhase.status as string) ||
      (normalizedPhase.status_phase as string) ||
      undefined,
    order:
      (normalizedPhase.order as number) ??
      (normalizedPhase.phase_order as number) ??
      undefined,
    contributionRequired:
      (normalizedPhase.contribution_required as number) ??
      (normalizedPhase.contributionRequired as number) ??
      undefined,
    contributionReceived:
      (normalizedPhase.contribution_received as number) ??
      (normalizedPhase.contributionReceived as number) ??
      undefined,
    stageWeight:
      (normalizedPhase.stage_weight as number) ??
      (normalizedPhase.stageWeight as number) ??
      undefined,
    dateStart:
      (normalizedPhase.date_start as string) ||
      (normalizedPhase.dateStart as string) ||
      undefined,
    dateEnd:
      (normalizedPhase.date_end as string) ||
      (normalizedPhase.dateEnd as string) ||
      undefined,
    phaseType:
      (normalizedPhase.type as string) ||
      (normalizedPhase.phaseType as string) ||
      undefined,
    closeAuditory:
      (normalizedPhase.close_auditory as boolean) ??
      (normalizedPhase.close_auditor as boolean) ??
      (normalizedPhase.closeAuditory as boolean) ??
      undefined,
    closeContribution:
      (normalizedPhase.close_contribution as boolean) ??
      (normalizedPhase.closeContribution as boolean) ??
      undefined,
    closeEvidence:
      (normalizedPhase.close_evidence as boolean) ??
      (normalizedPhase.closeEvidence as boolean) ??
      undefined,
  }
}

/**
 * Transform API task to Task type
 * Handles nested task structure where task details are in a nested 'task' object
 */
export function transformApiTask(apiTask: ApiTask | Record<string, unknown>): Task {
  const nestedTask = (apiTask as { task?: Record<string, unknown> }).task || {}

  return {
    // Preserve all other fields from the original first
    ...apiTask,
    // Then override with properly transformed values
    id: (apiTask as any).id_task || (nestedTask as any).id_task || (apiTask as any).id || '',
    name:
      (apiTask as any).task_nameTask ||
      (nestedTask as any).name_task ||
      (apiTask as any).name_task ||
      (apiTask as any).name ||
      '',
    description: (nestedTask as any).description || (apiTask as any).description || (apiTask as any).desc || undefined,
    status: (apiTask as any).status_task || (apiTask as any).status || (nestedTask as any).status || undefined,
    phaseId:
      (apiTask as any).id_phase_project ||
      (apiTask as any).phase_id ||
      (apiTask as any).phaseId ||
      undefined,
    id_phase_project: (apiTask as any).id_phase_project || (apiTask as any).phase_id || undefined,
    assignedTo:
      (nestedTask as any).assigned_to ||
      (apiTask as any).assigned_to ||
      (apiTask as any).assignedTo ||
      (apiTask as any).assigned_to_user ||
      undefined,
    dueDate:
      (nestedTask as any).due_date ||
      (apiTask as any).due_date ||
      (apiTask as any).dueDate ||
      (apiTask as any).due_date_time ||
      undefined,
    createdAt:
      (nestedTask as any).created_at ||
      (apiTask as any).created_at ||
      (apiTask as any).createdAt ||
      (apiTask as any).date_created ||
      undefined,
    updatedAt:
      (nestedTask as any).updated_at ||
      (apiTask as any).updated_at ||
      (apiTask as any).updatedAt ||
      (apiTask as any).date_updated ||
      undefined,
  }
}

/**
 * Transform API user response to User type
 * Maps API response fields: id_project_user, userName, userUserEmail
 */
export function transformApiUser(apiUser: any): User {
  const nestedUser = (apiUser?.user && typeof apiUser.user === 'object') ? apiUser.user : {}

  return {
    id: apiUser.id_project_user || apiUser.id_user || nestedUser.id_user || apiUser.id || nestedUser.id || '',
    username:
      apiUser.userName ||
      apiUser.username ||
      apiUser.name ||
      nestedUser.userName ||
      nestedUser.username ||
      nestedUser.name ||
      '',
    mail:
      apiUser.userUserEmail ||
      apiUser.mail ||
      apiUser.user_email ||
      apiUser.email ||
      nestedUser.userUserEmail ||
      nestedUser.mail ||
      nestedUser.user_email ||
      nestedUser.email ||
      '',
    type: apiUser.type || apiUser.role || nestedUser.type || nestedUser.role || undefined,
    date: apiUser.date || apiUser.created_at || apiUser.createdAt || nestedUser.date || nestedUser.created_at || nestedUser.createdAt || undefined,
    createdAt: apiUser.created_at || apiUser.createdAt || apiUser.date || nestedUser.created_at || nestedUser.createdAt || nestedUser.date || undefined,
    // Preserve all other fields
    ...apiUser,
  }
}

/**
 * Transform API organization to Organization type
 * Accepts multiple backend naming conventions.
 */
export function transformApiOrganization(apiOrganization: Record<string, unknown>): Organization | null {
  const id = String(
    apiOrganization.id ??
      apiOrganization.id_organizations ??
      apiOrganization.id_organization ??
      apiOrganization.organization_id ??
      apiOrganization.idOrganization ??
      ''
  ).trim()

  if (!id) {
    return null
  }

  const name = String(
    apiOrganization.name ??
      apiOrganization.name_organization ??
      apiOrganization.organization_name ??
      apiOrganization.nameOrganization ??
      id
  ).trim()

  return {
    ...apiOrganization,
    id,
    name: name || id,
  }
}

/**
 * Transform API contribution to Contribution type
 */
export function transformApiContribution(apiContribution: ApiContribution): Contribution {
  const {
    id_contribution,
    id_project,
    id_user,
    deposit_amount,
    id_phase_project,
    date_contribution,
    created_at,
    updated_at,
    ...rest
  } = apiContribution

  return {
    ...rest,
    id: id_contribution || '',
    id_contribution,
    id_project,
    id_user,
    deposit_amount,
    id_phase_project,
    date_contribution,
    createdAt: created_at,
    updatedAt: updated_at,
  }
}

/**
 * Transform API transaction to Transaction type
 */
export function transformApiTransaction(apiTransaction: ApiTransaction): Transaction {
  return {
    ...apiTransaction,
    id: apiTransaction.id_transaction || (apiTransaction as any).id || '',
    type: apiTransaction.type_transaction || (apiTransaction as any).type || '',
    projectId: apiTransaction.id_project || undefined,
    userId: apiTransaction.id_user || undefined,
    txHash: apiTransaction.tx_hash || undefined,
    createdAt: apiTransaction.created_at || undefined,
  }
}

/**
 * Transform API audit revision to AuditRevision type
 */
export function transformApiAuditRevision(apiAudit: ApiAuditRevision): AuditRevision {
  return {
    ...apiAudit,
    id: apiAudit.id_audit_revision || (apiAudit as any).id || '',
    objetive: apiAudit.objetive,
    idUser: apiAudit.id_user,
    idProject: apiAudit.id_project,
    observation: apiAudit.observation,
    idPhaseProject: apiAudit.id_phase_project,
    dateRevision: apiAudit.date_revision,
    status: apiAudit.status,
    createdAt: apiAudit.created_at || undefined,
    updatedAt: apiAudit.updated_at || undefined,
  }
}
