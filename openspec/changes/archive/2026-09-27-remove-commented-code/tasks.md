## 1. Línea base

- [x] 1.1 Confirmar el punto de partida: `npx tsc --noEmit` limpio, `npm test` con 22 archivos y 89 casos, `npm run build` con exit 0; anotar los valores
- [x] 1.2 Regenerar el inventario de código comentado y verificar que da **32 renglones en 7 archivos** (más el falso positivo conocido de `sync-pok-modal.tsx:24`, que es una nota explicativa y no se toca)

## 2. Corregir la tabla de tareas

Todo en `src/components/tables/tasks-table-with-new-task-button.tsx`.

- [x] 2.1 Alinear los **dos esqueletos** (tabla de carga, línea 522, y tabla vacía, línea 547) con la tabla real: eliminar su `<TableHeader>Assigned To</TableHeader>`, reordenar las fechas a "Created At" antes que "Due Date", y cambiar los dos `colSpan={7}` a `colSpan={6}`; verificar que los tres bloques de encabezados del archivo quedan idénticos entre sí
- [x] 2.2 En la celda rotulada `{/** created at */}`, escribir `task.createdAt` y eliminar el `new Date().toLocaleString()`. **No descomentar lo que hay**: esa celda tiene comentado `task.dueDate`, que es el campo de la otra columna; verificar que el dato coincide con su encabezado "Created At"
- [x] 2.3 En la celda rotulada `{/** due date */}`, escribir `task.dueDate` y eliminar el `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString()`. Mismo cruce que la anterior; verificar que ambas celdas usan el mismo formateo y el fallback `'N/A'`
- [x] 2.4 **No modificar** los comentarios de etiqueta `{/** created at */}` y `{/** due date */}`: ya coinciden con sus encabezados; verificar que siguen intactos
- [x] 2.5 Eliminar el filtro por `assignedTo` del buscador (líneas 503 y 506); verificar que buscar por nombre, estado e ID sigue funcionando
- [x] 2.6 Eliminar el bloque comentado del input `assignedTo` del formulario (líneas 1057-1075); verificar con `grep -n "assignedTo\|Assigned To" src/components/tables/tasks-table-with-new-task-button.tsx` que el archivo queda sin ninguna aparición
- [x] 2.7 Conservar comentado el bloque del input `dueDate` (líneas 1038-1055), añadiendo arriba una referencia de una línea a `docs/DEUDA-TECNICA.md`; verificar que el tipo `Task` sigue declarando `dueDate` en `src/types/api.ts`
- [x] 2.8 **Verificar**: `npx tsc --noEmit` limpio y `npm run build` con exit 0. Comprobar a ojo en `/provider/projects/[id]/tasks` que las dos fechas muestran datos de la tarea y no valores calculados al vuelo, y que "Created At" y "Due Date" no están intercambiadas

## 3. Eliminar los restos del template

- [x] 3.1 Eliminar de los 4 dashboards (`dashboard-content-sponsor.tsx`, `dashboard-content-provider.tsx`, `dashboard-content-user.tsx`, `dashboard-content-verifier.tsx`) el bloque comentado `<Select name="period">` con sus 4 `<option>`; verificar que ningún dashboard conserva referencias a `period`
- [x] 3.2 Eliminar de `dashboard-content-sponsor.tsx` y `dashboard-content-provider.tsx` el bloque `PATREONS CONTRIBUTIONS TABLE SECTION` con su `<Subheading>` y su `<ProjectsTable>`; verificar con `grep -rn "Patreons" src` que no queda ninguna aparición
- [x] 3.3 **No eliminar** las 6 métricas sin usar de cada dashboard (D4: son variables sin usar, no código comentado, y ese frente está en pausa); verificar que siguen presentes y quedan registradas en la tarea 5.2
- [x] 3.4 **Verificar**: `npx tsc --noEmit` limpio, `npm test` con 89 casos y `npm run build` con exit 0; confirmar que los 4 dashboards siguen renderizando sus `<Stat>` y sus gráficos

## 4. Añadir referencias en el código que se conserva

- [x] 4.1 En `src/components/tables/users-permission-table.tsx`, completar el comentario existente `{/* Deletion disabled by request */}` con una referencia a `docs/DEUDA-TECNICA.md`; verificar que el bloque del botón de borrado sigue intacto
- [x] 4.2 En `src/components/tables/stages-table.tsx`, añadir sobre el item `Edit` comentado una línea que indique que corresponde al requisito `STAG-07` y apunte a `docs/DEUDA-TECNICA.md`; verificar que el bloque comentado no se modifica
- [x] 4.3 Verificar que ambos comentarios están en inglés y ubicados arriba del bloque que explican, no intercalados

## 5. Documentar la deuda

- [x] 5.1 Crear `docs/DEUDA-TECNICA.md` con los dos casos conservados: el borrado de colaboradores apagado a pedido y el stub de `STAG-07`, cada uno con archivo, líneas y la razón por la que sobrevive; verificar que las referencias de archivo y línea son correctas
- [x] 5.2 Añadir la entrada de las **6 métricas muertas por dashboard** (`completedProjects`, `cancelledProjects`, `activeProjects`, `inactiveProjects`, `totalAllocated`, `totalPaid`), indicando que cada una aparece una sola vez, en su propia declaración; verificar con `tsc --noUnusedLocals` que la lista está completa
- [x] 5.3 Añadir la entrada de **`assignedTo`, eliminado por completo de la interfaz**, nombrando los cuatro sitios que habría que tocar para rehabilitarlo: los 2 encabezados, el filtro del buscador y el input del formulario, con archivo y línea de la versión anterior. Indicar que el campo existe en el tipo `Task` y que falta confirmar si el backend lo puebla
- [x] 5.4 Añadir la entrada del input `dueDate` del formulario: se conserva comentado porque el dato ya se muestra en la tabla y no poder cargarlo es una carencia accionable; pendiente de decisión de producto
- [x] 5.5 Añadir la entrada de `src/components/grids/grid-projects-with-new-project-button.tsx`: 878 líneas sin importadores, fork por copy-paste de `grid-projects.tsx`, pendiente de decidir si se elimina
- [x] 5.6 Enlazar `DEUDA-TECNICA.md` desde `docs/README.md` en la sección de documentación vigente; verificar que el índice sigue cubriendo todos los archivos de `docs/`

## 6. Cierre

- [x] 6.1 Regenerar el inventario de código comentado y verificar su **composición**, no solo el total: deben quedar los de `users-permission-table` (borrado apagado a pedido), los de `stages-table` (stub de `STAG-07`), y el input `dueDate` del formulario de tareas. **No debe quedar ninguno** en los 4 dashboards, en las celdas de fecha de la tabla, ni ninguno que mencione `assignedTo`
- [x] 6.2 Verificar que no se tocó nada fuera de alcance: `src/lib/`, `src/types/`, `next.config.mjs`, `Dockerfile` y `public/` sin cambios
- [x] 6.3 Verificación final: `npx tsc --noEmit` limpio, `npm test` con 89 casos y ningún fallo, `npm run build` con exit 0
- [x] 6.4 Crear `summary.md` en la carpeta del cambio, con qué se hizo, por qué, los desvíos respecto del plan, y una descripción de commit de 30 palabras como máximo
