'use client'

import { Badge } from './badge'
import { useAuth } from '@/hooks/use-auth'

type RoleType = 'user' | 'sponsor' | 'verifier' | 'provider'
type BadgeColor = 'blue' | 'green' | 'amber' | 'purple' | 'indigo'

interface RoleBadgeProps {
  role?: RoleType
  className?: string
}

// Mapping of roles to display names and badge colors
const roleConfig: Record<RoleType, { displayName: string; color: BadgeColor }> = {
  user: {
    displayName: 'User',
    color: 'blue',
  },
  sponsor: {
    displayName: 'Sponsor',
    color: 'green',
  },
  verifier: {
    displayName: 'Verifier',
    color: 'amber',
  },
  provider: {
    displayName: 'Provider',
    color: 'purple',
  },
}

// Get the primary role from user's roles (based on priority)
const getPrimaryRoleFromAuth = (hasRole: (role: string) => boolean): RoleType | null => {
  // Check roles in priority order (same as RoleRedirect)
  if (hasRole('user')) return 'user'
  if (hasRole('verifier')) return 'verifier'
  if (hasRole('sponsor')) return 'sponsor'
  if (hasRole('provider')) return 'provider'
  return null
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { hasRole, isLoading, isAuthenticated } = useAuth()

  // If role is explicitly provided, use it
  if (role) {
    const config = roleConfig[role]
    if (config) {
      return (
        <Badge color={config.color} className={className}>
          {config.displayName}
        </Badge>
      )
    }
  }

  // Otherwise, get role from auth token
  if (isLoading || !isAuthenticated) {
    return null
  }

  const currentRole = getPrimaryRoleFromAuth(hasRole)

  if (!currentRole) {
    return null
  }

  const config = roleConfig[currentRole]

  if (!config) {
    return null
  }

  return (
    <Badge color={config.color} className={className}>
      {config.displayName}
    </Badge>
  )
}

