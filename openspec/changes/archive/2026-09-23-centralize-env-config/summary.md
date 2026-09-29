# Resumen — centralize-env-config

## Qué se hizo

La lectura del entorno estaba repartida en **11 accesos a `process.env` en 6 archivos** y **3 archivos leyendo
`window.__ENV`**, con el mismo valor circulando bajo tres nombres y una tabla de traducción (`RUNTIME_ENV_KEYS`) cuyo
único propósito era mapear unos contra otros.

Ahora hay dos archivos y ninguno más toca el entorno:

| Archivo | Alcance |
|---|---|
| `src/lib/config.ts` | Isomórfico. Literales `NEXT_PUBLIC_*`, `window.__ENV` y `process.env` bajo guarda de servidor |
| `src/lib/config.server.ts` | Solo servidor (`server-only`). Lee `public/env.js` del disco con `node:fs` |

Los 6 lectores pasan a importar alias desde `config`. La API pública de cada módulo se conserva intacta, así que los
8 consumidores (`api-client.ts`, `keycloak-provider.tsx`, `use-auth.ts`, `logo.tsx`, `use-branding.ts`,
`login/page.tsx`, `layout.tsx`) no se tocaron.

Efectos secundarios: `app-config.ts` bajó de 77 a 57 líneas al perder la tabla de traducción y la cadena de
ternarios; `api-config.ts` bajó de 28 a 14.

También se corrigió el literal `'ppr-api-client'` que estaba hardcodeado en `azp-conditional.tsx` contra el valor de
`KEYCLOAK_CLIENT_ID`, y se añadió `.env.example` documentando las 8 claves.

## Por qué

Nadie podía responder "qué variables necesita este proyecto" sin leer cinco archivos, y cada uno resolvía la cascada
cliente/servidor a su manera. Eso ya había producido defectos concretos: `keycloak.ts` devolvía `''` en servidor sin
avisar, y el `azp` quedó hardcodeado porque desde ese componente no había forma limpia de leer la variable.

El mecanismo de runtime **no cambió**: `public/env.js` y `window.__ENV` siguen siendo la fuente para el navegador,
porque la promoción de una única imagen entre `develop`, `staging` y `main` es un requisito del equipo.

## Desvíos respecto del plan

**Los accesos de `BUILD` son getters, no propiedades.** El diseño (D1) pedía un objeto con accesos literales.
`api-config.test.ts` muta `process.env.NEXT_PUBLIC_API_URL` dentro del test y luego llama a la función, así que un
objeto evaluado al importar el módulo lo habría roto. Los getters conservan el literal —requisito para que Next lo
sustituya en el build, verificado en la tarea 6.3— y difieren la evaluación.

**`server-public-env.test.ts` necesitó `vi.mock('server-only', () => ({}))`.** `server-only` lo resuelve Next durante
su build pero no existe como paquete instalado, así que vitest no puede cargar ningún archivo que lo importe. Es la
convención que `api.test.ts` ya usaba en el mismo directorio.

**`azp-conditional.test.tsx` cambió su setup.** El test codificaba el acoplamiento que este cambio elimina: afirmaba
que el valor por defecto correcto era el literal. Se ajustó el setup para poblar `window.__ENV.KEYCLOAK_CLIENT_ID`;
**ninguna aserción se modificó**.

`api-config.test.ts` y `keycloak.test.ts` pasan sin tocarse, que era el objetivo de la decisión D4.

## Verificación

| Comprobación | Resultado |
|---|---|
| Accesos al entorno fuera de `config*` | 0 |
| `npx tsc --noEmit` | limpio |
| `npm test` | 22 archivos, 89 casos, igual que antes |
| `npm run build` | exit 0 |
| Sustitución literal en el bundle | el valor sigue incrustado en `.next/static/chunks/` |

## Descripción para el commit

```
Centralize environment access into config.ts and config.server.ts, drop the translation
table and ternary chain, read the Keycloak client id from config, and document every
key in .env.example.
```

*(27 palabras)*
