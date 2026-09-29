## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la motivación y el mapa de dónde aparece cada rol.

Lo que condiciona el enfoque:

- Los dos roles son **casos distintos que comparten una línea de código**. `funder` es historia: fue reemplazado por
  `provider`. `superadmin` es futuro: está planificado para un backoffice que el backend no implementó. Ambos viven
  en `ROLE_PRIORITY`.
- No existen usuarios con ninguno de los dos roles, ni funcionalidad de backend que los consuma. Confirmado con el
  equipo.
- `role-badge.tsx` declara un tipo `RoleType` que enumera los roles. Quitar un miembro de esa unión convierte al
  compilador en el verificador del cambio.
- No hay test que cubra `role-badge.tsx` ni `application-layout.tsx`.

## Goals / Non-Goals

**Goals:**

- Que el código no reconozca roles que no existen.
- Que el frontend no envíe al backend un valor que nadie sabe manejar.
- Que la intención detrás de `superadmin` sobreviva a su eliminación del código.

**Non-Goals:**

- Unificar las cinco listas de prioridad de roles. Este cambio corrige el contenido de una, no la duplicación.
- Diseñar el backoffice ni su rol.

## Decisions

### D1 — Los dos roles se tratan en un solo cambio, pese a ser casos opuestos

`funder` se elimina porque es historia; `superadmin` deja de enviarse porque es futuro. Son motivos contrarios, y
aun así conviene un solo cambio:

```
  lib/user-service.ts:7
  const ROLE_PRIORITY = ['user','verifier','sponsor','provider','funder','superadmin']
                                                                 ^^^^^^^^  ^^^^^^^^^^
                                                                 historia   futuro
```

Separarlos obliga a tocar esa línea dos veces, en dos MR, con el segundo rebasando sobre el primero. Y la decisión
sobre cada uno solo se entiende al lado de la otra: son las dos excepciones de la misma lista, y hoy producen el
mismo síntoma.

**Alternativa descartada:** un cambio por rol. Más limpio en el papel, pero genera un conflicto artificial sobre una
sola línea y parte en dos una revisión que es más útil leer junta.

### D2 — `superadmin` sale de `ROLE_PRIORITY` pero se queda en `types/api.ts`

Las dos apariciones cumplen funciones distintas:

```
  ROLE_PRIORITY            es COMPORTAMIENTO: decide que se envia
                           en POST /users/sync
                                  |
                                  v
                           hoy manda un valor que el backend
                           no implemento  ->  SE QUITA

  types/api.ts  User.role  es CONTRATO: describe lo que el
                           backend puede devolver
                                  |
                                  v
                           quitarlo no cambia comportamiento y
                           habria que reponerlo  ->  SE DEJA
```

El tipo conserva la intención sin que el frontend actúe sobre ella. Cuando el backoffice exista, reponer la línea de
`ROLE_PRIORITY` es una edición trivial, y queda anotada en `DEUDA-TECNICA.md`.

**Alternativa descartada:** quitarlo también del tipo. Deja el código sin rastro del rol planificado a cambio de
nada: no elimina comportamiento, porque el tipo no ejecuta.

**Alternativa descartada:** dejarlo en `ROLE_PRIORITY` hasta que el backend lo implemente. Hoy enviaría
`role: 'superadmin'` a un endpoint que no lo contempla. Sin usuarios que lo tengan es inofensivo, pero es una bomba
de relojería: el día que alguien cree ese rol en Keycloak, el sync empieza a mandar un valor desconocido.

### D3 — El tipo `RoleType` es la herramienta de verificación

El inventario de dónde aparece `funder` se armó con `grep`. Eso encuentra las apariciones literales, no las
indirectas.

Quitar `'funder'` de la unión `RoleType` en `role-badge.tsx` hace que `tsc` falle en cualquier lugar que asigne o
compare ese valor contra el tipo. Es más confiable que el `grep` y no depende de que el inventario esté completo.

Por eso el orden importa: **primero el tipo, después el resto**. Si se limpian los usos primero, el compilador no
tiene nada que señalar y se pierde la verificación.

**Alternativa descartada:** borrar las cinco apariciones y comprobar con `grep` al final. Funciona si el inventario
es exhaustivo, que es justo lo que no se puede garantizar.

### D4 — La línea de `application-layout.tsx` se elimina, no se corrige

`if (pathname.startsWith('/funder')) return 'funder'` es **código inalcanzable**: no existe el directorio
`src/app/(app)/funder/`, así que ninguna URL puede empezar con ese prefijo.

No se reemplaza por `/provider`, que ya tiene su propia línea dos renglones más arriba. Se elimina y ya.

## Impacto en el arranque y en la configuración de entorno

Ninguno. No se tocan `src/lib/config.ts`, `config.server.ts`, `next.config.mjs`, el `Dockerfile`, `public/env.js` ni
ningún archivo `.env*`.

Hay una intersección indirecta con Keycloak que conviene registrar: los roles se leen del claim
`resource_access[clientId].roles` del token, y `clientId` sale de la configuración de entorno. Este cambio no altera
esa lectura, solo qué hace el frontend con los valores que encuentra.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Queda una referencia a `funder` que el `grep` no vio | D3: se quita primero del tipo `RoleType`, y `tsc` señala lo que falte |
| `resolveUserTypeFromJwt` cae al fallback y envía un rol inesperado | Preexistente y fuera de alcance: si ningún rol del token está en la lista, se envía `normalizedRoles[0]` tal cual. Queda anotado en la deuda |
| Un usuario con `superadmin` aparece después del cambio | Se sincronizaría con su siguiente rol, o con `'user'`. Es el comportamiento buscado mientras el backend no lo implemente |
| Nadie recuerda reponer `superadmin` cuando llegue el backoffice | `DEUDA-TECNICA.md` registra la línea exacta a reponer |
| No hay test sobre `role-badge.tsx` ni `application-layout.tsx` | Aceptado y declarado. `tsc` y el build son la verificación real; la suite solo confirma que no se rompió nada más |

## Migration Plan

Un MR, con dos commits para que la revisión distinga los dos motivos:

1. `chore(roles): remove funder, replaced by provider`
2. `chore(roles): stop sending superadmin until the backoffice exists`

**Rollback:** cada commit por separado. Sin estado externo ni migración de datos.

## Open Questions

Ninguna. Las dos definiciones de producto que hacían falta —que `funder` fue reemplazado por `provider`, y que
`superadmin` es para un backoffice aún no desarrollado— las confirmó el equipo antes de escribir este cambio.
