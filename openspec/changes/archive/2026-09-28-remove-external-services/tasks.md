## 1. Línea base

- [x] 1.1 Confirmar el punto de partida: `npx tsc --noEmit` limpio, `npm test` con 22 archivos y 89 casos, `npm run build` con exit 0
- [x] 1.2 Listar los dominios de terceros que el navegador llama hoy con `grep -rnE "https?://(api\.dicebear|rsms\.me|fonts\.)" src`; verificar que son 2: `api.dicebear.com` en `avatar.tsx:25` y `rsms.me` en `layout.tsx:25-26`

## 2. Iniciales locales en lugar de dicebear

- [x] 2.1 Añadir en `src/components/avatar.tsx` una función que derive las iniciales de un nombre: separar por espacios, tomar la primera letra de las dos primeras palabras. Contemplar string vacío y espacios de más; verificar con `"Marisa Paredes"` → `MP`, `"marisa"` → `M`, `"  "` → sin iniciales
- [x] 2.2 Usar esa función para calcular las iniciales efectivas: `initials ?? (seed ? derivar(seed) : undefined)`, y pasar el resultado al `<svg>` existente (líneas 40-51). **No basta con borrar la URL de dicebear** (D1): sin derivar, el avatar queda vacío
- [x] 2.3 Eliminar la URL de `api.dicebear.com` de la línea 25; verificar que `effectiveSrc` queda reducido a la prop `src`, y que las 2 llamadas que la usan —`orders/page.tsx:39` y `orders/[id]/page.tsx:81`— siguen renderizando su `<img>`
- [x] 2.4 Verificar que `AvatarButton` no necesita cambios: reenvía `seed` a `Avatar` y hereda el arreglo
- [x] 2.5 **Verificar el lote**: `npx tsc --noEmit` limpio, `npm test` con 89 casos y `npm run build` con exit 0. Comprobar a ojo que el avatar de los 4 sidebars y el de la barra superior muestran las iniciales del usuario y no un recuadro vacío

## 3. Servir Inter desde el propio dominio

- [x] 3.1 Configurar `next/font/google` con Inter en `src/app/layout.tsx`, exponiéndola como variable CSS (D2). Si el entorno de build no alcanza `fonts.googleapis.com`, cambiar a `next/font/local` y versionar el `.woff2`
- [x] 3.2 Aplicar la clase o variable de la fuente al elemento `<html>` del layout
- [x] 3.3 Cambiar `--font-sans` en `src/styles/tailwind.css` línea 4 para que apunte a la variable de `next/font` en vez de nombrar `Inter` a secas (D3); verificar que `--font-sans--font-feature-settings: 'cv11'` de la línea 5 queda intacto
- [x] 3.4 Eliminar los dos `<link>` a `rsms.me` de `layout.tsx` líneas 25-26, y el `<head>` entero si queda vacío; verificar que el `<Script src="/env.js">` del `<body>` no se toca
- [x] 3.5 **Verificar el lote**: `npx tsc --noEmit` limpio y `npm run build` con exit 0. **Comprobar a ojo que la tipografía no cambió** (D4): es el riesgo silencioso, la aplicación funciona igual aunque caiga a `sans-serif`

## 4. Cierre

- [x] 4.1 Verificar que el navegador ya no llama a ningún dominio de terceros: repetir el inventario de 1.2 y comprobar que devuelve 0
- [x] 4.2 Verificar que no se tocó nada fuera de alcance: ni `src/lib/config.ts`, ni `config.server.ts`, ni `public/env.js`, ni el `Dockerfile`
- [x] 4.3 Verificación final: `npx tsc --noEmit` limpio, `npm test` con 89 casos y ningún fallo, `npm run build` con exit 0
- [x] 4.4 Crear `summary.md` en la carpeta del cambio, con qué se hizo, por qué, los desvíos respecto del plan, y una descripción de commit de 30 palabras como máximo. Registrar si se usó `next/font/google` o `local`, y por qué
