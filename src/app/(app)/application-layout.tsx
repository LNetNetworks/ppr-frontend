'use client'

import { Avatar } from '@/components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from '@/components/navbar'
import { NavigationLoadingProvider } from '@/components/navigation-loading'
import { SidebarLayout } from '@/components/sidebar-layout'
import { SponsorSidebar } from '@/components/sidebars/sponsor-sidebar'
import { UserSidebar } from '@/components/sidebars/user-sidebar'
import { VerifierSidebar } from '@/components/sidebars/verifier-sidebar'
import { ProviderSidebar } from '@/components/sidebars/provider-sidebar'
import { usePathname } from 'next/navigation'
import { useKeycloak } from '@react-keycloak/web'
import { useAuth } from '@/hooks/use-auth'

// Mapping function to convert role values to display names
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    user: 'User',
    verifier: 'Verifier',
    sponsor: 'Sponsor',
    provider: 'Provider',
  }
  return roleMap[role.toLowerCase()] || role
}

// Get the current role from pathname or user's actual role
const getCurrentRole = (pathname: string | null, hasRole: (role: string) => boolean): string => {
  if (!pathname) {
    // If on home page, check user's actual roles
    if (hasRole('user')) return 'user'
    if (hasRole('verifier')) return 'verifier'
    if (hasRole('sponsor')) return 'sponsor'
    if (hasRole('provider')) return 'provider'
    return 'sponsor' // default
  }
  if (pathname.startsWith('/sponsor')) return 'sponsor'
  if (pathname.startsWith('/user')) return 'user'
  if (pathname.startsWith('/verifier')) return 'verifier'
  if (pathname.startsWith('/provider')) return 'provider'
  // If on home page, check user's actual roles
  if (pathname === '/') {
    if (hasRole('user')) return 'user'
    if (hasRole('verifier')) return 'verifier'
    if (hasRole('sponsor')) return 'sponsor'
    if (hasRole('provider')) return 'provider'
  }
  return 'sponsor' // default
}

export function ApplicationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { keycloak } = useKeycloak()
  const { hasRole } = useAuth()
  const pathname = usePathname()
  const currentRole = getCurrentRole(pathname, hasRole)

  // Get user info from Keycloak token
  const userDisplayName =
    (keycloak?.tokenParsed?.name as string | undefined) ??
    (keycloak?.tokenParsed?.preferred_username as string | undefined) ??
    'User'

  // Render role-specific sidebar
  // Recent projects are now loaded from localStorage via useRecentProjects hook in each sidebar
  const renderSidebar = () => {
    switch (currentRole) {
      case 'sponsor':
        return <SponsorSidebar />
      case 'user':
        return <UserSidebar />
      case 'verifier':
        return <VerifierSidebar />
      case 'provider':
        return <ProviderSidebar />
      default:
        return <SponsorSidebar />
    }
  }

  return (
    <NavigationLoadingProvider>
      <SidebarLayout
        navbar={
          <Navbar>
            <NavbarSpacer />
            <NavbarSection>
              <Dropdown>
                <DropdownButton as={NavbarItem}>
                  <Avatar seed={userDisplayName} square />
                </DropdownButton>
              </Dropdown>
            </NavbarSection>
          </Navbar>
        }
        sidebar={renderSidebar()}
      >
        {children}
      </SidebarLayout>
    </NavigationLoadingProvider>
  )
}
