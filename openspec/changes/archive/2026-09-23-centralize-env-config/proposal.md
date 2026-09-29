## Why

La lectura del entorno está repartida en **6 archivos con 11 accesos a `process.env`** y **3 archivos que leen
`window.__ENV`**. El mismo valor circula bajo tres nombres (`API_URL`, `NEXT_PUBLIC_API_URL`,
`window.__ENV.API_URL`), y `app-config.ts` carga una tabla de traducción (`RUNTIME_ENV_KEYS`) cuyo único propósito es
mapear unos contra otros.

El resultado es que nadie puede responder "¿qué variables necesita este proyecto?" sin leer cinco archivos, y que cada
uno resuelve la cascada cliente/servidor a su manera. Ya produjo defectos concretos: `keycloak.ts` devuelve `''` en
servidor sin avisar, y `'ppr-api-client'` quedó hardcodeado en `azp-conditional.tsx` porque desde ahí no había forma
limpia de leer la variable.

Este cambio hace lo que `ConfigModule` hace en Nest o `environment.ts` en Angular: no elimina la complejidad de tener
dos runtimes, la **encierra en un solo lugar**.

## What Changes

### Crear `src/lib/config.ts`

El único archivo del repositorio que lee el entorno. Contiene:

- Un objeto con los accesos literales a `process.env.NEXT_PUBLIC_*` (obligatoriamente literales, ver diseño D1)
- El acceso a `window.__ENV` para valores de runtime en navegador
- El acceso a `process.env` dinámico, bajo guarda de servidor
- Un alias por variable que resuelve la cascada de fuentes, con las 8 claves actuales: `API_URL`, `KEYCLOAK_URL`,
  `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `WEBSITE_TITLE`, `INSTANCE_NAME`, `SIDEBAR_LOGO`, `SHOW_IMPORT_EVIDENCE`,
  más `NODE_ENV`

### Crear `src/lib/config.server.ts`

Separado porque importa `node:fs`, que no puede entrar en el bundle del navegador. Absorbe la lectura de
`public/env.js` que hoy hace `server-public-env.ts`, y reexporta lo de `config.ts` para que el código de servidor
tenga un solo import.

### Migrar los 6 archivos que hoy leen el entorno

| Archivo | Qué deja de hacer |
|---|---|
| [`src/lib/api-config.ts`](../../../src/lib/api-config.ts) | `process.env[key]` y `window.__ENV`; pasa a usar el alias |
| [`src/lib/keycloak.ts`](../../../src/lib/keycloak.ts) | su propio `getEnv` sobre `window.__ENV` |
| [`src/lib/app-config.ts`](../../../src/lib/app-config.ts) | `RUNTIME_ENV_KEYS`, la cadena de ternarios y `getRuntimeEnv`; conserva solo las validaciones |
| [`src/lib/server-public-env.ts`](../../../src/lib/server-public-env.ts) | el `readFileSync` y el parseo, que se mudan a `config.server.ts` |
| [`src/lib/api.ts`](../../../src/lib/api.ts) | los `process.env` del `console.log` de diagnóstico |
| [`src/lib/api-services.ts`](../../../src/lib/api-services.ts) y [`api-services-server.ts`](../../../src/lib/api-services-server.ts) | `process.env.NODE_ENV` |

Los 8 consumidores (`api-client.ts`, `api.ts`, `keycloak-provider.tsx`, `use-auth.ts`, `login/page.tsx`,
`use-branding.ts`, `logo.tsx`, `layout.tsx`) siguen importando los mismos módulos con la misma API pública. No se
tocan.

### Crear `.env.example`

Las 8 claves con su descripción y sin valores reales. Deja de ser adivinanza levantar el proyecto en local, y
`CONTRIBUTING.md` puede volver a documentar el paso que hoy está marcado como pendiente.

### Corregir `'ppr-api-client'` hardcodeado

[`src/components/azp-conditional.tsx`](../../../src/components/azp-conditional.tsx) fija ese literal como valor por
defecto de `expectedAzp`. Es el mismo valor que `KEYCLOAK_CLIENT_ID`. Con `config.ts` disponible pasa a leerlo de ahí.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Los valores, las fuentes, el orden de la cascada y el comportamiento en runtime quedan idénticos: cambia
**desde dónde se leen**, no **qué se lee**. El cambio declara `skip_specs: true` en su `.openspec.yaml`.

## Non-goals

- **No se cambia el mecanismo de configuración en runtime.** `public/env.js` y `window.__ENV` siguen siendo la fuente
  para el navegador. La promoción de una única imagen entre `develop`, `staging` y `main` es un requisito confirmado
  del equipo y este cambio lo respeta íntegramente.
- **No se convierte ninguna ruta de estática a dinámica**, ni se toca `next.config.mjs`, el `Dockerfile` ni el
  pipeline.
- **No se migra a Server Components con context**, que es lo que Next recomienda para configuración de runtime.
  Requiere refactorizar `logo.tsx`, `use-branding.ts` y `keycloak-provider.tsx`, y está explícitamente fuera de
  alcance.
- **No se unifica la nomenclatura de las 8 claves.** Los tres nombres por valor siguen existiendo dentro de
  `config.ts`, que es precisamente donde deben quedar confinados.
- **No se arregla el build roto** de `/forgot-password` y `/register`. Sigue haciendo falta pasar las `NEXT_PUBLIC_*`
  en tiempo de build; `.env.example` solo lo documenta.

## Impact

**Roles afectados: ninguno.** No se toca ninguna superficie de UI de `sponsor`, `provider`, `user` ni `verifier`.

| Área | Impacto |
|---|---|
| Archivos nuevos | `src/lib/config.ts`, `src/lib/config.server.ts`, `.env.example` |
| Archivos modificados | 6 lectores de entorno + `azp-conditional.tsx` |
| Consumidores | Sin cambios: la API pública de cada módulo se conserva |
| Runtime | Idéntico. Mismas fuentes, misma cascada, mismo `public/env.js` |
| Build | Sin cambios en qué rutas son estáticas o dinámicas |
| Pipeline y Docker | Sin cambios |
| Tests | `api-config.test.ts`, `server-public-env.test.ts` y `keycloak.test.ts` cubren estos módulos y deben seguir pasando sin modificarse. Son la red de seguridad del cambio |

**Riesgo principal:** romper la cascada de fuentes en algún caso borde —por ejemplo que un valor que hoy resuelve por
`process.env` pase a resolver por `window.__ENV` o viceversa— y que el síntoma aparezca solo en un entorno. Lo mitiga
que los tres módulos con lógica de cascada ya tienen tests.
