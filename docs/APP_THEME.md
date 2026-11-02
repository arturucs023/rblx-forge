# Tema de la app — DESIGN.md (Atlassian light)

Fuente única: `DESIGN.md` en la raíz (theme light, alpha rev 0.0.7).
Los nombres `forge-*` del CSS se conservan para no romper componentes; sus
valores son literales del manifiesto.

## Correspondencias

| `forge-*` | Token DESIGN.md | Valor |
|---|---|---|
| `forge-bg` | `surface` (canvas) | `#FFFFFF` |
| `forge-panel` | `surface` (card) | `#FFFFFF` |
| `forge-panel2` | `surface-sunken` | `#F8F8F8` |
| `forge-panel3` | `background-neutral-hovered` equiv. | `#F0F1F2` |
| `forge-border` | `border` | `#0B120E24` |
| `forge-border-soft` | `background-neutral` (sutil) | `#0515240F` |
| `forge-text` | `text` | `#292A2E` |
| `forge-muted` | `text-subtle` | `#505258` |
| `forge-faint` | `text-subtlest` | `#6B6E76` |
| `forge-accent` | `text-brand`/`background-brand-bold` | `#1868DB` |
| `forge-accent-soft` | `background-selected` | `#E9F2FE` |
| `forge-accent-dim` | `border-accent-blue-subtle` | `#8FB8F6` |
| `forge-ok` / `*-soft` | `text-success` / `background-success` | `#216E4E` / `#DCFFF1` |
| `forge-warn` / `*-soft` | `text-warning` / `background-warning` | `#9E4C00` / `#FFF5DB` |
| `forge-err` / `*-soft` | `text-danger` / `background-danger` | `#AE2E24` / `#FFECEB` |
| `forge-info` / `*-soft` | `text-information` / `background-information` | `#1558BC` / `#E9F2FE` |

## Recetas aplicadas (`src/index.css`)

- `.card`: `surface` + borde hairline + radio 8px (`radius-large`). Sin degradados.
- `.btn`: radio 6px (`radius-medium`), peso 500; `primary` = `#1868DB` + texto
  inverso; `danger` = `#C9372C` + texto inverso (receta `button-danger`).
- `.input`: fondo blanco, borde 1px `#8C8F97`, radio 6px, foco `#4688EC` 2px.
- `.pill`: borde semántico visible (regla lozenge) + fondos `*-subtler`.
- `.section-label`: sentence case 12px semibold en `text-subtle` (el manifiesto
  prohíbe eyebrows en mayúsculas con tracking).
- `shadow-2xl` = `shadow-overlay` del manifiesto.
- Código (highlight.js y Monaco `forge-light`): `text-code-*` del manifiesto.
- Terminal: fondo blanco, texto `#292A2E`, cursor `#1868DB`.

## Pendiente (no inventado, fuera de este pase)

- Iconos Unicode/emoji como iconos (`✓ × › 📎 ■ …`): el manifiesto los
  prohíbe; migrar a SVG de 16px por componente.
- Sentence case total en literales existentes.
