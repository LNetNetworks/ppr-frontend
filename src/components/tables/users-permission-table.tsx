'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import HeaderWithSearchBar from '@/components/header-with-search-bar'
import { Input } from '@/components/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { useToast } from '@/components/toast'
import { useApiClient } from '@/lib/api-services'
import type { User } from '@/types/api'
import { useMemo, useState } from 'react'

interface UsersTableProps {
  users: User[]
  isLoading?: boolean
  emptyMessage?: string
  projectId?: string
  description?: string
  onUsersChanged?: () => void | Promise<void>
}

/**
 * Reusable Users Table Component
 * Displays a list of users in a table format
 */
export function UsersTable({
  users,
  isLoading = false,
  emptyMessage = 'No users found',
  projectId,
  description,
  onUsersChanged,
}: UsersTableProps) {
  const api = useApiClient()
  const { error: showError } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [emailConfirmation, setEmailConfirmation] = useState('')

  // Find the user being deleted
  const deletingUser = useMemo(() => {
    if (!deletingUserId) return null
    return users.find((user) => user.id === deletingUserId) || null
  }, [deletingUserId, users])

  // Check if entered email matches the user's email
  const emailMatches = deletingUser?.mail && emailConfirmation.trim().toLowerCase() === deletingUser.mail.toLowerCase()

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users
    }

    const query = searchQuery.toLowerCase().trim()
    return users.filter((user) => {
      const username = user.username?.toLowerCase() || ''
      const mail = user.mail?.toLowerCase() || ''
      const type = user.type?.toLowerCase() || ''
      const id = user.id?.toLowerCase() || ''

      return username.includes(query) || mail.includes(query) || type.includes(query) || id.includes(query)
    })
  }, [users, searchQuery])

  const renderTable = () => {
    if (isLoading) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Username</TableHeader>
              <TableHeader>Mail</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                Loading users...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (filteredUsers.length === 0) {
      return (
        <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>ID</TableHeader>
              <TableHeader>Username</TableHeader>
              <TableHeader>Mail</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-500">
                {searchQuery ? `No users found matching "${searchQuery}"` : emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    return (
      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Username</TableHeader>
            <TableHeader>Mail</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Date</TableHeader>
            <TableHeader></TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredUsers.map((user) => {
            return (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-sm">{user.id}</TableCell>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell className="text-zinc-500">{user.mail}</TableCell>
                <TableCell>
                  {user.type ? (
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                      {user.type}
                    </span>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-zinc-500">
                  {user.date
                    ? new Date(user.date).toLocaleDateString()
                    : user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                  <div
                    className="relative z-10 flex min-h-[2.5rem] items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Deletion disabled by request. See docs/DEUDA-TECNICA.md */}
                    {/* 
                    <Button
                      plain
                      aria-label="Delete user"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingUserId(user.id)
                        setEmailConfirmation('')
                        setDeleteConfirmOpen(true)
                      }}
                      disabled={!projectId}
                      className="p-1.5"
                    >
                      <TrashIcon className="size-4 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" />
                    </Button>
                    */}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  return (
    <>
      <HeaderWithSearchBar
        title="Permissions"
        placeholder="Search users"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        description={description}
      />
      {renderTable()}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteConfirmOpen(false)
            setDeletingUserId(null)
            setEmailConfirmation('')
          }
        }}
      >
        <DialogTitle>Remove User</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Are you sure you want to remove <b>{deletingUser?.mail}</b> from the project?
            </p>
            {deletingUser && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  To confirm, please enter the user's email address:
                </p>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={emailConfirmation}
                  onChange={(e) => setEmailConfirmation(e.target.value)}
                  disabled={isDeleting}
                  className="w-full"
                  autoFocus
                />
                {emailConfirmation && !emailMatches && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Email does not match. Please enter the correct email address.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            type="button"
            outline
            onClick={() => {
              setDeleteConfirmOpen(false)
              setDeletingUserId(null)
              setEmailConfirmation('')
              setIsDeleting(false)
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            color="red"
            onClick={async () => {
              if (!deletingUserId || !projectId || !emailMatches) return

              setIsDeleting(true)
              try {
                // Delete the project member using id_project_user
                await api.delete(`/projects/${projectId}/members/${deletingUserId}`)
                setDeleteConfirmOpen(false)
                setDeletingUserId(null)
                setEmailConfirmation('')
                setIsDeleting(false)
                await onUsersChanged?.()
              } catch (error) {
                console.error('Failed to remove user:', error)
                showError(error instanceof Error ? error.message : 'Failed to remove user')
                setIsDeleting(false)
              }
            }}
            disabled={isDeleting || deletingUserId === null || !projectId || !emailMatches}
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
