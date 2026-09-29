## Why

El repositorio tiene 21 archivos Markdown versionados, 9 de ellos en la raíz, y solo unos 8 le sirven a alguien que
entra nuevo. El resto se reparte entre documentos heredados de plantilla que nunca se editaron (`SECURITY.md`), estado
de sesión de herramientas de IA (`.planning/STATE.md`), basura de un commit vacío (`force_deploy.md`) y 18 symlinks
rotos (`skills/`). Además, varios documentos vigentes **afirman cosas falsas**: `CONTRIBUTING.md` manda copiar un
`.env.example` que no existe, `README.md` dice que `public/env.js` está en `.gitignore` cuando está versionado, y
`TESTING.md` declara un único test de breadcrumb cuando hay 22 archivos y 89 tests.

El diagnóstico completo está en [`docs/auditoria-2026-09-22.md`](../../../docs/auditoria-2026-09-22.md) §"Organización
de la documentación" y en [`docs/analisis-hardcodeos-2026-09-22.md`](../../../docs/analisis-hardcodeos-2026-09-22.md)
§4. Este cambio ejecuta lo que esos informes recomiendan.

## What Changes

### Eliminar

- `force_deploy.md` — una línea, residuo de un commit vacío
- `skills/` (18 symlinks con modo `120000` apuntando a `../.agents/skills/*`, destino inexistente en el repo) y
  `skills-lock.json`
- `.planning/STATE.md` — estado de sesión fechado 2026-03-26 con "Progress 0%"

### Consolidar en `openspec/config.yaml`

El `context` del config ya existe y se amplía absorbiendo lo que hoy vive disperso:

- De `.planning/PROJECT.md`: el bloque *Constraints* y la tabla *Key Decisions* (restricciones permanentes: backend
  como fuente de verdad de enums, seguridad brownfield, foco en corrección funcional sobre refactor amplio)
- De `.impeccable.md`: los *Design Principles* y el *Quality Bar*

### Mover a `docs/`

| Origen | Destino |
|---|---|
| `DEVELOPER_EXPLAIN.md` | `docs/architecture.md` |
| `GOVERNANCE.md` | `docs/GOVERNANCE.md` (mantiene mayúsculas, ver diseño D6) |
| `PROVIDER_USER_JOURNEY.md` | `docs/user-journeys/provider.md` |
| `SPONSOR_USER_JOURNEY.md` | `docs/user-journeys/sponsor.md` |
| `TESTING.md` | `docs/testing.md` |
| `.planning/REQUIREMENTS.md` | `docs/requirements.md` |
| `.impeccable.md` | `docs/design-context.md` (ver diseño D4) |

`GOVERNANCE.md` se mueve sin modificar su contenido: la tabla de mantenedores conserva sus 4 filas `TBD` / `@tbd`.

`.planning/PROJECT.md` y `.planning/ROADMAP.md` se fusionan dentro de `docs/requirements.md` (contexto, alcance
excluido y las tres fases), y el directorio `.planning/` desaparece.

### Crear

- `docs/README.md` — índice de la documentación
- `docs/user-journeys/user.md` y `docs/user-journeys/verifier.md` — *stubs* marcados como pendientes, para que la
  asimetría entre los 4 roles quede visible en vez de silenciosa

### Corregir contenido falso o incompleto

- `TESTING.md` → reescrito con el alcance real (22 archivos, 89 tests, convención `// @vitest-environment jsdom`)
- `SECURITY.md` → quitar el boilerplate de plantilla; la tabla de versiones pasa de `1.0.x` a `0.1.x`, que es lo que
  declara `package.json`
- `README.md` → corregir la afirmación sobre `public/env.js` y señalar que `docker build` requiere variables de build
- `CONTRIBUTING.md` → la instrucción `cp .env.example .env.local` se marca explícitamente como pendiente, con un
  enlace al informe de auditoría, en vez de dejarla como un paso que falla en silencio; se elimina la referencia a una
  configuración de ESLint que no existe
- `PROVIDER_USER_JOURNEY.md` → quitar la afirmación sobre la redirección desde `/`, que describe un componente
  (`RoleRedirect`) que ningún archivo de producción monta

### Ignorar

- `.claude/` se añade a `.gitignore`

## Capabilities

### New Capabilities

Ninguna. Este cambio no introduce ni modifica comportamiento del sistema: mueve, borra y corrige archivos de
documentación, más `.gitignore` y `openspec/config.yaml`. No toca `src/`, ni dependencias, ni configuración de build.

### Modified Capabilities

Ninguna.

Por eso el cambio declara `skip_specs: true` en su `.openspec.yaml`, según indica el propio esquema para cambios de
documentación y tooling sin impacto en comportamiento.

## Non-goals

- **No se crea `.env.example` ni se toca la configuración de entorno.** Queda íntegramente para el cambio siguiente,
  que unificará la nomenclatura (hoy el mismo valor tiene tres nombres: `API_URL`, `NEXT_PUBLIC_API_URL` y
  `window.__ENV.API_URL`). Crear el archivo ahora obligaría a reescribirlo entonces. Aquí solo se señala la carencia
  en `CONTRIBUTING.md` para que deje de ser un paso que falla sin explicación.
- **No se resuelve la contradicción de `RoleRedirect`.** Aquí solo se corrige el documento que lo describe como vivo.
  Decidir si el componente se monta o se elimina es un cambio de código aparte.
- **No se escriben los journeys de `user` y `verifier`.** Se crean como stubs; redactarlos requiere conocimiento de
  producto que este cambio no aporta.
- **No se editan los nombres de mantenedores de `GOVERNANCE.md`.** El archivo se mueve a `docs/GOVERNANCE.md` pero su
  contenido no cambia: las 4 filas siguen en `TBD` / `@tbd`. Asignarlos es una decisión del equipo, no de este cambio.
- **No se excluye `docs/` de `.gitignore` ni de `.gcloudignore`.** La documentación se versiona y viaja al contexto de
  build como el resto del repositorio.
- **No se versiona `public/env.js` de otra forma ni se saca del repositorio.** Es parte del cambio de entorno.

## Impact

**Roles afectados: ninguno.** El cambio no toca ninguna superficie de UI de `sponsor`, `provider`, `user` ni
`verifier`. Es documentación, `.gitignore` y configuración de OpenSpec.

| Área | Impacto |
|---|---|
| `src/` | Sin cambios |
| `package.json` / dependencias | Sin cambios |
| Build y CI | Sin cambios. `docs/` sigue viajando al contexto de build, por decisión explícita |
| Enlaces entrantes | `README.md`, `CONTRIBUTING.md` y los dos informes de auditoría referencian archivos que se mueven; hay que actualizar esas rutas o quedan rotas |
| Historial | Los movimientos se detectan como renombrados y el historial sigue siendo consultable; los borrados son deliberados |
| `openspec/config.yaml` | Se amplía el bloque `context` (ya commiteado en `ea6f2f9`) |

**Riesgo principal:** enlaces rotos. Los dos informes en `docs/` citan rutas como `../TESTING.md` y
`../PROVIDER_USER_JOURNEY.md` que dejarán de existir. La verificación final debe incluir una pasada de comprobación de
enlaces relativos sobre todos los `.md` del repositorio.
