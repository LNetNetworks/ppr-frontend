## Why

El repositorio arrastra **7 archivos que ningún otro importa** (1.664 líneas) y **6 constantes sin un solo
consumidor** en `src/types/enums.ts`. No es solo peso muerto: esconde qué versión del código es la vigente.

Al revisarlos uno por uno apareció que conviven tres generaciones del mismo código, y **ninguna de las huérfanas es
la más nueva**:

```
  GENERACION      ENUMS DEL BACKEND   assetToken   QUIEN LA USA
  -------------   -----------------   ----------   ----------------------------
  1. vieja              no                no       los componentes base
                                                   + 4 de los huerfanos
  2. media              si                no       grid-projects-with-new
                                                   (huerfano)
  3. actual             si                si       los 3 forks en uso
```

La consecuencia concreta: `CreateProjectFormData` está declarada **cuatro veces**, y la única viva tiene 12 campos
mientras las otras tres se quedaron en 11. El campo que falta es `assetToken`, que es el requisito `SPON-01/SPON-02`
de [`docs/requirements.md`](../../../docs/requirements.md). El requisito se implementó en una copia y las otras tres
no se enteraron.

Tres de las seis constantes muertas de `enums.ts` tampoco están sin usar por olvido: **fueron reemplazadas** por el
fetch a `GET /enums`, que los componentes vigentes ya consultan.

## What Changes

### Eliminar 7 archivos sin importadores — 1.664 líneas

| Archivo | Líneas | Por qué |
|---|---|---|
| `src/components/grids/grid-projects-with-new-project-button.tsx` | 877 | Fork de `grid-projects.tsx`. Generación media: consulta enums del backend pero nunca recibió `assetToken`. La familia *grid* la usa `user`, que no crea proyectos |
| `src/components/tables/contributions-table.tsx` | 198 | Componente completo —estados de carga y vacío, callbacks de edición y borrado, 7 encabezados y 7 celdas consistentes— que ninguna página monta. Su hermano `contribution-modal.tsx` sí se usa, en 2 lugares |
| `src/components/payment-modal.tsx` | 165 | **Simulación, no funcionalidad**: dirección de wallet hardcodeada en la línea 16, ningún llamado a la API, y un `setTimeout` de 3 segundos que declara éxito con un monto fijo de $100.000. Único consumidor de `qrcode.react` |
| `src/app/(app)/sponsor/my-projects/actions.ts` | 130 | Server Actions que ninguna página importa. El repo resolvió la creación por el camino del componente cliente |
| `src/app/(app)/provider/my-projects/actions.ts` | 130 | Idéntico al anterior salvo dos líneas: el argumento de `revalidatePath` |
| `src/components/stage-details-header.tsx` | 118 | Construida y nunca conectada. Su hermano `project-details-header.tsx` se usa en 9 lugares |
| `src/types/types.ts` | 46 | Cuatro duplicados internos: `EnumValue` (versión desactualizada de la de `types/api.ts:179`), y tres uniones escritas a mano de arrays que ya existen en `enums.ts` |

### Eliminar 6 constantes sin consumidores de `src/types/enums.ts`

`PROJECT_TYPES`, `PROJECT_STATUS`, `PHASE_PROJECT_STATUS`, `PHASE_PROJECT_TASK_STATUS`, `AUDIT_STATUS`,
`EVIDENCE_STATUS`.

Las tres de estado tienen equivalente vivo en el backend (`projectStatus`, `phaseProjectStatus`,
`phaseProjectTaskStatus`), que los componentes vigentes consultan con `getBackendEnumValues`. El archivo pasa de 106
líneas a unas 35.

**`COUNTRY_REGION_OPTIONS` se conserva**: tiene consumidores reales y el backend, aunque tiene los países, todavía no
los expone por API.

### Eliminar `STATUS_BADGE_COMPACT_BASE_CLASS` de `src/lib/status-styles.ts`

