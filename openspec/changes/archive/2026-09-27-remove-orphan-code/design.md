## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la motivación y el mapa de las tres generaciones.

Lo que condiciona el enfoque:

- El inventario sale de un detector propio que busca, por cada archivo de `src/`, si algún otro lo importa por alias
  `@/...` o por ruta relativa. **Ya produjo un falso positivo**: marcó `src/types/env.d.ts`, que es una declaración
  `ambient` de la que depende `src/lib/config.ts`.
- Los componentes que se eliminan no tienen tests propios. La suite cubre guards de rol, hooks, mappers y la cascada
  de configuración: ninguno de los 7 archivos.
- Quitar `qrcode.react` obliga a regenerar `package-lock.json`, y una regeneración anterior con otra versión de npm
  eliminó entradas de peer dependencies y dejó 9 tests en rojo.
- `src/types/enums.ts` mezcla constantes muertas con una viva. No es un archivo que se borre, es uno que se poda.

## Goals / Non-Goals

**Goals:**

- Que no quede en el repositorio código que ningún archivo importa, salvo lo que se conserva por decisión explícita.
- Que esa decisión explícita quede escrita, para que el próximo detector de huérfanos no la deshaga.
- Que la eliminación sea verificable lote por lote, no un borrado masivo con comprobación al final.

**Non-Goals:**

- Decidir sobre código que sí tiene consumidores, aunque esté duplicado.
- Consolidar tipos o constantes más allá de eliminar lo que sobra.

## Decisions

### D1 — Los primitivos de Catalyst se conservan, y eso se documenta

El detector marca 7 componentes sin importadores: `switch`, `combobox`, `listbox`, `radio`, `pagination`, `alert`,
`stacked-layout`. Son 981 líneas.

No son código olvidado: son piezas de la librería de componentes del template. Las que se necesitaron —`button`,
`input`, `dialog`, `table`— se usan; estas todavía no.

El equipo decide conservarlas. Lo importante es que **quede escrito**: sin una entrada en `DEUDA-TECNICA.md`, el
próximo que corra un detector de huérfanos va a proponer borrarlas otra vez, y va a tener que repetir esta discusión.

**Alternativa descartada:** eliminarlas y recuperarlas del paquete original si hacen falta. Es defendible —es
exactamente el argumento que se aplicó a los otros grupos— pero el equipo prefiere tener el set completo disponible.

### D2 — El inventario son candidatos, no una orden de borrado

`src/types/env.d.ts` aparece en la lista porque nadie lo importa. No se importa un `.d.ts` ambient: el compilador lo
incluye por estar dentro de `include` en `tsconfig.json`. Declara la interfaz global `Window` con `__ENV`, de la que
depende `src/lib/config.ts`.

Borrarlo rompe el build.

La conclusión no es "salvar este archivo" sino **cómo se usa la lista**:

```
  detector  ->  lista de candidatos  ->  borrar un lote
                                              |
                                              v
                                    tsc + tests + build
                                              |
                              +---------------+---------------+
                              |                               |
                          todo verde                       falla
                              |                               |
                        siguiente lote            el archivo vuelve y se
                                                  anota por que la
                                                  heuristica lo marco mal
```

**Alternativa descartada:** afinar el detector para que entienda tipos ambient. Resuelve este caso y no los que no
conocemos. La verificación por lotes cubre todos.

### D3 — `enums.ts` se poda, no se borra

Seis de sus siete constantes no tienen consumidores. La séptima, `COUNTRY_REGION_OPTIONS`, sí.

De las seis, tres tienen equivalente vivo en el backend:

```
  types/enums.ts (muerta)         GET /enums (en uso)           quien lo consulta
  ---------------------------     -------------------------     -------------------------
  PROJECT_STATUS             <->  projectStatus                 project-details-header
  PHASE_PROJECT_STATUS       <->  phaseProjectStatus            stages-table-with-new
  PHASE_PROJECT_TASK_STATUS  <->  phaseProjectTaskStatus        tasks-table-with-new
  PROJECT_TYPES                   --                            (nunca se uso)
  AUDIT_STATUS                    --                            (nunca se uso)
  EVIDENCE_STATUS                 --                            (nunca se uso)
```

No están muertas por olvido: fueron **reemplazadas** cuando alguien migró esos componentes al fetch de enums.

`COUNTRY_REGION_OPTIONS` no tiene equivalente: el backend tiene los países pero todavía no los expone por API, según
confirmó el equipo. Queda registrado en la deuda como tarea de backend.

**Alternativa descartada:** borrar `enums.ts` entero y reemplazar los países por un fetch. Depende de trabajo de
backend que no está hecho, así que bloquearía este cambio.

### D4 — El lockfile se regenera aparte y se revisa antes de commitear

