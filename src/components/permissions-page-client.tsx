"use client"

import { useToast } from '@/components/toast'
import { useCallback, useEffect, useState } from 'react'
import { UsersTable } from './tables/users-permission-table'
import { AddCollaboratorModal } from './add-collaborator-modal'
import { Button } from './button'
import { PlusIcon } from '@heroicons/react/16/solid'
import { useAddProjectMember, useFetchProjectMembers, type UserSearchResult } from '@/lib/api-services'
import type { User } from '@/types/api'

interface PermissionsPageClientProps {
  users: User[]
  projectId: string
  emptyMessage?: string
  description?: string
}

export function PermissionsPageClient({
  users,
  projectId,
  emptyMessage = 'No users found for this project',
  description,
}: PermissionsPageClientProps) {
  const addProjectMember = useAddProjectMember()
  const fetchProjectMembers = useFetchProjectMembers()
  const { success: showSuccess, error: showError } = useToast()
  const [projectUsers, setProjectUsers] = useState<User[]>(users)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    setProjectUsers(users)
  }, [users])

  const reloadProjectUsers = useCallback(async () => {
    const latestUsers = await fetchProjectMembers(projectId)
    setProjectUsers(latestUsers)
  }, [fetchProjectMembers, projectId])

  const handleAddCollaborator = async (user: UserSearchResult) => {
    try {
      setIsAdding(true)
      const userId = user.id_user || user.id

      if (!userId) {
        console.error('User ID is missing')
        setIsAdding(false)
        return
      }

      // Debug: Log the values to verify they're correct
      console.log('Adding collaborator:', { projectId, userId, user })

      // Ensure we're passing the correct arguments: (projectId, userId)
      await addProjectMember(projectId, userId)

      // Close modal and refresh users list without reloading the route
      setIsModalOpen(false)
      await reloadProjectUsers()
      showSuccess('Collaborator added successfully!')
    } catch (error) {
      console.error('Failed to add collaborator:', error)
      showError(error instanceof Error ? error.message : 'Failed to add collaborator')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          color="blue"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="size-4" />
          Add collaborator
        </Button>
      </div>
      <UsersTable
        users={projectUsers}
        emptyMessage={emptyMessage}
        projectId={projectId}
        description={description}
        onUsersChanged={reloadProjectUsers}
      />
      <AddCollaboratorModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={projectId}
        onAddCollaborator={handleAddCollaborator}
        isAdding={isAdding}
      />
    </>
  )
}
