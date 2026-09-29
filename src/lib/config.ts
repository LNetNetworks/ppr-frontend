/**
 * Centralized environment access.
 *
 * This is the only isomorphic module in the repository that reads `process.env`
 * or `window.__ENV`. Everything else imports the aliases below.
 *
 * Server-only access (reading `public/env.js` from disk) lives in `config.server.ts`,
 * which cannot be imported from client code because it pulls in `node:fs`.
 */

/**
 * Build-time public variables.
 *
 * These MUST be written as literal `process.env.NEXT_PUBLIC_X` expressions: Next
 * replaces that exact text with the value during the build, so a computed lookup
 * like `process.env[key]` is left untouched and resolves to `undefined` in the
 * browser, where no `process` object exists.
 *
 * They are getters rather than plain properties so the substituted value is read
 * when it is needed instead of when this module is first imported.
 */
const BUILD = {
  get apiUrl() {
    return process.env.NEXT_PUBLIC_API_URL
  },
  get websiteTitle() {
    return process.env.NEXT_PUBLIC_WEBSITE_TITLE
  },
  get instanceName() {
    return process.env.NEXT_PUBLIC_INSTANCE_NAME
  },
  get sidebarLogo() {
    return process.env.NEXT_PUBLIC_SIDEBAR_LOGO
  },
  get showImportEvidence() {
    return process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE
  },
}

/** Runtime value injected by `public/env.js` into `window.__ENV`. Browser only. */
function runtimeEnv(key: string): string | undefined {
  if (typeof window !== 'undefined' && window.__ENV?.[key]) {
    return window.__ENV[key]
  }
  return undefined
}

/**
 * Process variable, server only. A computed key is safe here because on the
 * server `process.env` is the real Node object, not a build-time substitution.
 */
function serverEnv(key: string): string | undefined {
  if (typeof window === 'undefined') {
    const value = process.env[key]
    if (value && value.length > 0) return value
  }
  return undefined
}

function trimmed(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const result = value.trim()
  return result.length > 0 ? result : undefined
}

/**
 * One alias per variable, each resolving its own source cascade.
 *
 * Aliases are functions, not constants: `window.__ENV` is populated by a script
 * that runs before hydration, and evaluating at import time could capture an
 * empty value and freeze it for the whole session.
 */
export const config = {
  /** Raw accessors, for callers that need a specific source rather than the cascade. */
  runtime: runtimeEnv,
  server: serverEnv,
  build: BUILD,

  apiUrlClient: () => runtimeEnv('API_URL') ?? BUILD.apiUrl ?? '',
  apiUrlServer: () => serverEnv('API_URL') ?? serverEnv('NEXT_PUBLIC_API_URL') ?? '',

  keycloakUrl: () => runtimeEnv('KEYCLOAK_URL') ?? '',
  keycloakRealm: () => runtimeEnv('KEYCLOAK_REALM') ?? '',
  keycloakClientId: () => runtimeEnv('KEYCLOAK_CLIENT_ID') ?? '',

  websiteTitle: () => trimmed(runtimeEnv('WEBSITE_TITLE')) ?? trimmed(BUILD.websiteTitle),
  instanceName: () => trimmed(runtimeEnv('INSTANCE_NAME')) ?? trimmed(BUILD.instanceName),
  sidebarLogo: () => trimmed(runtimeEnv('SIDEBAR_LOGO')) ?? trimmed(BUILD.sidebarLogo),
  showImportEvidence: () =>
    trimmed(runtimeEnv('SHOW_IMPORT_EVIDENCE')) ?? trimmed(BUILD.showImportEvidence),

  isProduction: () => process.env.NODE_ENV === 'production',
}
