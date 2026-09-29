import { config } from './config'

/**
 * Public application settings.
 *
 * Environment access lives in `config.ts`; this module only adds the validation
 * rules: a missing value is an error, and booleans must be spelled out.
 */

type PublicAppEnvKey =
  | 'NEXT_PUBLIC_INSTANCE_NAME'
  | 'NEXT_PUBLIC_WEBSITE_TITLE'
  | 'NEXT_PUBLIC_SIDEBAR_LOGO'
  | 'NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE'

const RESOLVERS: Record<PublicAppEnvKey, () => string | undefined> = {
  NEXT_PUBLIC_INSTANCE_NAME: config.instanceName,
  NEXT_PUBLIC_WEBSITE_TITLE: config.websiteTitle,
  NEXT_PUBLIC_SIDEBAR_LOGO: config.sidebarLogo,
  NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE: config.showImportEvidence,
}

function getRequiredPublicEnv(key: PublicAppEnvKey): string {
  const value = RESOLVERS[key]()

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  return value
}

function getRequiredPublicBooleanEnv(key: PublicAppEnvKey): boolean {
  const value = getRequiredPublicEnv(key).toLowerCase()

  if (value === 'true') return true
  if (value === 'false') return false

  throw new Error(`Invalid boolean value for ${key}: "${value}". Use "true" or "false".`)
}

export function getInstanceName(): string {
  return getRequiredPublicEnv('NEXT_PUBLIC_INSTANCE_NAME')
}

export function getWebsiteTitle(): string {
  return getRequiredPublicEnv('NEXT_PUBLIC_WEBSITE_TITLE')
}

export function getSidebarLogo(): string {
  return getRequiredPublicEnv('NEXT_PUBLIC_SIDEBAR_LOGO')
}

export function getShowImportEvidence(): boolean {
  return getRequiredPublicBooleanEnv('NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE')
}
