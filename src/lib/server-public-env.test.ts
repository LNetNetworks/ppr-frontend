import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { parsePublicEnvValue } from '@/lib/server-public-env'

describe('parsePublicEnvValue', () => {
  it('parses a single-quoted value', () => {
    const envFile = "window.__ENV = { WEBSITE_TITLE: 'Trace4good' }"
    expect(parsePublicEnvValue(envFile, 'WEBSITE_TITLE')).toBe('Trace4good')
  })

  it('parses a double-quoted value', () => {
    const envFile = 'window.__ENV = { WEBSITE_TITLE: "Trace4good" }'
    expect(parsePublicEnvValue(envFile, 'WEBSITE_TITLE')).toBe('Trace4good')
  })

  it('returns undefined when key does not exist', () => {
    const envFile = "window.__ENV = { INSTANCE_NAME: 'Trace4good' }"
    expect(parsePublicEnvValue(envFile, 'WEBSITE_TITLE')).toBeUndefined()
  })
})
