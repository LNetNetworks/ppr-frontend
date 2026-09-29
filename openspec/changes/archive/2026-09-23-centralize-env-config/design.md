## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la motivación.

Lo que condiciona el enfoque:

- El código corre en dos runtimes. En el servidor `process.env` es el objeto real de Node. En el navegador **no
  existe**: lo que hay es el texto que el bundler dejó al compilar.
- `public/env.js` se carga con `<Script strategy="beforeInteractive">` y expone `window.__ENV`. Es el equivalente al
  patrón `APP_INITIALIZER` + `assets/config.json` de Angular, y existe porque la imagen Docker se construye una vez y
  se promueve entre ambientes.
- Hay tres módulos con lógica de cascada (`api-config.ts`, `app-config.ts`, `server-public-env.ts`) y los tres tienen
  tests. Esa es la red de seguridad del cambio.
- `server-public-env.ts` importa `node:fs`.

## Goals / Non-Goals

**Goals:**

- Que exista un único archivo donde buscar cuando alguien pregunte de dónde sale una variable.
- Que agregar una variable nueva sea editar un lugar, no cinco.
- Que la API pública de los módulos actuales no cambie, para que los 8 consumidores no se toquen.

**Non-Goals:**

- Cambiar el mecanismo de runtime, la nomenclatura de las claves o la arquitectura cliente/servidor. Todo eso está
  listado en los *Non-goals* de la propuesta.
- Mejorar las validaciones existentes de `app-config.ts`. Se mueven de archivo o se quedan, pero no se rediseñan.

## Decisions

### D1 — Los accesos a `NEXT_PUBLIC_*` se escriben literales, en un objeto

Next no *consulta* estas variables: durante el build reemplaza por texto la expresión exacta
`process.env.NEXT_PUBLIC_X` por su valor. Es una sustitución sintáctica. Un acceso computado como `process.env[key]`
no tiene texto que coincidir, queda intacto, y en el navegador devuelve `undefined` porque no hay `process`.

Se puede comprobar en el bundle actual: `process.env.NEXT_PUBLIC_WEBSITE_TITLE` aparece como el literal
`"Trace4good"` dentro de `.next/static/chunks/`.

Por eso `config.ts` declara un objeto con los cinco accesos escritos a mano:

```ts
const BUILD = {
  apiUrl:             process.env.NEXT_PUBLIC_API_URL,
  websiteTitle:       process.env.NEXT_PUBLIC_WEBSITE_TITLE,
  instanceName:       process.env.NEXT_PUBLIC_INSTANCE_NAME,
  sidebarLogo:        process.env.NEXT_PUBLIC_SIDEBAR_LOGO,
  showImportEvidence: process.env.NEXT_PUBLIC_SHOW_IMPORT_EVIDENCE,
}
```

Next sustituye los cinco, el objeto queda con los valores adentro, y el resto del repositorio consume un objeto normal
sin enterarse de la restricción.

**Alternativa descartada:** un `Record<string, string>` indexado por clave. Es lo que la intuición pide y es
exactamente lo que no funciona en cliente. La cadena de ternarios que hoy tiene `app-config.ts` es el intento previo de
simular ese lookup; el objeto literal consigue lo mismo sin la fealdad.

### D2 — Dos archivos, no uno: `config.ts` y `config.server.ts`

`server-public-env.ts` lee `public/env.js` del disco con `readFileSync`. Si eso viviera en `config.ts`, y `config.ts`
lo importa código cliente —lo hace: `keycloak-provider.tsx`, `use-branding.ts`, `logo.tsx`—, el bundler intentaría
meter `node:fs` en el bundle del navegador y fallaría.

```
  src/lib/config.ts            isomorfico
    BUILD (literales)          se puede importar desde cualquier lado
    window.__ENV
    process.env bajo guarda
         ^
         | reexporta
  src/lib/config.server.ts     'server-only'
    readFileSync(public/env.js)
    solo lo importa codigo de servidor
```

Sigue siendo centralizado: un archivo para lo isomórfico, uno para lo que solo puede existir en servidor. La frontera
queda explícita en el nombre en vez de escondida en una guarda `typeof window`.

**Alternativa descartada:** un solo `config.ts` con import dinámico de `node:fs`. Funcionaría con `await import()`,
pero obliga a que todos los getters sean asíncronos y contagia `async` a los consumidores, que es justo lo que este
cambio promete no tocar.

