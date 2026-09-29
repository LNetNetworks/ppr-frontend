# Resumen — unify-status-tone

## Qué se hizo

`src/lib/status-styles.ts` tenía **dos funciones de tono que discrepaban en cuatro de seis estados**. Ahora hay una.

```
  ANTES                                DESPUES
  --------------------------------     ---------------------------
  getProjectStatusTone()               getStatusTone()
  getWorkflowStatusTone()                un solo mapa
  getProjectStatusClass()              getStatusClass()
  getWorkflowStatusClass()               un solo punto de entrada
  getToneClass()  exportada              interna
  65 lineas                            46 lineas
```

El mapa quedó con el criterio acordado —**azul mientras algo ocurre, verde cuando terminó bien**—, que es el que ya
usaban las tablas de etapas y tareas:

```
  pending      warning   ambar
  inprogress   info      AZUL
  completed    success   VERDE
  closed       success   VERDE
  canceling    danger    ROJO
  canceled     danger    rojo
  (otro)       neutral   gris
```

Se migraron los 7 consumidores. Solo cambian el import y el nombre de la llamada; ninguno tiene lógica nueva.

## Por qué

El mismo estado se veía de colores distintos según la pantalla. Lo más confuso: **el verde significaba "terminado"
en las tablas de etapas y "en curso" en las de proyectos**. Un usuario que cambiaba de pantalla tenía que reaprender
qué quería decir cada color.

`canceling` era además una omisión: la función de proyectos no lo contemplaba y caía en gris.

Es la causa raíz del síntoma que [`role-ui-inconsistencies.md`](../../../docs/role-ui-inconsistencies.md) registró
sin llegar al origen.

## Desvíos respecto del plan

**El plan decía 6 consumidores y son 7.** La propuesta original dejaba
`src/components/tables/projects-table.tsx` fuera del alcance por no tener importadores. Es falso: `tsconfig.json`
incluye `**/*.tsx`, así que `tsc` lo type-chequea igual y la compilación habría fallado. Se corrigió la propuesta y
el diseño antes de tocar código, y el archivo se migró como los demás.

Migrar un archivo muerto es trabajo que se tirará cuando se decida eliminarlo, pero son dos líneas.

Fuera de eso, la ejecución siguió el plan. La decisión D3 —quitar las funciones viejas primero y dejar que `tsc`
señale a quién falta migrar— funcionó: marcó exactamente los 7, incluido el huérfano.

## Lo que este cambio NO verifica

**No hay ningún test que cubra `status-styles.ts` ni los componentes que lo consumen.** `tsc` garantiza que no quede
ninguna llamada a las funciones eliminadas, y eso cubre la mecánica. Que el color resultante sea el correcto solo se
comprueba mirando la pantalla.

**El equipo decidió no hacer esa comprobación.** El cambio se cierra sin que nadie haya visto los colores
resultantes en la aplicación: `tsc` garantiza que compila y que ningún consumidor quedó llamando a una función
eliminada, y nada más.

Si aparece un color inesperado, el lugar a mirar es el único mapa, en `getStatusTone`.

## Verificación

| Comprobación | Resultado |
|---|---|
| `tsc` falla al quitar las funciones viejas | Sí: señaló los 7 consumidores |
| Nombres viejos en `src/` | 0 |
| `npx tsc --noEmit` | limpio |
| `npm test` | 22 archivos, 89 casos, igual que antes |
| `npm run build` | exit 0 |
| Enlaces relativos rotos fuera de archivados | 0 |
| Comprobación visual de colores | **no se hizo**, por decisión del equipo |

## Qué mirar al revisar

En una tabla de **proyectos** y en una de **etapas** del mismo proyecto, un mismo estado debe verse igual. Los tres
colores que cambian están todos del lado de proyectos:

- `inprogress`: verde → **azul**
- `completed`: azul → **verde**
- `closed`: azul → **verde**

Las tablas de etapas y tareas no deberían cambiar en nada.

## Descripción para el commit

```
Replace the two diverging status tone maps with one, so a status renders the same colour
on every screen, and migrate the seven consumers to a single getStatusClass.
```

*(26 palabras)*
