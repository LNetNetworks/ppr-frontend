/**
 * Shared constants.
 *
 * Status and type enums are not declared here: they come from the backend
 * through GET /enums, read with getBackendEnumValues in lib/enum-utils.ts.
 * Countries are the exception because the backend does not expose them yet.
 */

// Country/Region options
export const COUNTRY_REGION_OPTIONS = [
  'Regional',
  'Argentina',
  'Bahamas',
  'Barbados',
  'Belice',
  'Bolivia',
  'Brasil',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'El Salvador',
  'Guatemala',
  'Guyana',
  'Haití',
  'Honduras',
  'Jamaica',
  'México',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'República Dominicana',
  'Suriname',
  'Trinidad y Tobago',
  'Uruguay',
  'Venezuela'
] as const
