'use client'

import { useApiClient } from './api-services'
import { useAuth } from '@/hooks/use-auth'
import type { ApiResponse, User } from '@/types/api'

const ROLE_PRIORITY = ['user', 'verifier', 'sponsor', 'provider'] as const

function resolveUserTypeFromJwt(roles: string[]): string {
    const normalizedRoles = roles
        .filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
        .map((role) => role.trim().toLowerCase())

    const primaryRole = ROLE_PRIORITY.find((role) => normalizedRoles.includes(role)) || normalizedRoles[0]

    return primaryRole || 'user'
}

/**
 * Hook that returns functions to handle user data
 */
export function useUserService() {
    const api = useApiClient()
    const { roles } = useAuth()

    /**
     * Fetch a user by ID
     */
    const fetchUserById = async (id: string): Promise<User> => {
        const response = await api.get<ApiResponse<User>>(`/users/${id}`)
        if (response && response.data) {
            return response.data
        }
        throw new Error('User not found')
    }

    /**
     * Update a user by ID
     */
    const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
        const response = await api.put<ApiResponse<User>>(`/users/${id}`, data)
        if (response && response.data) {
            return response.data
        }
        throw new Error('Failed to update user')
    }

    /**
     * Sync the current user with the backend
     */
    const syncUser = async (): Promise<User> => {
        const userType = resolveUserTypeFromJwt(roles)
        const response = await api.post<any>('/users/sync', {
            role: userType,
            type_user: userType,
        })

        if (response && (response.ok || response.Success)) {
            console.log('User synced successfully:', response.data)
            return response.data
        }
        throw new Error('Failed to sync user')
    }

    return {
        fetchUserById,
        updateUser,
        syncUser,
    }
}
