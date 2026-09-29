export interface BreadcrumbItem {
  label: string
  href: string
  isCurrent: boolean
}

// Route segment to human-readable label mapping
const ROUTE_LABELS: Record<string, string> = {
  sponsor: 'Sponsor',
  user: 'User',
  verifier: 'Verifier',
  provider: 'Provider',
  projects: 'Projects',
  'my-projects': 'My Projects',
  settings: 'Settings',
  stages: 'Stages',
  tasks: 'Tasks',
  evidences: 'Evidences',
  permissions: 'Permissions',
  events: 'Events',
  orders: 'Orders',
}

export const ROLE_SEGMENTS = ['sponsor', 'user', 'verifier', 'provider']

const PROJECT_LIST_BY_ROLE: Record<string, string> = {
  sponsor: '/sponsor/my-projects',
  user: '/user/my-projects',
  provider: '/provider/my-projects',
  verifier: '/verifier',
}

export function isRoleSegment(segment?: string): boolean {
  if (!segment) return false
  return ROLE_SEGMENTS.includes(segment)
}

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (!pathname || pathname === '/') return []

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  segments.forEach((segment, index) => {
    const roleSegment = segments[0]
    const shouldUseProjectListRoute =
      index === 1 && segment === 'projects' && Boolean(PROJECT_LIST_BY_ROLE[roleSegment])

    const href = shouldUseProjectListRoute
      ? PROJECT_LIST_BY_ROLE[roleSegment]
      : '/' + segments.slice(0, index + 1).join('/')
    const isCurrent = index === segments.length - 1
    const label = ROUTE_LABELS[segment] || segment

    breadcrumbs.push({ label, href, isCurrent })
  })

  return breadcrumbs
}
