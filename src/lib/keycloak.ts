import Keycloak from 'keycloak-js'
import { config } from './config'

export const keycloakConfig = {
  get url() {
    return config.keycloakUrl()
  },
  get realm() {
    return config.keycloakRealm()
  },
  get clientId() {
    return config.keycloakClientId()
  },
}

export function createKeycloakClient() {
  return new Keycloak({
    url: keycloakConfig.url,
    realm: keycloakConfig.realm,
    clientId: keycloakConfig.clientId,
  })
}

export const keycloakInitOptions = {
  onLoad: 'check-sso' as const,
  checkLoginIframe: false,
  pkceMethod: 'S256' as const,
}
