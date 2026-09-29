## Why

Hay **32 líneas de código comentado repartidas en 7 archivos**. Al clasificarlas una por una resultó que solo 15 son
basura: las otras 17 esconden una decisión de producto, un requisito pendiente y **un defecto activo en producción**.

El hallazgo que justifica el cambio está en la tabla de tareas del provider
(`/provider/projects/[id]/tasks`). El archivo declara **tres tablas**, y no coinciden entre sí:

```
  TABLA                    ENCABEZADOS                                          CELDAS
  ----------------------   --------------------------------------------------   ------
  1. cargando  (lin 522)   ID Name Status [Assigned To] Due Date Created At Ac     -
  2. vacia     (lin 547)   ID Name Status [Assigned To] Due Date Created At Ac     -
  3. REAL      (lin 571)   ID Name Status Created At Due Date Actions               6
```

Las dos primeras son esqueletos: muestran un único mensaje con `colSpan={7}` y nunca renderizan filas. Declaran una
columna **"Assigned To" que la tabla real no tiene**, y además invierten el orden de las dos fechas.

La tabla real está alineada —6 encabezados, 6 celdas— pero sus dos celdas de fecha están rotas:

```
  ENCABEZADO      QUE MUESTRA HOY                  QUE HAY COMENTADO ADENTRO
  -------------   ------------------------------   ---------------------------
  Created At      new Date()          <- ahora      {/* task.dueDate */}    <- cruzado
  Due Date        new Date(now + 7d)  <- inventada  {/* task.createdAt */}  <- cruzado
```

Dos defectos: **se fabrican dos fechas** —una es la hora actual, la otra es hoy más siete días presentada como
vencimiento de la tarea— y **el código comentado está cruzado**: cada celda tiene comentado el dato de la otra
columna. Eso es lo que alguien detectó al comentarlas, y en vez de corregir el cruce dejó valores de relleno.

Los comentarios de etiqueta `{/** created at */}` y `{/** due date */}` sí son correctos y coinciden con sus
encabezados.

Borrar los comentarios sin leerlos habría dejado ambos defectos intactos y eliminado la pista de qué debía ir en cada
celda.

## What Changes

### Eliminar — restos del template Catalyst

Los 4 dashboards (`sponsor`, `provider`, `user`, `verifier`) tienen los mismos dos bloques copiados:

```tsx
{/* <Select name="period"> ... <option value="last_week">Last week</option> ... */}
{/** PATREONS CONTRIBUTIONS TABLE SECTION */}
{/* <Subheading className="mt-14">Patreons Contributions</Subheading> */}
```

"Patreons" es vocabulario del template y el filtro de período nunca se conectó a nada. **15 líneas.**

### Corregir — la tabla de tareas

En `tasks-table-with-new-task-button.tsx`:

1. **Alinear los dos esqueletos con la tabla real**: eliminar de ellos el encabezado "Assigned To" (líneas 528 y
   553), poner las dos fechas en el mismo orden que la tabla real —"Created At" antes que "Due Date"— y ajustar los
   dos `colSpan={7}` a `colSpan={6}`.
2. **Escribir el dato correcto en cada celda de fecha**, deshaciendo el cruce: `task.createdAt` bajo "Created At" y
   `task.dueDate` bajo "Due Date". No alcanza con descomentar lo que hay, porque cada celda tiene comentado el campo
   de la otra. Eliminar las dos fechas fabricadas.
3. **Eliminar el filtro por `assignedTo` del buscador** (líneas 503 y 506): buscaría por un dato que ninguna pantalla
   muestra.
4. **Eliminar el bloque comentado del input `assignedTo`** del formulario de creación (líneas 1057-1075).

Los comentarios de etiqueta `{/** created at */}` y `{/** due date */}` **no se tocan**: ya coinciden con sus
encabezados.

