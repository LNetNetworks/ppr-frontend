import 'server-only'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config'

/**
 * Server-only environment access.
 *
 * Separate from `config.ts` because it imports `node:fs`, which cannot be bundled
 * for the browser. Client components import `config.ts`; server code that needs to
 * read `public/env.js` from disk imports this module, which re-exports everything
 * from `config.ts` so there is still a single import.
 */

export { config }

const PUBLIC_ENV_FILE_PATH = join(process.cwd(), 'public', 'env.js')

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Extracts a key from the text of `public/env.js`. Exported for testing. */
export function parsePublicEnvValue(fileContent: string, key: string): string | undefined {
  const keyPattern = escapeRegExp(key)
  const valuePattern = new RegExp(`\\b${keyPattern}\\b\\s*:\\s*(['"])(.*?)\\1`)
  const match = fileContent.match(valuePattern)

  if (!match) {
    return undefined
  }

  const parsedValue = match[2]?.trim()
  return parsedValue && parsedValue.length > 0 ? parsedValue : undefined
}

/**
 * Reads a public key from `public/env.js` on disk.
 *
 * The server does not receive `window.__ENV`, so for values that the pipeline only
 * writes into that file this is the runtime source.
 */
export function readPublicEnvFromDisk(key: string): string | undefined {
  try {
    return parsePublicEnvValue(readFileSync(PUBLIC_ENV_FILE_PATH, 'utf8'), key)
  } catch {
    // Fall back to build env when public/env.js is unavailable.
    return undefined
  }
}

export function getServerWebsiteTitle(): string {
  const runtimeTitle = readPublicEnvFromDisk('WEBSITE_TITLE')
  if (runtimeTitle) {
    return runtimeTitle
  }

  const buildTitle = config.build.websiteTitle?.trim()
  if (buildTitle) {
    return buildTitle
  }

  throw new Error(
    'Missing website title. Configure WEBSITE_TITLE in public/env.js or NEXT_PUBLIC_WEBSITE_TITLE.'
  )
}
