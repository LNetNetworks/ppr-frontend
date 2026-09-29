## Why

El frontend reconoce dos roles que no corresponden a nada: **`funder`**, que fue reemplazado por `provider`, y
**`superadmin`**, que está planificado para un backoffice que el backend todavía no implementó.

Ninguno de los dos funciona, y ambos producen el mismo callejón sin salida:

```
  usuario con rol funder o superadmin
            |
            v
  syncUser() lo envia al backend como su rol
            |
            v
  DashboardByRole no lo reconoce
            |
            v
  "No role assigned. Please contact your administrator."
```

`funder` encima llega a mostrar un badge indigo antes de esa pantalla, porque `role-badge.tsx` sí lo conoce.

Las piezas están repartidas de forma incoherente: los dos roles solo coinciden en `ROLE_PRIORITY`, y en todo lo demás
aparecen en sitios disjuntos.

| Fuente | `funder` | `superadmin` |
|---|---|---|
| `lib/user-service.ts:7` — `ROLE_PRIORITY` | sí | sí |
| `components/role-badge.tsx` | sí | — |
| `app/(app)/application-layout.tsx:48` | sí | — |
| `types/api.ts:247` — `User.role` | — | sí |
| `dashboard-by-role.tsx`, `role-redirect.tsx`, `breadcrumb.utils.ts`, sidebars | — | — |

Hay además una contradicción que ninguna herramienta detecta: `ROLE_PRIORITY` puede resolver `funder` y enviarlo como
`role` a `POST /users/sync`, pero el tipo `User` declara que ese valor no existe. El `api.post<any>` y el parámetro
`data: unknown` de `ApiClient` dejan pasar la discrepancia sin error de compilación.

## What Changes

### Eliminar `funder` — reemplazado por `provider`

Cinco ediciones en tres archivos:

| Archivo | Qué se quita |
|---|---|
| [`src/lib/user-service.ts`](../../../src/lib/user-service.ts) línea 7 | `'funder'` de `ROLE_PRIORITY` |
| [`src/components/role-badge.tsx`](../../../src/components/role-badge.tsx) línea 6 | `'funder'` del tipo `RoleType` |
| `role-badge.tsx` líneas 32-35 | La entrada `funder` de `roleConfig`, con su `displayName` y su color indigo |
| `role-badge.tsx` línea 45 | `if (hasRole('funder')) return 'funder'` |
| [`src/app/(app)/application-layout.tsx`](<../../../src/app/(app)/application-layout.tsx>) línea 48 | `if (pathname.startsWith('/funder')) return 'funder'` |

Esa última línea es además **inalcanzable**: `src/app/(app)/` no tiene un directorio `funder`, así que ninguna URL
puede empezar con ese prefijo. Y aunque existiera, el `switch` que elige el sidebar solo tiene cuatro casos: un
funder caería en el `default` y vería el sidebar de Sponsor.

### Dejar de enviar `superadmin` al backend

Se quita `'superadmin'` de `ROLE_PRIORITY` en `user-service.ts:7`. Hoy, un usuario con ese rol de cliente se
sincroniza con `role: 'superadmin'` contra un endpoint que no lo contempla.

Tras el cambio se sincronizaría con el siguiente rol de la lista que tenga, o con `'user'` por defecto.

**No hay usuarios con ese rol ni funcionalidad de backend que lo consuma**, así que el cambio de comportamiento no
afecta a nadie hoy.

### Documentar `superadmin` en `docs/DEUDA-TECNICA.md`

Entrada nueva: qué es, por qué dejó de enviarse, y exactamente qué reponer cuando el backoffice exista.

`ROLE_PRIORITY` queda con los cuatro roles reales, en el mismo orden que hoy.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. `openspec/specs/` está vacío y no hay capacidad documentada que describa el comportamiento de estos roles.

El cambio declara `skip_specs: true`, con una salvedad honesta: **dejar de enviar `superadmin` altera el payload de
`POST /users/sync`** para un usuario que tuviera ese rol. Como no existe ninguno, el cambio es observable solo en
teoría.

## Non-goals

- **No se toca `src/types/api.ts`.** La unión de `User.role` conserva `'superadmin'`: describe lo que el backend
  puede devolver, quitarlo no cambia comportamiento y habría que reponerlo cuando llegue el backoffice.
- **No se unifica la prioridad de roles**, que está duplicada en cinco lugares con tres definiciones distintas. Es el
  cambio de centralización que quedó pendiente; este solo corrige el contenido de una de esas listas.
- **No se toca `DashboardByRole`, `role-redirect.tsx`, `breadcrumb.utils.ts` ni los sidebars**: ninguno conoció jamás
  a `funder` ni a `superadmin`.
- **No se corrige el `api.post<any>`** de `syncUser` ni el `data: unknown` de `ApiClient`, que son los que dejan
  pasar discrepancias de tipo en el payload. Es un problema más amplio que estos dos roles.
- **No se crea el rol de backoffice** ni ninguna pantalla para él.

## Impact

**Roles afectados: ninguno de los cuatro en uso.** `sponsor`, `provider`, `user` y `verifier` no cambian de
comportamiento.

| Área | Impacto |
|---|---|
| Archivos modificados | 3: `user-service.ts`, `role-badge.tsx`, `application-layout.tsx` |
| Documentación | Entrada nueva en `docs/DEUDA-TECNICA.md` |
| `types/api.ts` | Sin cambios |
| Comportamiento | Solo para un usuario con rol `funder` o `superadmin`, de los que no hay ninguno |
| Tests | 22 archivos y 89 casos deben seguir pasando sin modificarse |

**Riesgo principal:** que alguna referencia a `funder` quede suelta. Lo mitiga que se elimina del tipo `RoleType`:
`tsc` señala cualquier uso que el inventario manual no haya visto.
