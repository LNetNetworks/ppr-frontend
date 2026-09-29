/**
 * API Configuration
 * Client reads from runtime env.js; server reads from process env.
 * Both resolve through the centralized config module.
 */
import { config } from './config'

export function getClientApiBaseUrl(): string {
  return config.apiUrlClient()
}

export function getServerApiBaseUrl(): string {
  return config.apiUrlServer()
}
