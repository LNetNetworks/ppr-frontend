## 1. Preparación y línea base

- [x] 1.1 Registrar el inventario de partida ejecutando `find . -name node_modules -prune -o -name .git -prune -o -name "*.md" -print | sort > /tmp/md-antes.txt` y `git ls-files | grep -c '\.md$'`; verificar que el conteo coincide con los 21 `.md` versionados descritos en la propuesta
- [x] 1.2 Construir el inventario de enlaces relativos entre `.md` versionados (extraer los destinos de `](...)` y resolverlos contra el árbol) y guardar la lista de los que hoy ya están rotos, para no atribuirse roturas preexistentes; verificar que la lista queda registrada antes de mover nada

## 2. Eliminar archivos muertos

- [x] 2.1 Eliminar `force_deploy.md` con `git rm`; verificar que el archivo ya no aparece en `git ls-files`
- [x] 2.2 Eliminar los 18 symlinks de `skills/` y `skills-lock.json` con `git rm -r skills/ skills-lock.json`; verificar con `git ls-files skills` que devuelve vacío y que `ls skills/ 2>/dev/null` no encuentra el directorio
- [x] 2.3 Eliminar `.planning/STATE.md` con `git rm`; verificar que `.planning/` conserva todavía `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md` y `config.json`
- [x] 2.4 Commit `chore(docs): remove dead files`; verificar que `git show --stat` lista exactamente 21 rutas eliminadas (1 + 18 + 1 + 1)

## 3. Mover documentación a `docs/`

- [x] 3.1 Crear el directorio `docs/user-journeys/`; verificar que existe
- [x] 3.2 Mover los cuatro documentos de raíz: `DEVELOPER_EXPLAIN.md` → `docs/architecture.md`, `TESTING.md` → `docs/testing.md`, `PROVIDER_USER_JOURNEY.md` → `docs/user-journeys/provider.md`, `SPONSOR_USER_JOURNEY.md` → `docs/user-journeys/sponsor.md`; verificar que los cuatro destinos existen y que los orígenes ya no
- [x] 3.3 Mover `GOVERNANCE.md` → `docs/GOVERNANCE.md` **conservando las mayúsculas** (decisión D6: es lo que hace que GitHub lo detecte como community health file) y sin editar su contenido; verificar con `diff` que el archivo movido es idéntico al original y que el nombre no quedó en minúsculas
- [x] 3.4 Mover `.impeccable.md` → `docs/design-context.md` (ver D4: el nombre refleja lo que queda tras el split) y `.planning/REQUIREMENTS.md` → `docs/requirements.md`; verificar que ambos destinos existen
- [x] 3.5 Fusionar dentro de `docs/requirements.md` el contexto y el alcance excluido de `.planning/PROJECT.md` y las tres fases de `.planning/ROADMAP.md`, y añadir la nota de encabezado que advierte que el estado de los 18 requisitos es el original de 2026-03-26 y necesita revisión; verificar que el documento resultante contiene los 18 identificadores (`SPON-01`, `STAG-01`..`STAG-10`, `TASK-01`, `TASK-02`, `NAV-01`, `CHRT-01`, `EVID-01`, `BRND-01`) y las 3 fases
- [x] 3.6 Eliminar el directorio `.planning/` ya vacío de contenido útil (`PROJECT.md`, `ROADMAP.md`, `config.json`) con `git rm -r .planning/`; verificar que `git ls-files .planning` devuelve vacío
- [x] 3.7 Commit `chore(docs): move documentation into docs/`; verificar que el diff muestra renames y no reescrituras completas

## 4. Consolidar conocimiento permanente en `openspec/config.yaml`

- [x] 4.1 Añadir al bloque `context` las *Constraints* y las *Key Decisions* de `.planning/PROJECT.md`: backend como fuente de verdad de enums y contratos, seguridad brownfield (preservar capacidades existentes de sponsor/provider), y prioridad de corrección funcional sobre refactor amplio; verificar que el YAML sigue siendo válido con `openspec validate --change reorganize-docs` o `python3 -c "import yaml,sys; yaml.safe_load(open('openspec/config.yaml'))"`
- [x] 4.2 Trasladar al bloque `context` los *Design Principles* y el *Quality Bar*, **eliminándolos** de `docs/design-context.md` para no duplicarlos (D4): claridad sobre ornamento en tablas y formularios operativos, estados de interacción explícitos (hover, focus, disabled, loading, success, error), consistencia de wording y espaciado, y defaults accesibles; verificar de nuevo que el YAML parsea
- [x] 4.3 Commit `docs: fold planning and design context into openspec config`; verificar que `openspec instructions proposal --change reorganize-docs --json` devuelve el `context` ampliado

