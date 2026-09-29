export function formatHashPreview(hash: unknown, prefixLength = 4, suffixLength = 6): string {
  if (hash === null || hash === undefined) return ''

  const value = String(hash).trim()
  if (!value) return ''

  if (value.length <= prefixLength + suffixLength) {
    return value
  }

  return `${value.slice(0, prefixLength)}...${value.slice(-suffixLength)}`
}