`assignedTo` sale entero de la interfaz: encabezado, filtro e input. Dejar cualquiera de los tres comentado sería
residuo de un campo que la UI ya no conoce, justo el patrón que este cambio elimina. Los cuatro sitios quedan
registrados en `DEUDA-TECNICA.md` para poder rehabilitarlo de una sola pasada.

El input `dueDate` del formulario **sí queda comentado**, con una referencia a la deuda: ese dato ahora se muestra en
la tabla, así que no poder cargarlo es una carencia accionable y conviene marcarla donde está.

### Conservar y documentar — decisión de producto

`users-permission-table.tsx` lleva la explicación escrita: `{/* Deletion disabled by request */}`. El borrado de
colaboradores se apagó a pedido y el código se guardó por si se reactiva. **No se toca**, pero se registra para que
nadie lo confunda con basura.

### Conservar y documentar — requisito pendiente

`stages-table.tsx` tiene comentado un item "Edit" que apunta a `/projects/:id/stages/:stageId/edit`, ruta que no
existe. Corresponde a **`STAG-07`** de `docs/requirements.md` (*"Stage editing uses the same form component/logic as
New Stage"*). **No se toca**, y se añade una referencia al requisito para que se entienda por qué sigue ahí.

### Crear `docs/DEUDA-TECNICA.md`

Registro de lo que se conserva a propósito y por qué, para que el próximo que pase no tenga que repetir esta
clasificación. Incluye los dos casos anteriores, los campos `dueDate`/`assignedTo` pendientes, las 6 métricas muertas
por dashboard, y el caso de `grid-projects-with-new-project-button.tsx` (878 líneas sin importadores, donde "muerto" y
"pendiente" también se confunden).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío y no hay capacidad documentada que describa la tabla de tareas.

El cambio declara `skip_specs: true`, pero conviene señalarlo con honestidad: **la corrección de las columnas de fecha
sí altera lo que el usuario ve**. Pasa de mostrar la hora actual a mostrar la fecha de creación real. Es restaurar el
comportamiento que las etiquetas ya prometían, no una funcionalidad nueva.

## Non-goals

- **No se rehabilitan los campos `dueDate` ni `assignedTo`** del formulario de tareas. El backend los soporta, pero
  volver a mostrarlos es decisión de producto.
- **No se implementa `STAG-07`.** Solo se documenta por qué el stub sigue comentado.
- **No se reactiva el borrado de colaboradores.** Se apagó a pedido y así queda.
- **No se eliminan las 6 métricas muertas de cada dashboard**, aunque estén en los mismos archivos que se tocan. Son
  variables sin usar, no código comentado, y pertenecen al cambio de limpieza que quedó en pausa. Se registran en
  `DEUDA-TECNICA.md`.
- **No se toca `grid-projects-with-new-project-button.tsx`.** Solo se documenta.

## Impact

**Roles afectados: los cuatro.** Los dashboards de `sponsor`, `provider`, `user` y `verifier` pierden líneas
comentadas —sin cambio visual— y la tabla de tareas afecta a `provider`, que es quien la usa.

| Área | Impacto |
|---|---|
| Archivos modificados | 5: los 4 dashboards y `tasks-table-with-new-task-button.tsx` |
| Archivos nuevos | `docs/DEUDA-TECNICA.md` |
| Archivos documentados sin tocar | `users-permission-table.tsx`, `stages-table.tsx` |
| Líneas comentadas | de 32 a 17, todas ellas justificadas y registradas |
| Cambio visible | La columna "created at" de la tabla de tareas deja de mostrar la hora actual |
| Tests | 22 archivos y 89 casos deben seguir pasando sin modificarse |

**Riesgo principal:** que la corrección de columnas se haga al revés y queden cruzadas otra vez. Lo mitiga que las
etiquetas `{/** created at */}` y `{/** due date */}` están en el código y dicen cuál es cuál; la verificación es
visual sobre datos reales, porque no hay test que cubra esa tabla.
