## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la tabla de discrepancias.

Lo que condiciona el enfoque:

- `src/lib/status-styles.ts` tiene 65 líneas y seis exports. Se verificó consumidor por consumidor: **`getToneClass`,
  `getProjectStatusTone` y `getWorkflowStatusTone` no se usan desde fuera del archivo**. Solo los dos envoltorios
  `*Class` tienen consumidores: 4 y 3 archivos.
- Uno de esos 7 consumidores, `src/components/tables/projects-table.tsx`, no tiene importadores: lo confirmó el
  detector basado en el compilador de TypeScript.
- No existe ningún test sobre `status-styles.ts` ni sobre los componentes que lo consumen. La suite cubre guards de
  rol, hooks, mappers y configuración.
- El mapa de estados lo definió el equipo durante la revisión previa a este cambio.

## Goals / Non-Goals

**Goals:**

- Que un estado se vea igual en todas las pantallas.
- Que no queden dos caminos para resolver lo mismo, ni siquiera con nombres distintos.

**Non-Goals:**

- Migrar los literales de estado del resto del repositorio.
- Cambiar la paleta: `info` sigue siendo azul, `success` verde.

## Decisions

### D1 — Gana el mapa de etapas y tareas, por semántica

Las dos funciones discrepan en cuatro de seis estados. El criterio elegido es **azul mientras algo ocurre, verde
cuando terminó bien**, que es el de `getWorkflowStatusTone`.

```
  inprogress  ->  info     algo esta pasando, informativo
  completed   ->  success  termino, y termino bien
  closed      ->  success  idem
  canceling   ->  danger   se esta deshaciendo
```

La alternativa —el mapa de proyectos— pinta `inprogress` de verde, que es el color de "terminado bien" en la otra
mitad de la aplicación. Un usuario que cambia de pantalla tendría que reaprender qué significa el verde.

`canceling` merece una nota: no es una discrepancia sino una omisión. `getProjectStatusTone` no lo contempla y cae en
`neutral`; adoptar el otro comportamiento lo corrige de paso.

**Alternativa descartada:** conservar los dos mapas y documentar que son distintos a propósito. Ningún criterio de
producto justifica que "terminado" sea verde en una tabla y azul en otra.

### D2 — Un solo punto de entrada público, no dos que hagan lo mismo

Se puede unificar el mapa por dentro y dejar `getProjectStatusClass` y `getWorkflowStatusClass` como están. Eso no
cambia ningún componente, pero deja dos funciones idénticas con nombres distintos: **la duplicación baja un nivel en
vez de desaparecer**, y nada impide que alguien vuelva a hacerlas divergir.

Se eliminan las dos y se expone `getStatusClass`. Los 7 consumidores —6 vivos más el huérfano, que entra en la
compilación aunque nadie lo importe— cambian el import y la llamada; no hay lógica que tocar.

**Alternativa descartada:** la unificación mínima, sin tocar consumidores. Es más barata hoy y reproduce el problema
en seis meses.

### D3 — La verificación es visual y eso se declara

`tsc` garantiza que no quede ninguna llamada a las funciones eliminadas: al borrarlas, cualquier consumidor que no se
haya migrado rompe la compilación. Eso cubre la mecánica del cambio.

Lo que `tsc` **no** puede verificar es que el color resultante sea el correcto, porque no hay test que renderice un
badge y compruebe su clase. La comprobación es abrir una tabla de proyectos y una de etapas y ver que un mismo estado
se vea igual en las dos.

Se declara acá en vez de simular cobertura con una verificación que no falsa nada.

**Alternativa descartada:** añadir tests para `getStatusTone` en este cambio. Sería cobertura útil, pero mezcla dos
objetivos y el cambio dejaría de ser una corrección acotada. Queda como trabajo aparte.

## Impacto en el arranque y en la configuración de entorno

Ninguno. No se tocan `src/lib/config.ts`, `config.server.ts`, `next.config.mjs`, el `Dockerfile`, `public/env.js` ni
ningún archivo `.env*`.

Para ejecutar el cambio hace falta un `.env.local`, como documenta `.env.example`.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| El cambio de color sorprende a quien conocía el anterior | Es el objetivo declarado del cambio, no un efecto colateral. Queda en el `summary.md` para que el equipo lo sepa |
| Queda un consumidor sin migrar | Imposible de pasar por alto: al eliminar las funciones viejas, `tsc` falla en quien las siga llamando (D3) |
| El color resultante es el incorrecto en algún estado | Solo se detecta a ojo. La verificación final pide comparar una tabla de proyectos contra una de etapas |
| Migrar un archivo muerto es trabajo que se tirará | Aceptado: son dos líneas, y la alternativa es dejar el build roto. `tsconfig.json` incluye `**/*.tsx`, así que `tsc` lo type-chequea aunque nadie lo importe |

## Migration Plan

Un MR sobre la rama `unify-status-tone`, con dos commits:

1. `fix(status): use one tone map for every status` — `status-styles.ts` y los consumidores
2. `docs: record the status literals that stay` — la entrada en `DEUDA-TECNICA.md`

**Rollback:** `git revert` de cada commit por separado. Sin estado externo ni migración de datos.

## Open Questions

Ninguna. El mapa de estados lo definió el equipo antes de escribir este cambio.
