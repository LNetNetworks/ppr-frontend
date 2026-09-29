# Resumen — remove-orphan-code

## Qué se hizo

Se eliminaron **7 archivos que ningún otro importaba** (1.664 líneas), **6 constantes sin consumidores** de
`src/types/enums.ts` y un export que quedó huérfano por arrastre.

| Eliminado | Líneas |
|---|---|
| `components/grids/grid-projects-with-new-project-button.tsx` | 877 |
| `components/tables/contributions-table.tsx` | 198 |
| `components/payment-modal.tsx` | 165 |
| `app/(app)/sponsor/my-projects/actions.ts` | 130 |
| `app/(app)/provider/my-projects/actions.ts` | 130 |
| `components/stage-details-header.tsx` | 118 |
| `types/types.ts` | 46 |
| `STATUS_BADGE_COMPACT_BASE_CLASS` en `lib/status-styles.ts` | 1 |
| 6 constantes en `types/enums.ts` | ~70 |

`src/types/enums.ts` pasó de 106 a 38 líneas y conserva solo `COUNTRY_REGION_OPTIONS`.

Se conservaron a propósito los 7 primitivos de Catalyst y `src/types/env.d.ts`, y se registraron cinco decisiones en
`docs/DEUDA-TECNICA.md`.

## Por qué

Convivían tres generaciones del mismo código y **ninguna de las huérfanas era la más nueva**: cuatro pertenecían a la
generación que no consulta enums del backend, y una —el fork de grid— se modernizó a medias y nunca recibió
`assetToken`.

La consecuencia ya era visible: `CreateProjectFormData` estaba declarada cuatro veces, y solo la viva tenía los 12
campos. Las otras tres se quedaron en 11, sin `assetToken`, que es el requisito `SPON-01/SPON-02`.

## Desvíos respecto del plan

**1. El grupo 4 se eliminó del alcance: `qrcode.react` no se quitó.**

Al ejecutar `npm uninstall qrcode.react`, el npm del entorno regeneró `package-lock.json` y eliminó las 12 entradas
de peer dependencies, entre ellas `@testing-library/dom`. Los tests pasaron de 89 a 63, con 9 archivos fallando.

Es la segunda vez que ocurre en este repositorio. La tarea 4.3 estaba escrita precisamente para detectarlo y lo
detectó.

Se restauró `package-lock.json` desde una copia previa, se repuso la línea en `package.json`, y se verificó por
checksum que ambos archivos quedaron **idénticos a HEAD**. `node_modules` se recompuso con `npm install --no-save`,
que no escribe ninguno de los dos. Decisión del equipo: dejar la dependencia sin consumidor y registrar la causa en
la deuda.

**2. Apareció un export huérfano por arrastre.**

`STATUS_BADGE_COMPACT_BASE_CLASS` tenía un solo consumidor: `stage-details-header.tsx`. Se detectó al abrir los
archivos durante la verificación previa, no estaba en el plan original. Se eliminó junto con su consumidor. Su
hermano `STATUS_BADGE_BASE_CLASS`, con 6 consumidores, quedó intacto.

**3. Los informes de auditoría enlazaban a los archivos borrados.**

9 enlaces rotos nuevos. Como son informes fechados que por convención no se actualizan, se aplicó el mismo criterio
que en `reorganize-docs`: se quitó el enlace y se conservó el nombre como código. El contenido del informe no cambió.

**4. Dos cifras del plan estaban mal.**

`COUNTRY_REGION_OPTIONS` tiene 27 valores, no 26. Y el archivo quedó en 38 líneas, no 35. Ninguna afectaba al
resultado.

## Verificación

Se verificó entre cada lote, no al final.

| Comprobación | Resultado |
|---|---|
| Archivos con importadores entre los borrados | 0, comprobado antes de borrar |
| `npx tsc --noEmit` | limpio |
| `npm test` | 22 archivos, 89 casos, igual que antes |
| `npm run build` | exit 0 |
| `package.json` y `package-lock.json` | sin cambios respecto a HEAD |
| Primitivos de Catalyst | los 7 presentes |
| `src/types/env.d.ts`, `config.ts`, `config.server.ts` | intactos |
| Enlaces relativos rotos fuera de cambios archivados | 0 |

## Descripción para el commit

```
Remove seven files with no importers, six unused enum constants and one export left
orphaned by them, and record what is kept on purpose as technical debt.
```

*(26 palabras)*
