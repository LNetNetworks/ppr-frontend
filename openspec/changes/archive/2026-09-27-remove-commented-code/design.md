## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la motivación.

Lo que condiciona el enfoque:

- Los 32 renglones se detectaron con un script que distingue código comentado de prosa, pidiendo una señal sintáctica
  fuerte (`const`, `=>`, `<Componente`, cierre de bloque, punto y coma final). Marcó 8 archivos; uno era falso
  positivo, una nota en `sync-pok-modal.tsx` que contenía paréntesis.
- La clasificación no fue una conjetura: **tres de los cuatro casos tienen la explicación escrita en el propio
  código o en `docs/requirements.md`**.
- No existe ningún test que cubra la tabla de tareas ni los dashboards. La suite protege guards de rol, hooks,
  mappers y configuración.
- `tsconfig.json` no tiene `noUnusedLocals` activado, así que el compilador no ayuda a detectar lo que quede suelto.

## Goals / Non-Goals

**Goals:**

- Que cada renglón comentado que sobreviva tenga una razón escrita y localizable.
- Corregir el defecto que el comentario estaba tapando.
- Que la distinción hecha acá no haya que repetirla.

**Non-Goals:**

- Decidir sobre funcionalidad apagada. Este cambio documenta decisiones existentes, no las revisa.
- Limpiar variables sin usar, aunque estén en los mismos archivos.

## Decisions

### D1 — El criterio no es "comentado", es "por qué está comentado"

Un `grep` de código comentado da 32 renglones y la conclusión fácil es borrarlos todos. Al leerlos uno por uno:

```
  CASO                              SENAL                        DESTINO
  -------------------------------   --------------------------   ---------------
  users-permission-table    7 lin   "Deletion disabled by         conservar
                                     request" escrito arriba
  stages-table              2 lin   ruta /stages/:id/edit que     conservar
                                     no existe + STAG-07
  4 dashboards             15 lin   "Patreons", vocabulario del   BORRAR
                                     template Catalyst
  tasks-table               8 lin   etiquetas cruzadas contra     CORREGIR
                                     los datos
```

Solo 15 de 32 son basura. Un borrado indiscriminado habría eliminado la explicación de una decisión de producto, el
stub de un requisito planificado, y habría dejado el defecto de fechas intacto y ya sin pistas.

**Alternativa descartada:** borrar los 32 y confiar en que el historial guarda lo que haga falta. El historial guarda
el código pero no la razón, y nadie va a `git log` un archivo para entender por qué falta un botón.

### D2 — El defecto de la tabla se corrige acá, no se deriva

Está dentro del alcance porque **la corrección es exactamente resolver el código comentado**: escribir el dato que
corresponde a cada celda y borrar las fechas fabricadas. Derivarlo a otro cambio significaría dejar el comentario a
medias o borrarlo y perder la única pista de qué debía ir ahí.

Un detalle que condiciona la ejecución: **descomentar no alcanza**. Cada celda tiene comentado el campo de la otra
columna, así que descomentar tal cual reproduce el cruce que motivó que alguien las comentara. Hay que escribir
`task.createdAt` bajo "Created At" y `task.dueDate` bajo "Due Date".

Lo que sí queda fuera es rehabilitar los campos `dueDate` y `assignedTo` del formulario: eso es decidir qué se le
pide al usuario, no arreglar qué se le muestra.

**Alternativa descartada:** abrir un cambio aparte de corrección de defectos. Añade ceremonia a un arreglo cuyo
contexto se pierde al separarlo del comentario que lo explica.

### D2b — "Assigned To" se elimina de los esqueletos en vez de añadirse a la tabla real

La tabla que renderiza filas **nunca tuvo esa columna**: tiene 6 encabezados y 6 celdas, y está alineada. El
encabezado "Assigned To" existe solo en los dos esqueletos —el de carga y el de vacío—, que no renderizan filas y
cuyo `colSpan` abarca un único mensaje. Por eso la discrepancia nunca se vio: los esqueletos se muestran un instante
y sin datos debajo.

La evidencia apuntaba a completar la columna: el campo `assignedTo` está en el tipo `Task`, el formulario tiene su
input comentado, y **el buscador ya filtra por él** (líneas 503 y 506). Tres piezas de cuatro estaban hechas.

Aun así se elige eliminarla, por decisión del equipo. El criterio: no hay confirmación de que el backend pueble
`assignedTo`, y una columna que muestra "N/A" en todas las filas es peor que no tenerla.

Consecuencia: `assignedTo` **sale por completo de la interfaz**, y todo lo que lo sostenía se va con él.

