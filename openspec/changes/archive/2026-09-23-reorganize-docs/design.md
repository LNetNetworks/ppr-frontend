## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la motivación.

Estado relevante para el enfoque:

- Los 21 `.md` versionados no forman una jerarquía: conviven *community health files* (raíz, correcto), documentación
  técnica en raíz con nombres `SCREAMING_CASE`, y artefactos de tooling de IA en `.planning/`, `.impeccable.md` y
  `skills/`.
- `skills/` son 18 symlinks en modo git `120000` apuntando a `../.agents/skills/*`. El directorio `.agents/` no existe
  en el repositorio, así que están rotos para cualquiera que clone.
- `openspec/` y `openspec/config.yaml` ya están commiteados (`f1de81c`, `ea6f2f9`). El `context` del config es el
  destino natural de las restricciones permanentes que hoy viven en `.planning/PROJECT.md` y `.impeccable.md`.
- Los dos informes de auditoría viven en `docs/` y **citan con rutas relativas** varios archivos que este cambio mueve
  (`../TESTING.md`, `../PROVIDER_USER_JOURNEY.md`, `../DEVELOPER_EXPLAIN.md`, `../.planning/STATE.md`,
  `../.impeccable.md`). Mover sin actualizar deja enlaces rotos dentro de los propios documentos que justifican el
  cambio.

## Goals / Non-Goals

**Goals:**

- Que la raíz quede reducida a los archivos que un recién llegado espera encontrar ahí, sin perder la detección de
  *community health files* en GitHub.
- Que ningún documento versionado afirme algo falso sobre el repositorio.
- Que el conocimiento permanente (restricciones, principios de diseño) viva en `openspec/config.yaml`, donde lo
  consumen las herramientas, y no duplicado en archivos sueltos.
- Que no quede ningún enlace relativo roto después del movimiento.

**Non-Goals:**

- Reescribir el contenido de los documentos que ya son correctos. `DEVELOPER_EXPLAIN.md` y los dos *user journeys* se
  mueven tal cual, salvo la corrección puntual del redirect.
- Definir una plantilla o estilo común para `docs/`. Se respeta el formato que cada documento ya tiene.
- Resolver las contradicciones de código que los documentos revelan (`RoleRedirect`, `public/env.js`). Solo se corrige
  la descripción.

## Decisions

### D1 — `.planning/` se desagrega en tres destinos, no se borra en bloque

El análisis inicial clasificó `.planning/` entero como estado de sesión desechable. La lectura completa lo desmintió:
`REQUIREMENTS.md` contiene 18 requisitos trazables con criterios de aceptación (SPON-01, STAG-01..10, TASK-01/02,
NAV-01, CHRT-01, EVID-01, BRND-01) y `PROJECT.md` contiene constraints y decisiones de producto.

| Archivo | Destino | Razón |
|---|---|---|
| `REQUIREMENTS.md` | `docs/requirements.md` | Backlog real de producto |
| `PROJECT.md` → *Constraints* y *Key Decisions* | `openspec/config.yaml` (`context`) | Restricciones permanentes que deben condicionar cualquier propuesta futura |
| `PROJECT.md` → resto (contexto, alcance excluido) | `docs/requirements.md` | Complementa los requisitos |
| `ROADMAP.md` | `docs/requirements.md` (sección *Fases*) | Agrupa las 3 fases junto a los requisitos que mapean |
| `STATE.md` | eliminado | "Progress 0%", "Plans completed: 0", fechado 2026-03-26. Es estado de una sesión, no conocimiento |

**Alternativa descartada:** migrar los 18 requisitos a `openspec/specs/` como capabilities. Se descartó porque
convertiría un cambio de documentación de riesgo cero en un ejercicio de modelado de specs, y porque varios de esos
requisitos parecen ya implementados —los commits recientes `79cff00 Remove tasks option from sidebars` y
`fd44d41 Remove uploaded evidence column` apuntan a NAV-01 y a trabajo de evidencias— pero `REQUIREMENTS.md` sigue
marcándolos todos como `Pending`. Auditar cuáles están hechos es trabajo de producto, no de reorganización de
archivos. Se mueven como documento y se deja anotado que el estado necesita una revisión.

### D2 — Separar con claridad lo que se mueve de lo que se elimina

