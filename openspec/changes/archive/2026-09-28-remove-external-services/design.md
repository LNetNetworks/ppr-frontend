## Context

Ver [`proposal.md`](./proposal.md) § *Why* para la motivación.

Lo que condiciona el enfoque:

- `avatar.tsx` tiene 93 líneas y exporta `Avatar` y `AvatarButton`. **`AvatarButton` no tiene consumidores fuera del
  propio archivo**; `Avatar` tiene 7, de los cuales 5 pasan `seed` y 2 pasan `src`.
- El componente ya contiene el camino correcto sin usar: un `<svg>` que dibuja la prop `initials` (líneas 40-51).
  Ningún consumidor la pasa.
- `src/styles/tailwind.css` línea 4 declara `--font-sans: Inter, sans-serif` dentro de un bloque `@theme` de
  Tailwind 4, con `--font-sans--font-feature-settings: 'cv11'` en la línea siguiente.
- El `<head>` de `layout.tsx` tiene además un `<Script src="/env.js" strategy="beforeInteractive">`, que también
  bloquea. No entra en este cambio.
- No hay ningún test sobre `avatar.tsx` ni sobre el layout.

## Goals / Non-Goals

**Goals:**

- Que el navegador del usuario no llame a ningún dominio de terceros.
- Que el nombre del usuario deje de viajar fuera de la aplicación.
- Que la tipografía no cambie.

**Non-Goals:**

- Añadir foto de perfil ni cambiar qué identifica al usuario.
- Tocar el `<Script>` de `env.js`, que bloquea por una razón distinta.

## Decisions

### D1 — Las iniciales se derivan del `seed`, usando el camino que ya existe

El componente tiene dos ramas de render: una dibuja `initials` en SVG, la otra pone un `<img>` con `effectiveSrc`.
Hoy los 5 consumidores que pasan `seed` caen en la segunda, apuntando a dicebear.

El arreglo es derivar `initials` cuando no venga dada:

```
  ANTES                                  DESPUES
  seed="Marisa Paredes"                  seed="Marisa Paredes"
     |                                      |
     v                                      v
  <img src="api.dicebear.com/...">       initials = "MP"
                                            |
                                            v
                                         <svg> ... MP ... </svg>
```

Si se quitara la línea de dicebear sin derivar las iniciales, `effectiveSrc` sería `null`, `initials` nunca llegaría
y **el avatar quedaría vacío** en los cuatro sidebars y en la barra superior.

La regla de derivación: separar por espacios, tomar la primera letra de las dos primeras palabras. `"Marisa
Paredes"` → `MP`; `"marisa"` → `M`. Hay que contemplar el string vacío y los espacios de más.

**Alternativa descartada:** pasar `initials` explícitamente en los 5 consumidores y dejar `Avatar` sin lógica. Repite
la misma derivación cinco veces, que es el patrón que otros cambios de esta serie vinieron a eliminar.

### D2 — La dependencia de red no se agrega: se mueve, y a un lugar mejor

El encuadre importa. Hoy **ya existe** una dependencia externa para la fuente, y está en el peor sitio posible:

```
  HOY                                   CON next/font/google
  ------------------------------        ------------------------------
  cada usuario, cada carga              una vez, en el build
  GET rsms.me/inter/inter.css           la fuente queda en la imagen
  GET rsms.me/inter/*.woff2
        |                                     |
        v                                     v
  si rsms.me no responde:               si Google no responde:
  la APP NO PINTA                       falla el BUILD
  (el <link stylesheet> bloquea)        (ruidoso, antes de desplegar)

  en produccion: depende siempre        en produccion: no depende de nadie
```

No es un riesgo nuevo, es el mismo riesgo movido del navegador de cada usuario al build, donde falla ruidosamente y
una sola vez.

`next/font/local` lo elimina también del build, a cambio de versionar el `.woff2` y elegir los pesos a mano.

