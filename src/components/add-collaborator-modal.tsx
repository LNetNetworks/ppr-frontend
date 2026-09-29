'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { useSearchUsersByEmail, type UserSearchResult } from '@/lib/api-services'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'

interface AddCollaboratorModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  onAddCollaborator?: (user: UserSearchResult) => void
  isAdding?: boolean
}

export const formatCollaboratorDisplayName = (user: UserSearchResult) => {
  const fullName = [user.name, user.surname].filter(Boolean).join(' ')
  const baseName = fullName || user.email || user.user_email || 'user'
  const role = user.role?.trim()

  return role ? `${baseName} (${role})` : baseName
}

export function AddCollaboratorModal({
  open,
  onClose,
  projectId,
  onAddCollaborator,
  isAdding = false,
}: AddCollaboratorModalProps) {
  const searchUsersByEmail = useSearchUsersByEmail()
  const searchUsersByEmailRef = useRef(searchUsersByEmail)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset state when modal is opened or closed
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSearchQuery('')
        setSearchResults([])
        setSelectedUser(null)
        setShowConfirmation(false)
        setError(null)
      }, 300) // Delay reset until after close animation
      return () => clearTimeout(timer)
    }
  }, [open])

  // Keep the ref updated with the latest function
  useEffect(() => {
    searchUsersByEmailRef.current = searchUsersByEmail
  }, [searchUsersByEmail])

  // Debounce search - only trigger when searchQuery changes
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setError(null)

    timeoutRef.current = setTimeout(async () => {
      try {
        const email = searchQuery.trim()
        // Use ref to get the latest function without causing re-renders
        const users = await searchUsersByEmailRef.current(email)

        setSearchResults(users)
        setError(null) // Clear any previous errors
        setIsSearching(false)
      } catch (err: any) {
        // Log error for debugging but don't show to user
        console.error('Failed to search users:', err)
        setSearchResults([])
        // Always clear error - just show "no results" instead of error message
        setError(null)
        setIsSearching(false)
      } finally {
        timeoutRef.current = null
      }
    }, 500) // 500ms debounce - wait for user to stop typing

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setIsSearching(false)
    }
  }, [searchQuery]) // Only depend on searchQuery

  const handleUserSelect = useCallback((user: UserSearchResult) => {
    setSelectedUser(user)
    setShowConfirmation(true)
    setSearchQuery('')
    setSearchResults([])
  }, [])

  const handleConfirmAdd = useCallback(() => {
    if (selectedUser && !isAdding) {
      const userId = selectedUser.id_user || selectedUser.id
      if (userId) {
        onAddCollaborator?.(selectedUser)
        // Modal closing is handled by parent component after successful API call
      }
    }
  }, [selectedUser, onAddCollaborator, isAdding])

  const handleClose = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedUser(null)
    setShowConfirmation(false)
    setError(null)
    onClose()
  }, [onClose])

  const displayEmail = (user: UserSearchResult) => {
    return user.user_email || user.email || ''
  }

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      {!showConfirmation ? (
        <>
          <DialogTitle>Add collaborator</DialogTitle>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Search for a user by email address or partial email to add them as a provider for this project.
              </p>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <MagnifyingGlassIcon className="size-5 text-zinc-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Searching...</div>
                </div>
              )}

              {!isSearching && !error && searchQuery.trim() && searchResults.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    No users found matching &quot;{searchQuery}&quot;
                  </div>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 dark:border-white/10">
                  <div className="divide-y divide-zinc-200 dark:divide-white/10">
                    {searchResults.map((user) => {
                      const email = displayEmail(user)
                      const name = formatCollaboratorDisplayName(user)
                      return (
                        <button
                          key={user.id || user.id_user}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className={clsx(
                            'w-full px-4 py-3 text-left transition-colors',
                            'hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
                            'focus:bg-zinc-50 dark:focus:bg-zinc-800/50 focus:outline-none cursor-pointer'
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">{name}</span>
                            {email && (
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">{email}</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={handleClose}>
              Cancel
            </Button>
          </DialogActions>
        </>
      ) : selectedUser ? (
        <>
          <DialogTitle>Confirm adding collaborator</DialogTitle>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Do you want to add{" "}
                <strong className="text-zinc-900 dark:text-white">
                  {formatCollaboratorDisplayName(selectedUser)} ({displayEmail(selectedUser)})
                </strong>{" "}
                as a provider for this project?
              </p>

            </div>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setShowConfirmation(false)}>
              Cancel
            </Button>
            <Button color="blue" onClick={handleConfirmAdd} disabled={isAdding}>
              {isAdding ? 'Adding...' : 'Add collaborator'}
            </Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
  )
}