Mover un archivo es exactamente eso: cambiarlo de carpeta. No requiere ninguna mecánica especial —git detecta los
renombrados por similitud de contenido al construir el commit, se use `git mv` o un `mv` seguido de `git add`— así
que la decisión relevante no es *cómo* se mueve sino *qué* se mueve y qué desaparece.

Se **mueven** 7 documentos con contenido vigente. Se **eliminan** solo cuatro cosas, todas justificadas de forma
independiente en la propuesta: `force_deploy.md`, los 18 symlinks de `skills/`, `skills-lock.json` y
`.planning/STATE.md`.

**Alternativa descartada:** fusionar varios de los documentos movidos en menos archivos —por ejemplo, un único
`docs/product.md` con requisitos, roadmap y journeys—. Se descartó porque mezcla documentos con ciclos de vida
distintos: los journeys cambian cuando cambia la UI, los requisitos cuando cambia el alcance, y el roadmap cuando
cambia la planificación.

### D3 — La corrección de enlaces es un paso verificado, no un efecto colateral

El riesgo real de este cambio no es perder contenido: es dejar enlaces rotos. La verificación no puede ser visual.

Se ejecuta una comprobación mecánica sobre **todos** los `.md` versionados: extraer cada destino relativo y confirmar
que el archivo existe. Debe correr después de mover y quedar en cero antes de dar el cambio por terminado.

**Alternativa descartada:** convertir todos los enlaces a rutas absolutas desde la raíz del repo. Funcionaría, pero
GitLab las resuelve distinto que el visor local de VS Code y quedaría peor que ahora.

### D4 — `.impeccable.md` se parte en dos, y el documento resultante se renombra

Sus *Design Principles* y *Quality Bar* son restricciones que deben condicionar propuestas futuras → van al `context`
de `openspec/config.yaml` y **se eliminan del documento**. El resto (*Users*, *Brand Personality*,
*Aesthetic Direction*) es documentación de producto legible por humanos y se queda.

Como el documento ya no contiene los principios, conservar el nombre `design-principles.md` sería contradictorio. El
destino final es **`docs/design-context.md`**, que coincide con el encabezado que el propio archivo ya tenía
(`## Design Context`) y describe lo que efectivamente queda dentro. El documento cierra con una nota que apunta a
`openspec/config.yaml` para quien busque los principios.

**Alternativa descartada:** copiar las dos secciones al `context` dejándolas también en el documento. Se descartó
porque crea dos fuentes del mismo contenido que pueden divergir —exactamente el patrón que esta auditoría denuncia en
el código— y porque el `context` es la única de las dos ubicaciones que condiciona a las herramientas.

**Alternativa descartada:** meter el archivo entero en `config.yaml`. Haría el `context` desproporcionadamente largo
para lo que aporta, y el material de marca es más útil como documento que como restricción de herramienta.

### D5 — Los journeys faltantes se crean como stubs explícitos

`user` y `verifier` no tienen journey documentado mientras `sponsor` y `provider` sí. Un stub que diga "pendiente"
hace visible la asimetría; no crear nada la esconde.

**Alternativa descartada:** redactarlos en este cambio. Requiere conocimiento de producto que la reorganización no
aporta, e inventarlos sería peor que no tenerlos.

### D6 — `GOVERNANCE.md` se mueve a `docs/`, conservando las mayúsculas y su contenido

El archivo pasa a `docs/GOVERNANCE.md`. Su contenido no se toca: la tabla de mantenedores conserva las 4 filas en
`TBD` / `@tbd` por decisión explícita del equipo.

`GOVERNANCE.md` es uno de los *community health files* que GitHub reconoce, junto con `CODE_OF_CONDUCT.md`,
`CONTRIBUTING.md`, `SECURITY.md` y `SUPPORT.md`. GitHub los busca en tres ubicaciones válidas —la raíz, `.github/` y
`docs/`— por lo que moverlo a `docs/` **no rompe la convención**: es una de las ubicaciones contempladas.

Lo que sí importa es el nombre. La detección depende de que el archivo se llame `GOVERNANCE.md` en mayúsculas, así que
no se renombra a `governance.md` pese a que el resto de `docs/` usa minúsculas. El repositorio vive hoy en GitLab
—donde este mecanismo no existe y el archivo no recibe tratamiento especial esté donde esté— pero también estará
publicado en GitHub, así que preservar la detección tiene valor real.