**Se propone `next/font/google`** por ser lo estándar y no requerir versionar binarios. El `Dockerfile` ya construye
con red, hace `npm ci`. Si el pipeline resulta no alcanzar a Google Fonts, pasar a `local` es reemplazar el import y
agregar el archivo: no obliga a rehacer nada más.

**Alternativa descartada:** dejar el `<link>` a `rsms.me` y solo quitar el `preconnect`. No resuelve nada: el
`stylesheet` es el que bloquea.

### D3 — La variable de Tailwind apunta a la fuente de `next/font`

`next/font` expone la fuente como una variable CSS. `tailwind.css` tiene que consumirla en vez de nombrar `Inter` a
secas:

```
  --font-sans: Inter, sans-serif;              ->   --font-sans: var(--font-inter), sans-serif;
  --font-sans--font-feature-settings: 'cv11';       (se conserva igual)
```

Si se quita el `<link>` sin este paso, `Inter` no existe en el sistema y todo cae a `sans-serif`: **cambia la
tipografía de toda la aplicación**, que es exactamente lo que este cambio promete no hacer.

**Alternativa descartada:** dejar `--font-sans: Inter` y confiar en que `next/font` registre la familia con ese
nombre. `next/font` genera un nombre de familia con hash precisamente para evitar colisiones; hay que usar su
variable.

### D4 — La verificación es visual y se declara

`tsc` y el build comprueban que compile. Lo que no pueden comprobar:

- que el avatar muestre las iniciales correctas y no un cuadro vacío
- que la tipografía siga siendo Inter y no la `sans-serif` del sistema

Lo segundo es el riesgo silencioso: si `--font-sans` queda mal, **la aplicación funciona igual** y solo se nota al
mirarla. No hay test que lo detecte.

Se declara acá en vez de simular cobertura.

## Impacto en el arranque y en la configuración de entorno

Sobre la configuración de entorno, ninguno: no se tocan `src/lib/config.ts`, `config.server.ts`, `public/env.js` ni
ningún archivo `.env*`.

Sobre el arranque, uno relevante y a favor: **la aplicación deja de depender de un tercero en tiempo de ejecución**.
Hoy cada carga de página pide la fuente a `rsms.me` con un `<link>` que bloquea el render. Después, la fuente viaja
dentro de la imagen.

Si se elige `next/font/google`, el build pasa a necesitar alcanzar `fonts.googleapis.com` (D2). El `Dockerfile` no
cambia, pero su entorno tiene un requisito nuevo — a cambio de quitarle uno a producción.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| El avatar queda vacío al quitar dicebear | D1: hay que derivar las iniciales, no solo borrar la URL. La verificación visual lo detecta de inmediato |
| La tipografía cambia sin que nadie lo note | D3: hay que apuntar `--font-sans` a la variable de `next/font`. Es el riesgo silencioso del cambio |
| El build del pipeline no alcanza Google Fonts | D2: falla ruidosamente y antes de desplegar, a diferencia del fallo actual, que deja la app sin pintar en producción. Si pasa, cambiar a `next/font/local` es reemplazar el import y versionar el `.woff2` |
| El aspecto del avatar sorprende | Es el objetivo declarado. Queda en el `summary.md` |
| No hay test que cubra ninguna de las dos cosas | Aceptado y declarado (D4). `tsc` y el build cubren la mecánica; lo visible se mira |

## Migration Plan

Un MR sobre la rama `external-services`, con dos commits independientes:

1. `fix(avatar): draw initials locally instead of calling dicebear`
2. `perf(fonts): self-host Inter with next/font`

Separados a propósito: si el segundo resulta problemático por la red del build, el primero se conserva.

**Rollback:** cada commit por separado. Sin estado externo ni migración de datos.

## Open Questions

- **¿El entorno de build alcanza `fonts.googleapis.com`?** No se puede comprobar desde acá. Si no, la salida es
  `next/font/local`, descrita en D2. No bloquea escribir el cambio y el fallo sería evidente: el build no compila.
