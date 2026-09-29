import { describe, expect, it } from 'vitest'
import { generateBreadcrumbs, isRoleSegment } from './breadcrumb.utils'

describe('generateBreadcrumbs', () => {
  it('returns empty breadcrumbs for root path', () => {
    expect(generateBreadcrumbs('/')).toEqual([])
  })

  it('maps projects breadcrumb to sponsor my-projects without breaking project detail level', () => {
    expect(generateBreadcrumbs('/sponsor/projects/123/evidences')).toEqual([
      { label: 'Sponsor', href: '/sponsor', isCurrent: false },
      { label: 'Projects', href: '/sponsor/my-projects', isCurrent: false },
      { label: '123', href: '/sponsor/projects/123', isCurrent: false },
      {
        label: 'Evidences',
        href: '/sponsor/projects/123/evidences',
        isCurrent: true,
      },
    ])
  })

  it('maps projects breadcrumb to provider my-projects without breaking task path', () => {
    expect(generateBreadcrumbs('/provider/projects/abc/tasks')).toEqual([
      { label: 'Provider', href: '/provider', isCurrent: false },
      { label: 'Projects', href: '/provider/my-projects', isCurrent: false },
      { label: 'abc', href: '/provider/projects/abc', isCurrent: false },
      { label: 'Tasks', href: '/provider/projects/abc/tasks', isCurrent: true },
    ])
  })

  it('maps verifier projects breadcrumb to verifier home because verifier has no my-projects route', () => {
    expect(generateBreadcrumbs('/verifier/projects/456')).toEqual([
      { label: 'Verifier', href: '/verifier', isCurrent: false },
      { label: 'Projects', href: '/verifier', isCurrent: false },
      { label: '456', href: '/verifier/projects/456', isCurrent: true },
    ])
  })

  it('keeps my-projects paths untouched for user routes', () => {
    expect(generateBreadcrumbs('/user/my-projects')).toEqual([
      { label: 'User', href: '/user', isCurrent: false },
      { label: 'My Projects', href: '/user/my-projects', isCurrent: true },
    ])
  })
})

describe('isRoleSegment', () => {
  it('returns true for known role segments', () => {
    expect(isRoleSegment('sponsor')).toBe(true)
    expect(isRoleSegment('user')).toBe(true)
    expect(isRoleSegment('verifier')).toBe(true)
    expect(isRoleSegment('provider')).toBe(true)
  })

  it('returns false for unknown or empty values', () => {
    expect(isRoleSegment('settings')).toBe(false)
    expect(isRoleSegment('')).toBe(false)
    expect(isRoleSegment(undefined)).toBe(false)
  })
})
