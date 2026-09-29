import type { EnumValue, EnumsResponse } from '@/types/api'

export interface BackendEnumOption {
  key: string
  value: string
  label: string
}

function normalizeEnumName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeEnumToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function humanizeEnumLabel(value: string): string {
  if (!value) return ''
  if (/^[A-Z0-9_]+$/.test(value)) {
    return value.replace(/_/g, ' ')
  }

  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function resolveEnumBagKey(
  enums: EnumsResponse,
  enumName: string
): string | null {
  const normalizedKeys = new Map<string, string>()

  Object.keys(enums).forEach((key) => {
    normalizedKeys.set(normalizeEnumName(key), key)
  })

  return normalizedKeys.get(normalizeEnumName(enumName)) || null
}

export function getBackendEnumOptions(
  enums: EnumsResponse | null | undefined,
  enumName: string
): BackendEnumOption[] {
  if (!enums) return []

  const matchedEnumKey = resolveEnumBagKey(enums, enumName)
  if (!matchedEnumKey) return []

  const enumItems = enums[matchedEnumKey]
  if (!Array.isArray(enumItems)) return []

  const seenValues = new Set<string>()
  const options: BackendEnumOption[] = []

  enumItems.forEach((item: EnumValue) => {
    const value = normalizeEnumToken(item.value) || normalizeEnumToken(item.key)
    if (!value) return

    const dedupeKey = value.toLowerCase()
    if (seenValues.has(dedupeKey)) return
    seenValues.add(dedupeKey)

    const key = normalizeEnumToken(item.key) || value
    const label = normalizeEnumToken(item.label) || humanizeEnumLabel(key) || humanizeEnumLabel(value)
    options.push({ key, value, label })
  })

  return options
}

export function getBackendEnumValues(
  enums: EnumsResponse | null | undefined,
  enumName: string
): string[] {
  return getBackendEnumOptions(enums, enumName).map((option) => option.value)
}
