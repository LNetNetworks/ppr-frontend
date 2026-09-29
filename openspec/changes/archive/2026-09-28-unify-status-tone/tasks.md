## 1. Línea base

- [x] 1.1 Confirmar el punto de partida: `npx tsc --noEmit` limpio, `npm test` con 22 archivos y 89 casos, `npm run build` con exit 0
- [x] 1.2 Listar los consumidores actuales con `grep -rlw "getProjectStatusClass\|getWorkflowStatusClass" src`; verificar que son **7 archivos**, incluido `src/components/tables/projects-table.tsx`, que no tiene importadores pero sí entra en la compilación

## 2. Unificar `src/lib/status-styles.ts`

- [x] 2.1 Reemplazar `getProjectStatusTone` y `getWorkflowStatusTone` por una sola `getStatusTone` con el mapa acordado (D1): `pending`→`warning`, `inprogress`→`info`, `completed` y `closed`→`success`, `canceling` y `canceled`→`danger`, resto→`neutral`; verificar que los seis estados están contemplados y que `STATUS_TONE_CLASS` no cambia
- [x] 2.2 Reemplazar `getProjectStatusClass` y `getWorkflowStatusClass` por una sola `getStatusClass` (D2); verificar que `getToneClass` y `normalizeStatus` siguen siendo internas, sin `export` innecesario
- [x] 2.3 Verificar que `npx tsc --noEmit` **ahora falla**, señalando los 7 consumidores. Si no falla, alguno no se migró por accidente y hay que revisar el inventario de 1.2

## 3. Migrar los consumidores

- [x] 3.1 Migrar los 4 que usaban `getProjectStatusClass`: `components/projects-table.tsx`, `components/project-details-header.tsx`, `components/tables/projects-table.tsx` y `components/tables/projects-table-with-new-project-button.tsx`; verificar que solo cambia el import y el nombre de la llamada
- [x] 3.2 Migrar los 3 que usaban `getWorkflowStatusClass`: `components/tables/tasks-table.tsx`, `components/tables/stages-table.tsx` y `components/tables/stages-table-with-new-stage-button.tsx`; mismo criterio
- [x] 3.3 Verificar que `grep -rn "getProjectStatusClass\|getWorkflowStatusClass\|getProjectStatusTone\|getWorkflowStatusTone" src` no devuelve nada
- [x] 3.4 **Verificar el lote**: `npx tsc --noEmit` limpio, `npm test` con 89 casos y `npm run build` con exit 0

## 4. Comprobación visual

- [x] 4.1 **No se comprueba visualmente**, por decisión del equipo. El cambio se cierra sin haber visto los colores resultantes en la aplicación
- [x] 4.2 Dejar registrado en `summary.md` qué habría que mirar, para quien revise el MR o encuentre un color inesperado después: en las pantallas de proyecto, `inprogress` pasa de verde a azul, y `completed` y `closed` de azul a verde

## 5. Documentar lo que no se tocó

- [x] 5.1 Añadir a `docs/DEUDA-TECNICA.md` la entrada de los **literales de estado que son reglas de negocio**: `EXECUTED_AUDIT_STATUSES` en `audit-modal.tsx:27` y `requiresCancellationDescription` en las tablas de tareas y etapas. Registrar que no pueden venir del backend porque son decisiones de producto, y que `requiresCancellationDescription` implementa el requisito `STAG-08`
- [x] 5.2 Añadir la entrada de las **comparaciones sueltas** en dashboards, `project-card.tsx` y `project-details-header.tsx`: repiten `status === 'x'` sin constante. Registrar que la solución es derivar un tipo `Status` desde los enums del backend para que el compilador avise ante un caso faltante, y que toca 14 archivos
- [x] 5.3 Verificar que `docs/README.md` sigue listando `DEUDA-TECNICA.md` y que los enlaces relativos nuevos resuelven

## 6. Cierre

- [x] 6.1 Verificar que `src/lib/status-styles.ts` quedó con un solo mapa de estados y un solo punto de entrada público
- [x] 6.2 Verificar que no se tocó nada fuera de alcance: ni `status-labels.ts`, ni `src/lib/config.ts`, ni `next.config.mjs`, ni `public/`
- [x] 6.3 Verificación final: `npx tsc --noEmit` limpio, `npm test` con 89 casos y ningún fallo, `npm run build` con exit 0
- [x] 6.4 Crear `summary.md` en la carpeta del cambio, con qué se hizo, por qué, los desvíos respecto del plan, y una descripción de commit de 30 palabras como máximo
