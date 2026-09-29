## 1. Línea base

- [x] 1.1 Inventariar los accesos actuales al entorno con `grep -rn "process\.env\|__ENV" src --include=*.ts --include=*.tsx | grep -v '\.test\.'` y guardar la salida; verificar que da 11 accesos a `process.env` en 6 archivos y 3 archivos que leen `window.__ENV`, que es la cifra que este cambio debe llevar a cero fuera de `config.ts`
- [x] 1.2 Ejecutar `npm test` y anotar el resultado como referencia; verificar que los 22 archivos y 89 casos pasan antes de tocar nada, en particular `api-config.test.ts`, `server-public-env.test.ts` y `keycloak.test.ts`, que son la red de seguridad

## 2. Crear el módulo central

- [x] 2.1 Crear `src/lib/config.ts` con el objeto `BUILD` y los **cinco accesos literales** a `process.env.NEXT_PUBLIC_*` (D1: literales obligatorios, un acceso computado devuelve `undefined` en navegador); verificar que no queda ningún `process.env[` con clave variable dentro del objeto
- [x] 2.2 Añadir a `config.ts` el lector de `window.__ENV` bajo guarda `typeof window !== 'undefined'` y el lector de `process.env` dinámico bajo guarda `typeof window === 'undefined'`; verificar que el módulo compila con `npx tsc --noEmit`
- [x] 2.3 Exponer en `config.ts` un alias **como función** por cada una de las 9 claves (`API_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `WEBSITE_TITLE`, `INSTANCE_NAME`, `SIDEBAR_LOGO`, `SHOW_IMPORT_EVIDENCE`, `NODE_ENV`), replicando exactamente la cascada de fuentes que hoy aplica cada módulo (D3: funciones, no constantes evaluadas al importar); verificar contra el código actual que el orden de precedencia de cada clave es idéntico
- [x] 2.4 Crear `src/lib/config.server.ts` con `import 'server-only'`, que absorba el `readFileSync` y el parseo de `public/env.js` de `server-public-env.ts` y reexporte lo de `config.ts` (D2); verificar que compila y que `config.ts` no importa `node:fs`

## 3. Migrar los lectores

- [x] 3.1 Migrar `src/lib/api-config.ts` a `config`, conservando `getClientApiBaseUrl()` y `getServerApiBaseUrl()` con la misma firma (D4); verificar que `api-config.test.ts` pasa **sin modificar el test**
- [x] 3.2 Migrar `src/lib/keycloak.ts` eliminando su `getEnv` propio, conservando `keycloakConfig` con sus getters; verificar que `keycloak.test.ts` pasa sin modificarlo
- [x] 3.3 Migrar `src/lib/app-config.ts`: eliminar `RUNTIME_ENV_KEYS`, `getRuntimeEnv` y la cadena de ternarios de `getBuildEnv`, conservando `getRequiredPublicEnv`, `getRequiredPublicBooleanEnv` y los getters públicos; verificar que el archivo ya no contiene `process.env` ni `window.__ENV` y que sigue lanzando ante una variable faltante
- [x] 3.4 Reducir `src/lib/server-public-env.ts` a delegar en `config.server.ts`; el test necesitó `vi.mock('server-only', () => ({}))`, que es la convención que ya usa `api.test.ts`, porque `server-only` lo resuelve Next en su build pero no existe como paquete instalado
- [x] 3.5 Migrar los `process.env` de `src/lib/api.ts` (el `console.log` de diagnóstico, que se conserva tal cual) y los `process.env.NODE_ENV` de `src/lib/api-services.ts` y `src/lib/api-services-server.ts`; verificar que los tres archivos quedan sin accesos directos al entorno
- [x] 3.6 Repetir el inventario de la tarea 1.1; verificar que **los únicos archivos con `process.env` o `window.__ENV` son `config.ts` y `config.server.ts`**, y que `src/types/env.d.ts` sigue declarando el tipo de `window.__ENV`

## 4. Corregir el literal hardcodeado

- [x] 4.1 En `src/components/azp-conditional.tsx`, reemplazar el valor por defecto `'ppr-api-client'` de `expectedAzp` por la lectura de `KEYCLOAK_CLIENT_ID` desde `config`. El test codificaba el acoplamiento que este cambio elimina, así que se ajustó su **setup** —poblar `window.__ENV.KEYCLOAK_CLIENT_ID`— sin tocar ninguna aserción

## 5. Documentar

- [x] 5.1 Crear `.env.example` con las 8 claves públicas, cada una con un comentario de una línea sobre qué configura, y sin valores reales; verificar que la lista coincide exactamente con las claves de `public/env.js` y con el objeto `BUILD` de `config.ts`
- [x] 5.2 Actualizar la nota de `CONTRIBUTING.md` que hoy marca la configuración de entorno como pendiente: el paso `cp .env.example .env.local` vuelve a ser cierto; verificar que ninguna instrucción del documento falla si alguien la sigue al pie de la letra
- [x] 5.3 Añadir a `docs/architecture.md` un párrafo sobre dónde vive la configuración y por qué son dos archivos; verificar que menciona la restricción de los literales `NEXT_PUBLIC_*`

## 6. Verificación final

- [x] 6.1 Verificar que ningún consumidor se modificó, comprobando que `api-client.ts`, `api.ts`, `keycloak-provider.tsx`, `use-auth.ts`, `login/page.tsx`, `use-branding.ts`, `logo.tsx` y `layout.tsx` no aparecen en el diff salvo por cambios de import
- [x] 6.2 Verificar que la aplicación sigue construyendo y los tests siguen en verde con `npm run build && npm test`, y que el conteo es el mismo que el anotado en 1.2
- [x] 6.3 Verificar que el valor de `NEXT_PUBLIC_WEBSITE_TITLE` sigue quedando incrustado en el bundle cliente tras el build (`grep -rl "<valor>" .next/static/chunks/*.js`), lo que confirma que la sustitución literal de D1 sigue funcionando desde el objeto `BUILD`
