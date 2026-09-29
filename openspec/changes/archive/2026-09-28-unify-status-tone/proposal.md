## Why

`src/lib/status-styles.ts` tiene **dos funciones que resuelven lo mismo y discrepan**: `getProjectStatusTone` y
`getWorkflowStatusTone`. El mismo estado se pinta de colores distintos según qué tabla lo renderice.

```
  ESTADO        tablas de PROYECTO      tablas de ETAPA y TAREA
  -----------   --------------------    -----------------------
  pending       ambar                   ambar
  inprogress    VERDE                   AZUL
  completed     AZUL                    VERDE
  closed        AZUL                    VERDE
  canceling     gris                    ROJO
  canceled      rojo                    rojo
```

Cuatro de los seis estados no coinciden. Un proyecto en curso se ve verde; una etapa en curso, azul. Un proyecto
terminado se ve azul; una etapa terminada, verde — es decir, **el color que significa "terminado" en una pantalla
significa "en curso" en la otra**.

Es la causa raíz del síntoma que documenta [`docs/role-ui-inconsistencies.md`](../../../docs/role-ui-inconsistencies.md),
que lo registró como inconsistencia sin llegar al origen.

## What Changes

### Una sola función de tono

Las dos funciones se reemplazan por una, con el mapa de las tablas de etapa y tarea, que es el semánticamente
correcto: **azul mientras algo ocurre, verde cuando terminó bien**.

```
  pending      warning   ambar    esperando
  inprogress   info      azul     en curso
  completed    success   verde    termino bien
  closed       success   verde    termino bien
  canceling    danger    rojo     se esta cancelando
  canceled     danger    rojo     cancelado
  (otro)       neutral   gris
```

`canceling` no es una discrepancia real: `getProjectStatusTone` no lo contempla y cae en `neutral` por defecto.
Adoptar el comportamiento de la otra función lo corrige.

### Un solo punto de entrada público

Hoy los componentes usan dos envoltorios, `getProjectStatusClass` y `getWorkflowStatusClass`, que pasan a ser uno:
`getStatusClass`.

| Función | Consumidores hoy | Después |
|---|---|---|
| `getProjectStatusTone` | 0 (solo su envoltorio) | eliminada |
| `getWorkflowStatusTone` | 0 (solo su envoltorio) | renombrada a `getStatusTone` |
| `getToneClass` | 0 (solo los envoltorios) | se conserva, sigue siendo interna |
| `getProjectStatusClass` | 4 archivos | eliminada |
| `getWorkflowStatusClass` | 3 archivos | eliminada |
| `getStatusClass` | — | nueva, la usan los 6 consumidores vivos más el huérfano |

Se actualizan **los 7 archivos consumidores**, incluido `src/components/tables/projects-table.tsx`, que **no tiene
importadores pero sí entra en la compilación**: `tsconfig.json` incluye `**/*.tsx`, así que `tsc` lo type-chequea. Si
se eliminan las funciones viejas sin migrarlo, la compilación falla.

Migrar un archivo muerto es trabajo que se tirará cuando se decida eliminarlo, pero son dos líneas —el import y una
llamada— y la alternativa es dejar el build roto.

### Registrar en `docs/DEUDA-TECNICA.md` los literales de estado que no se tocan

De los 57 literales de estado repartidos por el repositorio, este cambio resuelve los de presentación. Los otros dos
grupos se documentan:

- **Reglas de negocio**: `EXECUTED_AUDIT_STATUSES` en `audit-modal.tsx:27`,
  `requiresCancellationDescription` en las tablas de tareas y etapas. No pueden venir del backend: son decisiones de
  producto. `requiresCancellationDescription` es el requisito `STAG-08`.
- **Comparaciones sueltas** en dashboards, `project-card.tsx` y `project-details-header.tsx`: repiten
  `status === 'x'` sin constante.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío y no hay capacidad documentada que describa los colores de estado.

El cambio declara `skip_specs: true`, con una salvedad: **es un cambio visible**. Los proyectos en estado
`inprogress`, `completed` y `closed` cambian de color en las tablas de proyectos y en `project-card`. Es la
corrección buscada, no un efecto colateral.

## Non-goals

- **No se migran los 57 literales de estado a constantes.** Los de presentación se resuelven al unificar; los de
  regla de negocio y comparación suelta se registran en la deuda. Migrarlos toca 14 archivos y no corrige nada
  visible.
- **No se deriva un tipo `Status` desde los enums del backend.** Haría que el compilador avisara ante un estado sin
  caso, pero es un cambio aparte.
- **No se cambian los colores de `STATUS_TONE_CLASS`.** `info` sigue siendo azul y `success` verde; lo que cambia es
  qué estado recibe cada tono.
- **No se unifican las etiquetas de estado** de `status-labels.ts`. Es otro módulo y otro problema.

## Impact

**Roles afectados: los cuatro.** El color de estado aparece en las tablas de proyectos, etapas y tareas, que usan
`sponsor`, `provider`, `user` y `verifier`.

| Área | Impacto |
|---|---|
| `src/lib/status-styles.ts` | De 65 a unas 40 líneas: dos funciones de tono pasan a una, dos envoltorios a uno |
| Consumidores | 7 archivos cambian el import y la llamada. Sin cambios de lógica. Uno de ellos no tiene importadores pero entra en la compilación |
| Cambio visible | Proyectos `inprogress`: verde → azul. Proyectos `completed` y `closed`: azul → verde. Etapas y tareas: sin cambios |
| Tests | 22 archivos y 89 casos deben seguir pasando sin modificarse |

**Riesgo principal:** no hay ningún test que cubra `status-styles.ts` ni los componentes que lo consumen. `tsc`
garantiza que no queden llamadas a las funciones eliminadas, pero **que el color sea el correcto solo se comprueba
mirando la pantalla**.
