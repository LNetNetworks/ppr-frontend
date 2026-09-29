/**
 * Kept as the import path used by `src/app/layout.tsx` and the existing tests.
 * The implementation now lives in `config.server.ts`, alongside the rest of the
 * server-only environment access.
 */
export { getServerWebsiteTitle, parsePublicEnvValue, readPublicEnvFromDisk } from './config.server'