Su único consumidor es `stage-details-header.tsx`, que se elimina en este mismo cambio. Sin él, el export queda
muerto. Su hermano `STATUS_BADGE_BASE_CLASS` tiene 6 consumidores y no se toca.

### Registrar cinco decisiones en `docs/DEUDA-TECNICA.md`

1. **Los 7 primitivos de Catalyst se conservan a propósito** (`switch`, `combobox`, `listbox`, `radio`, `pagination`,
   `alert`, `stacked-layout`), aunque hoy no se usen. Para que nadie los borre creyendo que son basura.
2. **`CreateProjectFormData` vive dentro de un componente**, no en `src/types/`.
3. **Creación de proyectos**: hoy solo sponsor; el camino si provider la necesita.
4. **`COUNTRY_REGION_OPTIONS`**: el backend tiene los países pero no los expone; es tarea de backend.
5. **`qrcode.react`**: queda como dependencia sin consumidor, y por qué no se pudo quitar.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. `openspec/specs/` está vacío, y lo que se elimina no lo referencia ningún archivo: ni componentes, ni
páginas, ni rutas. El cambio declara `skip_specs: true`.

## Non-goals

- **No se eliminan los 7 primitivos de Catalyst**, aunque el detector los marque como huérfanos. Decisión explícita
  del equipo: se conservan como librería de componentes.
- **No se toca `src/types/env.d.ts`**, pese a figurar en el inventario de huérfanos. Es una declaración `ambient` de
  la que depende `src/lib/config.ts`; borrarla rompe el build. Ver diseño D2.
- **No se borra `src/types/enums.ts` entero.** `COUNTRY_REGION_OPTIONS` se usa, y depende de que el backend exponga
  los países.
- **No se unifican los forks `*-with-new-X-button`** que siguen en uso. Solo se elimina el que nadie importa.
- **No se centraliza la prioridad de roles** ni los literales de estado. Son cambios aparte.
- **No se quita `qrcode.react` de `package.json`.** Su único consumidor, `payment-modal.tsx`, sí se elimina, pero
  quitar la dependencia obliga a regenerar `package-lock.json`, y el npm disponible en el entorno de desarrollo
  elimina al escribirlo las 12 entradas de peer dependencies. Entre ellas `@testing-library/dom`, peer de
  `@testing-library/react` y no declarada como dependencia directa: sin ella los 9 tests con entorno jsdom fallan.
  Ya ocurrió dos veces en este repositorio. Queda registrado en `DEUDA-TECNICA.md` junto con la causa.
- **No se mueve `CreateProjectFormData` a `src/types/`.** Tres de sus cuatro declaraciones desaparecen al borrar sus
  archivos; mover la que queda es otro cambio, registrado en la deuda.

## Impact

**Roles afectados: ninguno.** Nada de lo que se elimina se renderiza en las superficies de `sponsor`, `provider`,
`user` ni `verifier`.

| Área | Impacto |
|---|---|
| Archivos eliminados | 7 (1.664 líneas) |
| `src/types/enums.ts` | de 106 a ~35 líneas |
| Dependencias | Sin cambios. `qrcode.react` queda sin consumidor, registrado en la deuda (ver *Non-goals*) |
| `src/lib/status-styles.ts` | pierde `STATUS_BADGE_COMPACT_BASE_CLASS`, cuyo único consumidor se elimina |
| `CreateProjectFormData` | de 4 declaraciones a 1 |
| Tests | 22 archivos y 89 casos deben seguir pasando sin modificarse |
| Documentación | 5 entradas nuevas en `docs/DEUDA-TECNICA.md` |

**Riesgo principal:** el inventario lo produjo un detector propio basado en expresiones regulares sobre los imports,
y **ya generó un falso positivo** —`env.d.ts`— que habría roto el build. Cada lote se elimina y se verifica con
`tsc`, tests y build antes de pasar al siguiente. Ver diseño D2.

