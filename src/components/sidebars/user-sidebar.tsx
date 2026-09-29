'use client'

import { Avatar } from '@/components/avatar'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/dropdown'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
  SidebarGroup,
  SidebarGroupButton,
  SidebarSubItem,
} from '@/components/sidebar'
import {
  ArrowRightStartOnRectangleIcon,
  ChevronUpIcon,
} from '@heroicons/react/16/solid'
import {
  Cog6ToothIcon,
  HomeIcon,
  Square2StackIcon,
  ListBulletIcon,
  DocumentTextIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'
import { useKeycloak } from '@react-keycloak/web'
import { RoleBadge } from '@/components/role-badge'
import { useBranding } from '@/hooks/use-branding'

function AccountDropdownMenu({ anchor }: { anchor: 'top start' | 'bottom end' }) {
  const { keycloak } = useKeycloak()

  const handleLogout = () => {
    if (keycloak) {
      keycloak.logout({
        redirectUri: window.location.origin,
      })
    }
  }

  return (
    <DropdownMenu className="min-w-64" anchor={anchor}>
      <DropdownItem onClick={handleLogout}>
        <ArrowRightStartOnRectangleIcon />
        <DropdownLabel>Sign out</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  )
}

export function UserSidebar() {
  const { keycloak } = useKeycloak()
  const { sidebarLogo } = useBranding()
  const pathname = usePathname()

  const rolePrefix = '/user'

  // Check if we're on a project detail page
  const projectDetailMatch = pathname?.match(/^\/user\/projects\/([^/]+)/)
  const isOnProjectDetail = !!projectDetailMatch
  const projectId = projectDetailMatch?.[1]

  // Get user info from Keycloak token
  const userDisplayName =
    (keycloak?.tokenParsed?.name as string | undefined) ??
    (keycloak?.tokenParsed?.preferred_username as string | undefined) ??
    'User'
  const userEmail =
    (keycloak?.tokenParsed?.email as string | undefined) ?? 'user@example.com'

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="w-full">
          <img src={sidebarLogo} alt="Sidebar logo" className="block h-auto w-full object-contain" />
        </div>
        <div className="mt-3 flex justify-center">
          <RoleBadge />
        </div>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          <SidebarItem href="/user" current={pathname === '/user'}>
            <HomeIcon />
            <SidebarLabel>Home</SidebarLabel>
          </SidebarItem>
          {isOnProjectDetail && projectId ? (
            <SidebarGroup
              defaultOpen={true}
              button={
                <SidebarGroupButton
                  icon={<Square2StackIcon data-slot="icon" />}
                  href={`${rolePrefix}/projects/${projectId}`}
                  current={isOnProjectDetail}
                >
                  My Projects
                </SidebarGroupButton>
              }
            >
              <SidebarSubItem
                href={`${rolePrefix}/projects/${projectId}`}
                current={pathname === `${rolePrefix}/projects/${projectId}`}
              >
                <ListBulletIcon data-slot="icon" />
                <SidebarLabel>Stages</SidebarLabel>
              </SidebarSubItem>
              <SidebarSubItem
                href={`${rolePrefix}/projects/${projectId}/evidences`}
                current={pathname === `${rolePrefix}/projects/${projectId}/evidences`}
              >
                <DocumentTextIcon data-slot="icon" />
                <SidebarLabel>Evidences</SidebarLabel>
              </SidebarSubItem>
            </SidebarGroup>
          ) : (
            <SidebarItem href="/user/my-projects" current={pathname === '/user/my-projects'}>
              <Square2StackIcon />
              <SidebarLabel>My Projects</SidebarLabel>
            </SidebarItem>
          )}
          <SidebarItem href="/settings" current={pathname?.startsWith('/settings')}>
            <Cog6ToothIcon />
            <SidebarLabel>Settings</SidebarLabel>
          </SidebarItem>
        </SidebarSection>

        <SidebarSpacer />
      </SidebarBody>

      <SidebarFooter className="max-lg:hidden">
        <Dropdown>
          <DropdownButton as={SidebarItem}>
            <span className="flex min-w-0 items-center gap-3">
              <Avatar seed={userDisplayName} className="size-10" square alt="" />
              <span className="min-w-0">
                <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                  {userDisplayName}
                </span>
                <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                  {userEmail}
                </span>
              </span>
            </span>
            <ChevronUpIcon />
          </DropdownButton>
          <AccountDropdownMenu anchor="top start" />
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  )
}
