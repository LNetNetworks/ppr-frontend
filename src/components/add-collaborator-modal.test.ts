import { describe, expect, it } from 'vitest'
import { formatCollaboratorDisplayName } from './add-collaborator-modal'

describe('formatCollaboratorDisplayName', () => {
  it('appends the role to the full name when available', () => {
    expect(
      formatCollaboratorDisplayName({
        id: '1',
        name: 'Ana',
        surname: 'Lopez',
        email: 'ana@example.com',
        role: 'provider',
      })
    ).toBe('Ana Lopez (provider)')
  })

  it('falls back to the email when the user has no name', () => {
    expect(
      formatCollaboratorDisplayName({
        id: '2',
        name: '',
        surname: '',
        email: 'ana@example.com',
        role: 'sponsor',
      })
    ).toBe('ana@example.com (sponsor)')
  })

  it('omits the role suffix when it is not present', () => {
    expect(
      formatCollaboratorDisplayName({
        id: '3',
        name: 'Ana',
        surname: 'Lopez',
        email: 'ana@example.com',
      })
    ).toBe('Ana Lopez')
  })
})
