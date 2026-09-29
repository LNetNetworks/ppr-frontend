# Resumen del cambio: remove-external-services

## Qué se hizo

El navegador de cada usuario llamaba a dos dominios de terceros. Ya no llama a ninguno.

| Antes | Después |
|---|---|
| `api.dicebear.com/7.x/initials/png?seed=<nombre del usuario>` | iniciales dibujadas en SVG dentro del propio componente |
| `rsms.me/inter/inter.css` + sus `.woff2` | Inter servida desde el propio dominio, descargada en el build |

### Iniciales locales

`src/components/avatar.tsx` recibe `initialsFrom()`, que separa el nombre por espacios y toma la primera letra
de las dos primeras palabras. `effectiveSrc` —que construía la URL de dicebear— desaparece; en su lugar queda
`effectiveInitials = initials ?? (seed ? initialsFrom(seed) : undefined)`, que alimenta el `<svg>` que el
componente ya tenía y ningún consumidor usaba.

Los 5 consumidores que pasan `seed` pasan a dibujar las iniciales localmente. Los 2 que pasan `src`
(`orders/page.tsx`, `orders/[id]/page.tsx`) siguen renderizando su `<img>` igual que antes. `AvatarButton` no se
tocó: reenvía `seed` a `Avatar` y heredó el arreglo.

El nombre del usuario, que salía del token de Keycloak, ya no viaja fuera de la aplicación.

### Inter desde el propio dominio

`src/app/layout.tsx` configura `next/font/google` con Inter (`subsets: ['latin']`, `display: 'swap'`), expuesta
como la variable CSS `--font-inter` y aplicada al `<html>`. Los dos `<link>` a `rsms.me` se eliminaron junto con
el `<head>`, que quedó vacío. El `<Script src="/env.js">` del `<body>` no se tocó.

`src/styles/tailwind.css` línea 4 pasa de `--font-sans: Inter, sans-serif` a
`--font-sans: var(--font-inter), sans-serif`. La línea 5, `--font-sans--font-feature-settings: 'cv11'`, quedó
intacta.

## Por qué

Un `<link rel="stylesheet">` en el `<head>` bloquea el render: si `rsms.me` no respondía, la aplicación no
pintaba. Con `next/font` la fuente viaja dentro de la imagen y producción no depende de nadie.

Y el endpoint de dicebear era `/7.x/initials/png`: generaba iniciales. Se le mandaba el nombre del usuario a un
tercero para que devolviera algo que el componente ya sabía dibujar.

## Se usó `next/font/google`, no `local`

`design.md` dejó abierta la pregunta de si el entorno de build alcanza `fonts.googleapis.com`, con
`next/font/local` como salida en caso contrario. **No hizo falta: el build alcanza Google Fonts y compiló con
exit 0.** Se eligió `google` por ser lo estándar y no obligar a versionar binarios ni elegir los pesos a mano.

Queda registrado para el pipeline: el build ahora necesita red hacia `fonts.googleapis.com`. Si el runner de CI
no la tuviera, el fallo es ruidoso y anterior al despliegue, y pasar a `local` es reemplazar el import y agregar
el `.woff2`.

## Desvíos respecto del plan

Ninguno en el alcance. Uno en la verificación:

Las tareas 2.5 y 3.5 pedían comprobar a ojo el avatar y la tipografía. No se puede hacer desde la línea de
comandos. En su lugar se verificó sobre la salida del build, que es lo que el navegador recibe:

- la derivación de iniciales se probó con los casos del plan: `"Marisa Paredes"` → `MP`, `"marisa"` → `M`,
  `"  "` → sin iniciales
- el CSS generado resuelve la cadena completa —`--font-inter: "Inter", "Inter Fallback"`,
  `--font-sans: var(--font-inter), sans-serif`, `font-feature-settings` conservado—, que era el riesgo
  silencioso de D3
- `.next/static/media/` contiene 7 archivos `.woff2` y el HTML generado no menciona `rsms.me`

El aspecto del avatar sí cambia, como se declaró: era un PNG de dicebear y ahora es el SVG de Catalyst, con otra
tipografía y otros colores. Las iniciales son las mismas.

## Verificación

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | exit 0, sin errores |
| `npm test` | 22 archivos, 89 casos, todos pasando, sin modificar ninguno |
| `npm run build` | exit 0 |
| `grep -rnE "https?://(api\.dicebear\|rsms\.me\|fonts\.)" src` | 0 resultados |
| Archivos fuera de alcance | `src/lib/config.ts`, `config.server.ts`, `public/env.js` y el `Dockerfile` sin tocar |

Archivos modificados: `src/components/avatar.tsx`, `src/app/layout.tsx`, `src/styles/tailwind.css`.

## Descripción para el commit

Draw avatar initials locally instead of calling dicebear with the user's name, and self-host Inter with
next/font, removing the two third-party domains the browser contacted.