Tras el movimiento la raíz conserva `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` y
`LICENSE.md`, todos ellos detectables en su ubicación habitual.

**Alternativa descartada:** renombrar a `docs/governance.md` por consistencia con `architecture.md` y `testing.md`. Se
descartó porque sacrifica la detección en GitHub a cambio de una uniformidad meramente estética.

**Alternativa descartada:** dejarlo en la raíz y añadir una nota aclarando que los mantenedores están sin asignar. Se
descartó a pedido del equipo: la asignación es una decisión pendiente suya y la carencia ya queda registrada en
`docs/auditoria-2026-09-22.md`.

### D7 — `docs/` no se excluye de ningún mecanismo de ignore

Ni de `.gitignore` ni de `.gcloudignore`. La documentación se versiona y viaja al contexto de build junto con el resto
del repositorio. Decisión del equipo durante la revisión.

**Alternativa descartada:** añadir `docs/` a `.gcloudignore`, donde `README.md` ya figura excluido. Habría reducido
marginalmente el contexto de build, pero introduce una asimetría difícil de justificar —parte de la documentación
excluida y parte no— a cambio de un ahorro despreciable.

El único añadido a `.gitignore` en este cambio sigue siendo `.claude/`.

## Impacto en el arranque y en la configuración de entorno

**Ninguno.** Este cambio no toca `src/`, `next.config.mjs`, `Dockerfile`, `package.json`, `public/env.js` ni ningún
archivo `.env*`. La aplicación arranca exactamente igual antes y después.

La única intersección con la configuración de entorno es documental: `CONTRIBUTING.md` deja de presentar
`cp .env.example .env.local` como un paso ejecutable y pasa a marcarlo como pendiente conocido, con enlace al informe.
Crear `.env.example` y unificar la nomenclatura (`API_URL` / `NEXT_PUBLIC_API_URL` / `window.__ENV.API_URL`) queda
fuera de alcance por decisión explícita, para el cambio siguiente.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Enlaces relativos rotos tras mover los archivos | Comprobación mecánica de todos los destinos relativos en los `.md` versionados; debe dar cero antes de cerrar (D3) |
| Borrar `skills/` rompe el flujo de alguien que sí tenga `.agents/` localmente | `skills-lock.json` queda registrado en el historial y en `docs/`; reinstalar desde `pbakaus/impeccable` es reproducible. Los symlinks están rotos para cualquiera que clone hoy |
| `docs/requirements.md` nace con estado desactualizado (18 requisitos en `Pending`, varios probablemente hechos) | Se añade una nota de encabezado señalando que el estado necesita revisión, con la fecha original. No se inventa el estado real |
| El `context` de `openspec/config.yaml` crece y pierde foco | Solo se absorben *Constraints*, *Key Decisions* y *Design Principles*. El material narrativo va a `docs/` |
| Alguien tiene ramas abiertas que tocan los archivos movidos | Los conflictos por renombrado son manejables. Conviene ejecutar el cambio en un momento de pocas ramas vivas y avisar al equipo |

## Migration Plan

Un único MR, con los cambios agrupados en commits temáticos para que el diff sea legible:

1. `chore(docs): remove dead files` — `force_deploy.md`, `skills/`, `skills-lock.json`, `.planning/STATE.md`
2. `chore(docs): move documentation into docs/` — los 7 documentos que cambian de carpeta
3. `docs: fold planning and design context into openspec config` — ampliación del `context`
4. `docs: fix inaccurate statements` — `docs/testing.md`, `SECURITY.md`, `README.md`, `CONTRIBUTING.md` y el journey
   de provider (`docs/GOVERNANCE.md` se mueve pero no se edita, por D6)
5. `docs: add index and pending journey stubs` — `docs/README.md`, stubs de `user` y `verifier`
6. `chore: ignore .claude/` — `.gitignore`

**Rollback:** `git revert` del merge commit. No hay estado externo, migración de datos ni despliegue involucrado.

## Open Questions

Ninguna. Las dos que quedaron abiertas en la primera redacción se resolvieron durante la revisión y están recogidas
como decisiones D6 y D7.