**Alternativa descartada:** dejar `server-public-env.ts` como está. Sería menos trabajo, pero deja fuera al único
lector de entorno que hace algo verdaderamente raro —el servidor parseando con regex un archivo destinado al
navegador— y el objetivo es que no quede ningún acceso suelto.

### D3 — Alias como funciones, no como constantes

```ts
export const config = {
  apiUrl: () => runtime('API_URL') ?? BUILD.apiUrl ?? '',
}
```

No `apiUrl: runtime('API_URL') ?? ...` evaluado al importar el módulo.

La razón es que `window.__ENV` lo pone un `<script>` que corre antes de la hidratación, pero el orden respecto a la
evaluación de los módulos no está garantizado. Un valor calculado en el momento del import puede leer `window.__ENV`
todavía vacío y quedar congelado en `undefined` para toda la sesión. Evaluando en cada llamada, eso no puede pasar.

Es además el comportamiento actual: `keycloakConfig` usa getters (`get url()`) por este mismo motivo. El cambio lo
preserva.

**Alternativa descartada:** constantes evaluadas al importar. Más ergonómico de consumir (`config.apiUrl` en vez de
`config.apiUrl()`), pero introduce una condición de carrera que hoy no existe.

### D4 — La API pública de los módulos actuales no cambia

`api-config.ts` sigue exportando `getClientApiBaseUrl()` y `getServerApiBaseUrl()`. `app-config.ts` sigue exportando
`getWebsiteTitle()`, `getSidebarLogo()`, `getShowImportEvidence()`. `keycloak.ts` sigue exportando `keycloakConfig`.

Lo único que cambia es su interior: dejan de leer el entorno y pasan a delegar en `config`. Los 8 consumidores no se
tocan y los tests existentes siguen valiendo sin modificarse, lo que convierte a la suite en verificación real del
cambio.

**Alternativa descartada:** que los consumidores importen `config` directamente y eliminar los módulos intermedios.
Es más limpio como destino final, pero toca 8 archivos más y pierde las validaciones de `app-config.ts` (el
`throw` ante variable faltante, el parseo de booleano), que son lógica de negocio y no de acceso.

## Impacto en el arranque y en la configuración de entorno

El arranque no cambia. Mismas fuentes, mismo orden de cascada, mismo `public/env.js`, mismas rutas estáticas y
dinámicas, mismo `Dockerfile` y mismo pipeline.

La única diferencia observable es que el diagnóstico de [`api.ts`](../../../src/lib/api.ts) —que hoy imprime
`API_URL` y `NEXT_PUBLIC_API_URL` en cada instanciación del cliente— pasa a leer esos valores desde `config`. Se
conserva el log tal cual para no mezclar este cambio con la limpieza de `console.log`, que es otro asunto.

`.env.example` se añade como documentación: no lo lee nadie en ejecución.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Alterar la cascada sin notarlo y que falle solo en un entorno | `api-config.test.ts`, `server-public-env.test.ts` y `keycloak.test.ts` cubren los tres módulos con cascada y deben pasar sin tocarlos |
| Que `node:fs` termine en el bundle cliente | D2 lo separa por archivo; si alguien importa `config.server.ts` desde cliente, `import 'server-only'` lo convierte en error de build en vez de fallo silencioso |
| Escribir mal un literal `NEXT_PUBLIC_*` y que quede `undefined` sin ruido | Las validaciones de `app-config.ts` ya lanzan ante valor faltante; se conservan |
| Que el cambio se expanda hacia el refactor de arquitectura | Los *Non-goals* de la propuesta lo acotan de forma explícita |

## Migration Plan

Un MR sobre la rama ya creada, con commits temáticos:

1. `feat(config): add centralized env module` — `config.ts` y `config.server.ts`, sin consumidores todavía
2. `refactor(config): read env through the config module` — migrar los 6 lectores
3. `fix(auth): read expected azp from config instead of a literal` — `azp-conditional.tsx`
4. `docs: add .env.example` — las 8 claves y la nota en `CONTRIBUTING.md`

**Rollback:** `git revert` del merge. No hay estado externo ni migración de datos.

## Open Questions

Ninguna.
