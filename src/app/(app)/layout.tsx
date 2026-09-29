import { ProtectedLayout } from './protected-layout'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Recent projects are now tracked in localStorage via useRecentProjects hook
  // No server-side fetching needed
  return <ProtectedLayout>{children}</ProtectedLayout>
}