```
  SE ELIMINA                                    SE CONSERVA COMENTADO
  ----------------------------------------      ----------------------------------
  <TableHeader>Assigned To</>  x2                input dueDate del formulario
  colSpan 7 -> 6               x2                (el dato SI se muestra en la
  filtro assignedTo del buscador (503, 506)       tabla: no poder cargarlo es una
  input assignedTo del formulario (1059-1075)     carencia real, marcada in situ)
```

El criterio distingue por si el campo existe en alguna pantalla, no por el tamaño del bloque:

- **`dueDate` se muestra** en la tabla una vez corregida, así que su input comentado señala algo accionable: ves la
  fecha pero no podés cargarla. Se conserva con una referencia a la deuda.
- **`assignedTo` no se muestra en ningún lado** tras este cambio. Un input comentado, un filtro comentado y un
  encabezado ausente serían tres residuos de un campo que la UI ya no conoce.

Rehabilitarlo sale del historial y de `DEUDA-TECNICA.md`, que registra los cuatro sitios con archivo y línea.

**Alternativa descartada:** agregar la celda con `task.assignedTo`. Es igual de barata y aprovecha el trabajo hecho,
pero se apoya en un supuesto sin verificar sobre lo que devuelve el backend.

**Alternativa descartada:** comentar el filtro y el input en vez de borrarlos. Deja código muerto comentado para un
campo que ninguna pantalla muestra, que es exactamente el patrón que este cambio viene a eliminar.

### D3 — Lo que se conserva se documenta fuera del código

Los dos casos que sobreviven ya tienen una marca en el archivo, pero desigual: `users-permission-table` dice
explícitamente *"Deletion disabled by request"*, mientras que el "Edit" de `stages-table` no dice nada — hay que
descubrir que la ruta no existe y cruzarlo con `requirements.md`.

En vez de engordar los comentarios en el código, la razón vive en `docs/DEUDA-TECNICA.md` y el código lleva una
referencia de una línea. Así la explicación se actualiza sin tocar el componente, y hay un solo lugar donde mirar.

**Alternativa descartada:** un comentario largo y autoexplicativo en cada sitio. Se desincroniza en cuanto el
requisito cambia de estado y nadie recuerda que ese texto existía.

### D4 — Las métricas muertas se registran, no se borran

Los 4 dashboards tienen 6 cálculos cada uno que no se renderizan (`completedProjects`, `totalAllocated`, …). Se
comprobó que **no los usa ni el código comentado**: cada uno aparece una sola vez, en su propia declaración.

Están en los mismos archivos que este cambio toca, así que borrarlos sería cómodo. Pero son variables sin usar, no
código comentado, y ese frente quedó explícitamente en pausa. Entran en `DEUDA-TECNICA.md` con archivo y línea.

**Alternativa descartada:** aprovechar el viaje. Mezclar dos criterios de limpieza en un cambio hace que el diff deje
de responder a una sola pregunta, y reabre algo que se decidió no abordar todavía.

## Impacto en el arranque y en la configuración de entorno

Ninguno. No se tocan `src/lib/config.ts`, `config.server.ts`, `next.config.mjs`, el `Dockerfile`, `public/env.js` ni
ningún archivo `.env*`. La aplicación arranca igual.

Para ejecutar el cambio hace falta un `.env.local`, como documenta `.env.example`, porque el build sigue requiriendo
las `NEXT_PUBLIC_*`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Corregir las columnas de fecha al revés y dejarlas cruzadas otra vez | Las etiquetas `{/** created at */}` y `{/** due date */}` están en el código y dicen cuál es cuál. Verificación visual sobre datos reales |
| No hay test que cubra la tabla de tareas ni los dashboards | Aceptado y declarado: la suite no puede validar este cambio. `tsc` y el build cubren que no se rompa nada; lo visible se comprueba a ojo |
| Borrar un bloque de dashboard que en realidad hacía falta | Los 4 archivos tienen los mismos dos bloques y ninguno referencia variables vivas; `tsc` lo confirma |
| `DEUDA-TECNICA.md` nace y nadie lo vuelve a mirar | Se enlaza desde `docs/README.md` y desde el código que documenta, con referencias en ambas direcciones |

## Migration Plan

Un MR sobre la rama `remove-comments`, con un commit por tipo de acción:

1. `fix(tasks): show real created-at and due-date instead of current time`
2. `chore(dashboards): remove Catalyst template leftovers`
3. `docs: record why the remaining commented code stays`

El orden pone primero el arreglo, para que quede aislado y sea fácil de revisar y revertir por separado de la
limpieza cosmética.

**Rollback:** cada commit por separado. Sin estado externo ni migración de datos.

## Open Questions

Ninguna. Las tres decisiones de producto que aparecieron —rehabilitar `dueDate`/`assignedTo`, implementar `STAG-07`,
reactivar el borrado de colaboradores— quedan registradas en `DEUDA-TECNICA.md` como pendientes del equipo, fuera del
alcance de este cambio.
