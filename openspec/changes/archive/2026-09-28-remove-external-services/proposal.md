## Why

El navegador de cada usuario llama a **dos servicios de terceros** que la aplicación no necesita.

```
  api.dicebear.com   recibe el nombre del usuario en la query string
  rsms.me            bloquea el render hasta que responde
```

### `api.dicebear.com` — le manda el nombre del usuario a un tercero

[`src/components/avatar.tsx`](../../../src/components/avatar.tsx) línea 25:

```tsx
const effectiveSrc = src || (seed ? `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}` : null)
```

Las 5 llamadas reales pasan `seed={userDisplayName}`, que sale del token de Keycloak (`name` o
`preferred_username`). Es decir: **el nombre de cada usuario logueado viaja a un servicio externo**, en texto plano y
en la URL, cada vez que se renderiza el avatar.

Y el endpoint es `/7.x/initials/png`: genera iniciales. El componente **ya sabe dibujar iniciales localmente** en SVG
(líneas 40-51), con una prop `initials` que ningún consumidor usa.

### `rsms.me` — bloquea el render

[`src/app/layout.tsx`](../../../src/app/layout.tsx) líneas 25-26:

```tsx
<link rel="preconnect" href="https://rsms.me/" />
<link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
```

Un `<link rel="stylesheet">` en el `<head>` bloquea el render hasta que responde. Si `rsms.me` está lento o caído, la
aplicación no pinta.

## What Changes

### Dibujar las iniciales localmente en vez de pedirlas a dicebear

En `avatar.tsx`, derivar las iniciales del `seed` y usar el camino SVG que el componente ya tiene:

```tsx
const derivedInitials = initials ?? (seed ? initialsFrom(seed) : undefined)
```

Se elimina la URL de dicebear. `src` sigue funcionando igual para las 2 llamadas que pasan una imagen real
(`orders/page.tsx` y `orders/[id]/page.tsx`).

`AvatarButton` no se toca: reenvía `seed` a `Avatar`, así que hereda el arreglo.

### Servir Inter desde el propio dominio con `next/font`

`src/styles/tailwind.css` línea 4 declara `--font-sans: Inter, sans-serif`. El `<link>` a `rsms.me` es **lo único
que carga esa fuente**: si se quita sin reemplazo, toda la aplicación cae a `sans-serif`.

Se reemplaza por `next/font`, que descarga la fuente en build, la sirve desde el propio dominio y elimina el `<link>`
bloqueante. La tipografía queda idéntica.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío y no hay capacidad documentada que describa el avatar ni la tipografía.

El cambio declara `skip_specs: true`, con una salvedad: **el avatar cambia de aspecto**. Hoy muestra un PNG generado
por dicebear; pasará a mostrar el SVG de Catalyst, con otra tipografía y otros colores. Las iniciales son las mismas.

## Non-goals

- **No se añade foto de perfil.** El token de Keycloak trae `name`, `email`, `preferred_username` y `sub`; ninguna
  imagen. Las iniciales no son un reemplazo pobre: son lo único disponible, y hoy se generan dando un rodeo por un
  tercero.
- **No se tocan las 2 llamadas con `src`** (`orders/page.tsx` y `orders/[id]/page.tsx`). Pasan una imagen real y
  siguen funcionando igual.
- **No se cambia la fuente.** Sigue siendo Inter, con el mismo `font-feature-settings: 'cv11'`. Solo cambia de dónde
  se descarga.
- **No se elimina el `<Script src="/env.js" strategy="beforeInteractive">`** del mismo `<head>`, que también bloquea.
  Es parte de la estrategia de configuración en runtime y sale de otro cambio.
- **No se toca `AvatarButton`**, que hereda el arreglo.

## Impact

**Roles afectados: los cuatro.** El avatar aparece en los cuatro sidebars y en la barra superior; la tipografía, en
toda la aplicación.

| Área | Impacto |
|---|---|
| `src/components/avatar.tsx` | Se elimina la URL de dicebear, se derivan las iniciales del `seed` |
| `src/app/layout.tsx` | Se eliminan los 2 `<link>` a `rsms.me`, se añade `next/font` |
| `src/styles/tailwind.css` | `--font-sans` pasa a apuntar a la variable que expone `next/font` |
| Llamadas salientes desde el navegador | 2 dominios de terceros menos |
| Cambio visible | El avatar cambia de aspecto. La tipografía **no** debe cambiar |
| Tests | 22 archivos y 89 casos deben seguir pasando sin modificarse |

**Sobre la dependencia de red:** el cambio no agrega una, la mueve. Hoy cada usuario descarga la fuente de
`rsms.me` en cada carga, y si ese dominio no responde **la aplicación no pinta**, porque un `<link rel="stylesheet">`
bloquea el render. Con `next/font/google` la descarga ocurre una vez, en el build: si Google no responde falla el
build, que es un fallo ruidoso y anterior al despliegue. En producción la fuente ya está dentro de la imagen y no se
depende de nadie. `next/font/local` elimina la dependencia también en build, a cambio de versionar el `.woff2`.

**Riesgo principal:** no hay ningún test que cubra `avatar.tsx` ni el layout. Que el avatar muestre las iniciales y
que la tipografía siga siendo Inter solo se comprueba mirando la pantalla. Lo segundo es el fallo silencioso: si la
variable de la fuente queda mal, la aplicación funciona igual, con otra tipografía.
