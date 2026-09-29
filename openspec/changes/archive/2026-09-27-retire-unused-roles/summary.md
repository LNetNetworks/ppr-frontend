# Resumen — retire-unused-roles

## Qué se hizo

Se eliminó el rol **`funder`** del frontend y se dejó de enviar **`superadmin`** al backend.

```
  ANTES                                       DESPUES
  ----------------------------------------    ---------------------------------
  ROLE_PRIORITY  user verifier sponsor         ROLE_PRIORITY  user verifier
                 provider funder superadmin                   sponsor provider

  role-badge     5 roles, funder en indigo     4 roles
  app-layout     startsWith('/funder')         (eliminado)
  types/api.ts   User.role con superadmin      sin cambios
```

Cinco apariciones de `funder` en tres archivos, más una de `superadmin`. El tipo `User.role` de `types/api.ts`
conserva `'superadmin'`.

## Por qué

**`funder` fue reemplazado por `provider`.** Sus tres piezas nunca funcionaron juntas: `ROLE_PRIORITY` lo enviaba al
backend, `role-badge` le daba un badge indigo, y `application-layout` detectaba una ruta `/funder` que **no existe**
—no hay directorio `src/app/(app)/funder/`—, así que esa comprobación era inalcanzable. Y aunque la ruta existiera,
el `switch` que elige el sidebar solo tiene cuatro casos: un funder habría caído en el `default` y visto el sidebar
de Sponsor.

**`superadmin` está planificado para un backoffice que el backend todavía no implementó**, y no hay usuarios con ese
rol en Keycloak. Mientras estuvo en `ROLE_PRIORITY`, un usuario con ese rol se sincronizaba con
`role: 'superadmin'` contra un endpoint que no lo contempla.

Ambos producían el mismo callejón sin salida: `DashboardByRole` no los reconoce, así que terminaban en *"No role
assigned. Please contact your administrator."*

## Desvíos respecto del plan

Ninguno. El plan se ejecutó tal como estaba escrito.

La decisión D3 —quitar `funder` del tipo `RoleType` **primero**, para que `tsc` señale lo que el inventario por
`grep` no viera— funcionó como estaba previsto:

```
  src/components/role-badge.tsx(32,3): error TS2353: 'funder' does not exist in
    type 'Record<RoleType, {...}>'
  src/components/role-badge.tsx(45,26): error TS2322: Type '"funder"' is not
    assignable to type 'RoleType | null'
```

El compilador marcó las dos apariciones tipadas. Las otras tres —`ROLE_PRIORITY` y la comprobación de ruta— son
literales de string sin tipo asociado, y esas las cubrió el `grep`. Las dos herramientas se complementaron como
describía el diseño.

## Qué queda registrado en la deuda

Sección nueva **"Roles"** en `docs/DEUDA-TECNICA.md`, con tres entradas:

- **`superadmin`**: qué es, por qué dejó de enviarse, y la línea exacta a reponer cuando exista el backoffice. Con la
  advertencia de que habrá que decidir qué ve ese rol, porque hoy `DashboardByRole`, `role-redirect` y los sidebars
  no lo conocen.
- **`funder`**: que fue reemplazado por `provider`, para que nadie lo reintroduzca al toparse con referencias viejas.
- **El fallback de `resolveUserTypeFromJwt`**: si ningún rol del token está en `ROLE_PRIORITY`, se envía
  `normalizedRoles[0]` tal cual, sin validar. Cualquier rol nuevo creado en Keycloak viaja al backend. Es
  preexistente y quedó fuera de alcance; conviene resolverlo junto con la centralización de roles.

## Verificación

| Comprobación | Resultado |
|---|---|
| `funder` en `src/` | 0 apariciones |
| `superadmin` en `src/` | 1, la del tipo en `types/api.ts` |
| `ROLE_PRIORITY` | `['user', 'verifier', 'sponsor', 'provider']` |
| Archivos tocados | 3 de `src/` + `docs/DEUDA-TECNICA.md` |
| `npx tsc --noEmit` | limpio |
| `npm test` | 22 archivos, 89 casos, igual que antes |
| `npm run build` | exit 0 |

Los 11 enlaces relativos rotos que reporta el verificador siguen siendo **los mismos de antes** y están todos en
artefactos de cambios ya archivados. Es un efecto de archivar, no de este cambio.

## Descripción para el commit

```
Remove the funder role, replaced by provider, and stop sending superadmin to the backend
until the backoffice exists. Record both decisions and the unvalidated role fallback as
technical debt.
```

*(30 palabras)*
