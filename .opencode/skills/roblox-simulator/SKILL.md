---
name: roblox-simulator
description: Simuladores click/área con rebirths, pets+shiny y control de inflación. Úsala cuando necesites diseñar progresión, huevos, zonas y monetización de simulator.
---

# Simuladores (Click / Área)

## Objetivo
Diseñar un simulator completo y rentable: bucle click→moneda→mejora→zona→rebirth, con pets, shinies, offline earnings e inflación bajo control desde el día 1.

## Alcance y límites
Es la versión profunda de género: bucles, progresión, mecánicas, UX, rendimiento y pitfalls propios.
Diferenciación declarada: `roblox-genre-patterns` (instalada, 52 lín) es catálogo de 1 línea por género; esta skill es la versión profunda de simulator. `roblox-game-systems` es recetario fino; aquí se compone a escala de juego completo. NO repite dominios: pets detallados se componen con `roblox-pets-systems`, economía/inflación con `roblox-economy-balancing`, quests/logros con `roblox-quest-progression-systems`, social/trading con `roblox-social-systems`, combate si lo hay con `roblox-combat-systems`. Aquí solo se integran.

## Casos de uso
- Clicker de monedas con espadas por tiers.
- Simulator de fuerza/velocidad por áreas.
- Simulator de mascotas con 6 huevos y 4 zonas.
- Simulator de minería con rebirths y perks.
- Simulator de evento limitado con leaderboard.

## Bucle de juego o sistema (diseño)
- Bucle 30 s: clickear/zona → +moneda con números grandes → comprar mejora visible.
- Bucle 10 min: desbloquear huevo/zona, equipar mejor pet, subir ×2–×5.
- Bucle sesión: rebirth (reset con multiplicador permanente +5–15%) cada 45–90 min.
- Bucle social: leaderboard, tradeo, showcase de shinies.
Progresión numérica: coste mejora `base * 1.35^nivel`; moneda/zona `×6–×10` por zona; rebirth requiere `10×` moneda de la zona top; primer rebirth a 60–90 min, décimo a 6–10 h. Inflación: si el top-1% supera ×50 la mediana en 7 días, aplicar catch-up (boost ×3 a nuevos) y sink (aura limitada).

## Proceso paso a paso
1. Define 4–6 zonas con `monedaPorClick`, `costeEntrada`, `huevoLocal`, `multiplicador`; bloquea con nivel o rebirths.
2. Define 3 vías de poder: herramienta (click), pets (multiplicador, componer con `roblox-pets-systems`), rebirth (permanente).
3. Tabla de rebirths: `coste`, `mult +10%`, `monedaBonus`, `pets conservados sí/no`; máx útil 25–50 con perks cada 5.
4. Huevos por zona con pity y shiny (componer probabilidades con `roblox-pets-systems`); publica odds.
5. Offline earnings: `minutosOffline × tasaZona × 25%`, cap 8 h, reclamo con doble (Ads/Robux opcional).
6. Leaderboards: total ganado (all-time) + rebirths; `OrderedDataStore` con actualización cada 120 s, no cada click.
7. Monetización: 2× moneda 30 min, auto-click equilibrado (≤60% de click activo), +1 pet equipado; nunca vender poder permanente roto.
8. Anti-abandono: daily rewards, índice de pets, evento semanal con aura limitada.

## Conocimientos técnicos
### Qué valida el servidor
- Clicks: rate por herramienta (ej. 12/s espada base, 20/s endgame); exceso ignorado.
- Moneda: calculada en servidor (`clickValor × petMult × rebirthMult × gamepass`); cliente nunca envía cantidad.
- Compras: fondos, zona/huevo existentes, límite de pets/rebirths.
- Teleport a zona: nivel/rebirths/pago validados antes de `PivotTo`.
### Persistencia
- `DataStoreService`: moneda, total all-time, mejoras, pets (componer), rebirths, offline `ultimaSalidaUnix`, índice.
- Guarda cada 60 s + al salir + tras rebirth/huevo mítico; `UpdateAsync` para moneda si hay trade.
- Corrupción: fallback a snapshot anterior + log; jamás cero sin backup.
### Errores/desconexiones
- Duplicación por doble click en compra: idempotencia con `compraId`.
- Rejoin a zona bloqueada por cambio de balance: mueve a zona máxima válida, no a spawn roto.
- Rollback de DataStore: avisa y congela trade 10 min.
### Anti-exploit
- Anti-autoclick inhumano: >25 clicks/s sostenidos 30 s = CAPTCHA suave (verificación de juego) o throttle, no ban directo.
- Anti-teleport a zona final: valida requisitos en cada ganancia, no solo al entrar.
- Logs de ganancia/hora por cohorte para detectar outliers ×10.
- Trading de pets con impuesto 5% y nivel mínimo para frenar alts (componer con `roblox-social-systems`).

## Buenas prácticas
- Números grandes legibles (1.2M, 3.4B) + sonido de compra satisfactorio.
- Cada 5 min el jugador debe ver un desbloqueo; si no, la curva está rota.
- Zonas visualmente distintas con landmark; portales con requisitos claros.
- Usa `Attributes` para poder/moneda visible y `MemoryStoreService` para contadores efímeros.
- Performance: sin física por moneda; pools de efectos y LOD de pets.

## Errores frecuentes
1. Pets sin cap → ×500 y zonas triviales; cap total ×8–×12.
2. Rebirth sin bonus real → nadie resetea; +10% y recompensa visible.
3. Offline al 100% → progresión sin jugar; 20–30% con cap.
4. Leaderboard por frame → throttling; cada 120 s + paginado.
5. Vender poder permanente sin límite → pay-to-win y churn; vende tiempo/conveniencia.

## Criterios de calidad y terminado
- [ ] Jugador nuevo llega a zona 2 en 12–20 min sin ayuda.
- [ ] Primer rebirth alcanzable en 60–90 min de juego activo.
- [ ] Top-1% vs. mediana ≤ ×50 a 7 días del lanzamiento.
- [ ] Autoclicker 30/s no supera +40% la ganancia de click activo top.
- [ ] Rejoin tras 8 h otorga offline correcto (±5%) con cap.
- [ ] 40 jugadores por servidor ≥45 FPS en zona llena.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `DataStoreService`, `OrderedDataStore`, `MemoryStoreService`, `MarketplaceService`, `BadgeService`. Componer con `roblox-pets-systems`, `roblox-economy-balancing`, `roblox-quest-progression-systems`. Verificar en create.roblox.com/docs.

## Limitaciones
- No sustituye el diseño fino de pets/economía/quests; esta skill los integra, no los repite.
- Balance exacto exige playtest con cohortes; los números aquí son punto de partida.
- Trading cross-server y seasons requieren extensión.

```luau
-- Ilustrativo: valor de click calculado en servidor.
local function valorClick(base: number, petMult: number, rebirthMult: number, paseMult: number): number
	local total = base * petMult * rebirthMult * paseMult
	return math.floor(math.min(total, 1e12))
end
```