## 5. Corregir contenido falso

- [x] 5.1 Reescribir `docs/testing.md` con el alcance real: 22 archivos de test, 89 casos, convención de colocación `*.test.ts(x)` y la marca `// @vitest-environment jsdom` en los 9 tests de componentes; verificar que las cifras coinciden con la salida de `npm test`
- [x] 5.2 Corregir `SECURITY.md`: eliminar el párrafo boilerplate *"Use this section to tell people…"* y cambiar la tabla de versiones de `1.0.x` a `0.1.x`; verificar que la versión declarada coincide con la de `package.json`
- [x] 5.3 No editar el contenido de `docs/GOVERNANCE.md` (decisión D6: la tabla de mantenedores se mantiene con sus `TBD` / `@tbd`); verificar que el único cambio registrado sobre ese archivo es el de ubicación, no de contenido
- [x] 5.4 Corregir `README.md`: eliminar la afirmación de que `public/env.js` está en `.gitignore` y añadir la advertencia de que `docker build` requiere las variables `NEXT_PUBLIC_*` en tiempo de build; verificar contrastando contra `.gitignore` y `Dockerfile`
- [x] 5.5 Corregir `CONTRIBUTING.md`: marcar `cp .env.example .env.local` como paso pendiente con enlace a `docs/auditoria-2026-09-22.md`, y eliminar la referencia a una configuración de ESLint inexistente; verificar que ninguna instrucción del documento falla si alguien la sigue al pie de la letra
- [x] 5.6 Corregir `docs/user-journeys/provider.md`: quitar el inciso *"(or is redirected there from `/`)"*, que describe un `RoleRedirect` que ningún archivo de producción monta; verificar con `grep -rn "RoleRedirect" src --include=*.tsx | grep -v test` que sigue sin tener consumidores
- [x] 5.7 Commit `docs: fix inaccurate statements`

## 6. Crear índice y stubs

- [x] 6.1 Crear `docs/README.md` como índice, listando cada documento de `docs/` con una línea de descripción y separando documentación vigente de informes de auditoría fechados; verificar que todos los archivos presentes en `docs/` aparecen en el índice
- [x] 6.2 Crear `docs/user-journeys/user.md` y `docs/user-journeys/verifier.md` como stubs que declaren explícitamente que están pendientes y enlacen a los journeys de sponsor y provider como referencia de formato; verificar que `docs/user-journeys/` contiene los 4 roles
- [x] 6.3 **No ignorar `.claude/`**: la premisa de esta tarea cambió. Cuando se escribió estaba sin trackear; se commiteó en `f1de81c` junto con `openspec/` y contiene los comandos `/opsx:*` y los skills de OpenSpec que el equipo comparte. Sacarlo del control de versiones rompería ese flujo, así que se mantiene versionado y `.gitignore` no se toca
- [x] 6.4 Commit `docs: add index and pending journey stubs` (el segundo commit ya no aplica: ver 6.3)

## 7. Verificación final

- [x] 7.1 Reejecutar la comprobación de enlaces relativos del paso 1.2 sobre todos los `.md` versionados y verificar que el número de enlaces rotos es cero, o idéntico a la línea base preexistente registrada
- [x] 7.2 Verificar que la raíz conserva exactamente 5 archivos `.md` (`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE.md`) ejecutando `ls *.md`, y que `docs/GOVERNANCE.md` existe con esa grafía exacta
- [x] 7.3 Verificar que ningún archivo de `src/`, `package.json`, `next.config.mjs`, `Dockerfile` ni `public/` fue modificado, ejecutando `git diff --name-only main...HEAD | grep -vE '^(docs/|openspec/|\.gitignore|[A-Z_]+\.md)'` y comprobando que devuelve vacío
- [x] 7.4 Verificar que `docs/README.md` enlaza a todos los archivos de `docs/` y que ninguno queda huérfano, comparando el índice contra `ls docs/ docs/user-journeys/`

> No se ejecuta `npm run build && npm test`: este cambio no toca código, así que la suite no puede falsar ninguna hipótesis sobre él. Lo verifican las tareas 7.1 (enlaces) y 7.3 (nada fuera de documentación).
