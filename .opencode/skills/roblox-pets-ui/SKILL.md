---
name: UI de Mascotas Roblox
description: Colección, equipar, hatch, fusión y showcase de pets. Úsala cuando necesites inventario de mascotas, huevos con reveal, fusión shiny o boosts visibles.
---

# roblox-pets-ui

## Objetivo
Hacer legible y emocionante la colección de mascotas: ver, equipar, conseguir
y mejorar pets con feedback de rareza en cada paso.

## Alcance y límites
Cubre la UI de pets (colección, hatch, fusión, equipados, boosts). NO cubre
la economía de pets ni los rolls (eso es `roblox-pets-systems`, servidor).
NO cubre modelos/VFX de las pets (`roblox-props-creation`,
`roblox-animation-audio-feedback`).

## Casos de uso
- Huevo con animación de reveal y tiers de rareza.
- Inventario de pets con equipar/desequipar y boosts sumados.
- Máquina de fusión (3 iguales → shiny) con preview del resultado.
- Showcase/index de colección con % completado.

## Proceso paso a paso
1. Replica el estado de pets del servidor (lista + equipados + pity) a un
   módulo cliente de solo lectura; la UI nunca decide rolls.
2. Colección: grid por rareza (común→legendario con marco y color), contador
   xN, filtro por equipados, buscador si >30.
3. Hatch: botón grande, animación de reveal por fases (shake → flash → reveal),
   skip comprable; el resultado lo dicta el servidor.
4. Fusión: slots de entrada validados (misma especie+rareza), preview del
   resultado con odds visibles, confirmación.
5. Equipados: slots 1–N con drag o tap-to-equip, boost total sumado y visible
   en HUD (`roblox-hud` para el chip de boost).
6. Progresión: barra de pity, % de índice, siguiente desbloqueo visible.

## Conocimientos técnicos
- Replicación de inventario vía `Attributes`/carpeta de valores + remotes;
  reveals sincronizados por timestamp de servidor.
- Rarity tiers con colores consistentes en todo el juego.

## Buenas prácticas
- Las odds siempre visibles antes de pagar (exigencia de `roblox-policy-compliance`).
- Reveal skipeable; nunca bloquees el juego en una animación.
- Sonido + flash proporcionales a la rareza (juice medido, ver feedback skills).

## Errores frecuentes
1. UI que muestra un pet antes de que el servidor lo confirme (dupe visual).
2. Odds ocultas o engañosas → baneo/mala review.
3. Fusión sin confirmación con pets equipados dentro.
4. Grid sin paginar con 200+ pets (lag de layout).

## Criterios de calidad y terminado
- [ ] Hatch→reveal→colección funciona con el servidor como única verdad.
- [ ] Odds y pity visibles y correctos contra la config del servidor.
- [ ] Fusión bloquea pets equipados salvo confirmación explícita doble.
- [ ] Grid de 200 pets abre en <1 s en móvil medio.

## Herramientas
MCP: playtest con input real en hatch y fusión; `get_runtime_logs` para
errores de réplica.

## Limitaciones
- No diseña la economía de drops (eso es `roblox-pets-systems`); esta skill
  solo la presenta con honestidad.
