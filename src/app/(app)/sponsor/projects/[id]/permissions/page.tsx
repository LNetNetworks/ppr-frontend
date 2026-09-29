import { fetchProject, fetchProjectUsers } from '@/lib/api-services-server'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { ProjectDetailsHeader } from '@/components/project-details-header'
import { PermissionsPageClient } from '@/components/permissions-page-client'
import { TrackProjectView } from '@/components/track-project-view'
import type { Project, User } from '@/types/api'

interface PermissionsPageProps {
    params: Promise<{ id: string }>
}

export default async function SponsorPermissionsPage({ params }: PermissionsPageProps) {
    const { id } = await params

    let project: Project | null = null
    let users: User[] = []
    let error: string | null = null

    try {
        project = await fetchProject(id)
        users = await fetchProjectUsers(id)
    } catch (err) {
        console.error('Failed to fetch permissions data:', err)
        error = err instanceof Error ? err.message : 'Failed to load permissions'
    }

    if (error || !project) {
        return (
            <RoleProtectedRoute requiredRole="sponsor">
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <div className="mb-4 text-lg text-red-600 dark:text-red-400">
                            {error || 'Project not found'}
                        </div>
                    </div>
                </div>
            </RoleProtectedRoute>
        )
    }

    return (
        <RoleProtectedRoute requiredRole="sponsor">
            <TrackProjectView project={project} role="sponsor" />
            <PermissionsPageClient 
                users={users} 
                projectId={id}
                emptyMessage="No users found for this project"
                description="Manage user access and permissions for this project. Add collaborators to grant them access, or view and remove existing users. "
            />
        </RoleProtectedRoute>
    )
}