Quitar `qrcode.react` de `package.json` obliga a regenerar `package-lock.json`. Una regeneración previa en este
repositorio, hecha con una versión de npm distinta a la que creó el lockfile, eliminó las entradas de peer
dependencies. Entre ellas `@testing-library/dom`, que es peer de `@testing-library/react` y no figura como
dependencia directa: los 9 tests con entorno jsdom quedaron en rojo hasta que se restauró el archivo.

Por eso el paso se trata aparte del borrado de código: se ejecuta al final, en su propio lote, y el diff del lockfile
se revisa antes de darlo por bueno. La comprobación concreta es que `@testing-library/dom` siga presente y que los 89
tests sigan pasando.

**Alternativa descartada:** editar `package.json` y dejar el lockfile desincronizado para que lo resuelva el
pipeline. El `Dockerfile` usa `npm ci`, que falla si el lockfile no coincide con el `package.json`.

### D5 — Los exports que quedan huérfanos por arrastre se eliminan en el mismo cambio

Borrar un archivo puede dejar muerto un export que solo él consumía. Al abrir los 7 archivos apareció uno:

```
  STATUS_BADGE_COMPACT_BASE_CLASS   en lib/status-styles.ts
    consumidores: 1  ->  stage-details-header.tsx  (se elimina)

  STATUS_BADGE_BASE_CLASS           su hermano
    consumidores: 6  ->  intacto
```

Se elimina junto con su consumidor. Dejarlo significaría cerrar un cambio de limpieza creando código muerto nuevo.

Se verificó que ningún otro símbolo importado por los 7 archivos queda huérfano: `createProject`, `updateProject`,
`ProjectCard`, `useFetchOrganizations`, `useCreateProject`, `useUpdateProject`, `getBackendEnumOptions`,
`formatDateForInput`, `TableActionsIcon`, `DropdownLabel` y el tipo `Contribution` conservan todos al menos un
consumidor.

**Alternativa descartada:** dejarlo y anotarlo como deuda. Es una línea; anotarla cuesta más que borrarla.

### D6 — El orden va de lo más grueso a lo más fino

```
  1. archivos completos      si un archivo se va, sus exports y constantes
                             se van con el
           |
           v
  2. constantes de enums.ts  sobre un terreno ya reducido
           |
           v
  3. dependencia + lockfile  al final, aislado, con revision del diff
           |
           v
  4. documentacion           cuando ya se sabe que quedo
```

Cada paso re-mide antes de ejecutar, porque el anterior cambió el terreno.

## Impacto en el arranque y en la configuración de entorno

Ninguno sobre la configuración: no se tocan `src/lib/config.ts` ni `config.server.ts`, y `src/types/env.d.ts`, del
que ambos dependen, se conserva de forma explícita (D2).

Sobre el arranque, un solo efecto: la imagen deja de instalar `qrcode.react`. No cambian rutas, ni el `Dockerfile`,
ni `public/env.js`, ni el pipeline.

Para ejecutar el cambio hace falta un `.env.local`, como documenta `.env.example`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| El detector marca como muerto algo vivo, como ya pasó con `env.d.ts` | D2 y D5: candidatos, no órdenes; verificación con `tsc` + tests + build entre lotes |
| Un archivo se importa por una vía que la heurística no reconoce (import dinámico, alias inusual) | `tsc --noEmit` lo detecta de inmediato; el build cubre la resolución en bundling |
| Regenerar el lockfile vuelve a romper los tests jsdom | D4: paso aislado, verificar que `@testing-library/dom` siga en el lockfile y que los 89 tests pasen antes de cerrar |
| Ninguno de los 7 archivos tiene test propio | Aceptado y declarado: la verificación real es que nada más los importaba, y eso lo prueba `tsc` |
| Alguien vuelve a proponer borrar los primitivos de Catalyst | D1: la decisión queda escrita en `DEUDA-TECNICA.md` |

## Migration Plan

Un MR sobre la rama `remove-orphans`, con un commit por lote para que cada uno sea reversible por separado:

1. `chore: remove files with no importers` — los 7 archivos
2. `chore(types): remove unused enum constants` — las 6 constantes de `enums.ts`
3. `chore(deps): drop qrcode.react` — dependencia y lockfile
4. `docs: record what is kept on purpose` — las 4 entradas en `DEUDA-TECNICA.md`

**Rollback:** cada commit por separado. Sin estado externo ni migración de datos.

## Open Questions

Ninguna. Las cuatro decisiones de producto que hacían falta —conservar Catalyst, que solo sponsor crea proyectos,
que el backend tiene los países sin exponer, y dejar `CreateProjectFormData` donde está— las confirmó el equipo antes
de escribir este cambio.
