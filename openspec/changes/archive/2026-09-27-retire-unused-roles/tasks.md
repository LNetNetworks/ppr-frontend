## 1. Línea base

- [x] 1.1 Confirmar el punto de partida: `npx tsc --noEmit` limpio, `npm test` con 22 archivos y 89 casos, `npm run build` con exit 0; anotar los valores
- [x] 1.2 Registrar el inventario actual con `grep -rni "funder\|superadmin" src --include=*.ts --include=*.tsx`; verificar que da 5 apariciones de `funder` en 3 archivos y 2 de `superadmin` en 2 archivos

## 2. Eliminar `funder`

El orden importa: primero el tipo, para que `tsc` señale lo que el inventario no haya visto (D3).

- [x] 2.1 Quitar `'funder'` de la unión `RoleType` en `src/components/role-badge.tsx` línea 6; verificar que `npx tsc --noEmit` **ahora falla**, señalando las apariciones restantes. Si no falla, el inventario estaba mal y hay que revisarlo
- [x] 2.2 Quitar la entrada `funder` de `roleConfig` en `role-badge.tsx` (líneas 32-35), con su `displayName` y su color indigo; verificar que `roleConfig` queda con los 4 roles en uso
- [x] 2.3 Quitar `if (hasRole('funder')) return 'funder'` de `getPrimaryRoleFromAuth` en `role-badge.tsx` línea 45; verificar que la cadena de prioridad del componente queda con 4 roles
- [x] 2.4 Quitar `if (pathname.startsWith('/funder')) return 'funder'` de `src/app/(app)/application-layout.tsx` línea 48. **No reemplazarla por `/provider`**, que ya tiene su propia línea (D4); verificar que `src/app/(app)/` sigue sin directorio `funder`
- [x] 2.5 Quitar `'funder'` de `ROLE_PRIORITY` en `src/lib/user-service.ts` línea 7; verificar que el orden de los roles restantes no cambia
- [x] 2.6 **Verificar**: `npx tsc --noEmit` vuelve a estar limpio, y `grep -rni "funder" src` no devuelve ninguna aparición

## 3. Dejar de enviar `superadmin`

- [x] 3.1 Quitar `'superadmin'` de `ROLE_PRIORITY` en `src/lib/user-service.ts` línea 7; verificar que la lista queda exactamente en `['user', 'verifier', 'sponsor', 'provider']`
- [x] 3.2 **No tocar** `src/types/api.ts` línea 247: la unión de `User.role` conserva `'superadmin'` (D2, es contrato y no comportamiento); verificar que el archivo no aparece en el diff
- [x] 3.3 **Verificar**: `npx tsc --noEmit` limpio y `npm run build` con exit 0

## 4. Documentar la deuda

- [x] 4.1 Añadir a `docs/DEUDA-TECNICA.md` la entrada de `superadmin`: que está planificado para el backoffice, que el backend no desarrolló funcionalidad para él, que no hay usuarios con ese rol, y que dejó de enviarse en `POST /users/sync`; verificar que la entrada nombra la línea exacta a reponer (`ROLE_PRIORITY` en `src/lib/user-service.ts`) y que menciona que el tipo `User.role` ya lo contempla
- [x] 4.2 Añadir a esa misma entrada el fallback de `resolveUserTypeFromJwt`: si ningún rol del token está en `ROLE_PRIORITY`, se envía `normalizedRoles[0]` tal cual, de modo que cualquier rol nuevo creado en Keycloak viaja al backend sin validar; verificar que queda señalado como preexistente y fuera del alcance de este cambio
- [x] 4.3 Registrar en la misma sección que `funder` fue eliminado por haber sido reemplazado por `provider`, para que nadie lo reintroduzca al ver referencias viejas; verificar que la entrada es breve y no duplica lo que ya dice el historial

## 5. Cierre

- [x] 5.1 Verificar que solo se tocaron 3 archivos de `src/` (`user-service.ts`, `role-badge.tsx`, `application-layout.tsx`) más `docs/DEUDA-TECNICA.md`
- [x] 5.2 Verificar que `grep -rn "superadmin" src` devuelve **exactamente una** aparición, la del tipo en `src/types/api.ts`
- [x] 5.3 Verificación final: `npx tsc --noEmit` limpio, `npm test` con 89 casos y ningún fallo, `npm run build` con exit 0
- [x] 5.4 Crear `summary.md` en la carpeta del cambio, con qué se hizo, por qué, los desvíos respecto del plan, y una descripción de commit de 30 palabras como máximo
