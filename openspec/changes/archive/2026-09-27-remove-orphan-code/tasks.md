## 1. Línea base

- [x] 1.1 Confirmar el punto de partida: `npx tsc --noEmit` limpio, `npm test` con 22 archivos y 89 casos, `npm run build` con exit 0; anotar los tres valores, que son la referencia de cada lote
- [x] 1.2 Regenerar el inventario de archivos sin importadores y verificar que da **15 candidatos**, de los cuales 7 se eliminan, 7 son los primitivos de Catalyst que se conservan (D1) y 1 es `src/types/env.d.ts`, falso positivo conocido (D2)

## 2. Eliminar los archivos sin importadores

- [x] 2.1 Verificar uno por uno, antes de borrar, que ningún archivo los importa: `grep -rn "grid-projects-with-new-project-button\|contributions-table\|payment-modal\|my-projects/actions\|stage-details-header\|types/types" src --include=*.ts --include=*.tsx`. Solo deben aparecer los propios archivos
- [x] 2.2 Eliminar los 3 componentes nunca conectados: `components/tables/contributions-table.tsx` (198), `components/payment-modal.tsx` (165) y `components/stage-details-header.tsx` (118); verificar que sus hermanos vivos siguen en pie: `contribution-modal.tsx`, `project-details-header.tsx`
- [x] 2.3 Eliminar los 2 Server Actions: `app/(app)/sponsor/my-projects/actions.ts` y `app/(app)/provider/my-projects/actions.ts` (130 cada uno); verificar que las 3 páginas de `my-projects` siguen importando sus componentes cliente y ninguna se rompe
- [x] 2.4 Eliminar el fork `components/grids/grid-projects-with-new-project-button.tsx` (877); verificar que `components/grids/grid-projects.tsx`, que sí usa `user/my-projects`, queda intacto
- [x] 2.5 Eliminar `src/types/types.ts` (46); verificar que **`src/types/env.d.ts` sigue existiendo** (D2) y que `EnumValue` sigue resolviéndose desde `types/api.ts:179`
- [x] 2.6 Eliminar `STATUS_BADGE_COMPACT_BASE_CLASS` de `src/lib/status-styles.ts` (D5): su único consumidor era `stage-details-header.tsx`; verificar que `STATUS_BADGE_BASE_CLASS`, que tiene 6 consumidores, queda intacto
- [x] 2.7 **Verificar el lote**: `npx tsc --noEmit` limpio, `npm test` con 89 casos y `npm run build` con exit 0. Si algo falla, el archivo responsable vuelve y se anota por qué la heurística lo marcó mal

## 3. Podar `src/types/enums.ts`

- [x] 3.1 Verificar que las 6 constantes no tienen consumidores fuera del propio archivo: `PROJECT_TYPES`, `PROJECT_STATUS`, `PHASE_PROJECT_STATUS`, `PHASE_PROJECT_TASK_STATUS`, `AUDIT_STATUS`, `EVIDENCE_STATUS`. Cuidado con `AUDIT_STATUS`: una búsqueda por substring matchea `EXECUTED_AUDIT_STATUSES` en `audit-modal.tsx:27`, que es otra cosa
- [x] 3.2 Eliminar esas 6 constantes con sus comentarios de sección; verificar que `COUNTRY_REGION_OPTIONS` queda intacta con sus 26 valores y que el archivo baja de 106 a unas 35 líneas
- [x] 3.3 **Verificar el lote**: `npx tsc --noEmit` limpio, `npm test` con 89 casos y `npm run build` con exit 0

## 4. Documentar lo que se conserva

- [x] 4.1 Añadir a `docs/DEUDA-TECNICA.md` la entrada de los **7 primitivos de Catalyst**: que se conservan por decisión del equipo aunque no tengan consumidores, para que un detector de huérfanos no los proponga otra vez; verificar que los nombra a los 7
- [x] 4.2 Añadir la entrada de **`CreateProjectFormData`**: vive dentro de `components/tables/projects-table-with-new-project-button.tsx:30`, un componente de 1.049 líneas, cuando es un tipo de dominio. Registrar que llegó a estar declarada 4 veces y que la divergencia ya ocurrió: la viva tiene 12 campos y las otras 3 se quedaron en 11, sin `assetToken` (`SPON-01/02`)
- [x] 4.3 Añadir la entrada de **creación de proyectos**: hoy solo sponsor. Si provider la necesita, el camino es cambiar `provider/my-projects/page.tsx` de `ProjectsTable` a `ProjectsTableWithNewProjectButton` con `showCreateModal={true}`; no resucitar los `actions.ts` eliminados, que son Server Actions superados y sin `assetToken`
- [x] 4.4 Añadir la entrada de **`COUNTRY_REGION_OPTIONS`**: se conserva porque tiene consumidores y porque el backend, aunque tiene los países, todavía no los expone por API. Registrar que es tarea de backend y que ya quedó anotada de ese lado
- [x] 4.5 Añadir la entrada de **`qrcode.react`**: quedó como dependencia sin consumidor tras eliminar `payment-modal.tsx`. No se quitó porque el npm local regenera `package-lock.json` perdiendo las entradas de peer dependencies, entre ellas `@testing-library/dom`, y eso rompe los 9 tests con entorno jsdom
- [x] 4.6 Verificar que `docs/README.md` sigue listando `DEUDA-TECNICA.md` y que los enlaces relativos nuevos resuelven

## 5. Cierre

- [x] 5.1 Verificar que no se tocó nada fuera de alcance: ningún componente en uso, ninguna página, ninguna ruta, ni `src/lib/config.ts`, ni `config.server.ts`, ni `src/types/env.d.ts`
- [x] 5.2 Verificar que los 7 primitivos de Catalyst siguen presentes en `src/components/`
- [x] 5.3 Verificación final: `npx tsc --noEmit` limpio, `npm test` con 89 casos y ningún fallo, `npm run build` con exit 0
- [x] 5.4 Crear `summary.md` en la carpeta del cambio, con qué se hizo, por qué, los desvíos respecto del plan, y una descripción de commit de 30 palabras como máximo
