---
name: roblox-rpg
description: RPG/aventura con clases, stats, mundo, jefes y party. Úsala cuando necesites diseñar progresión, quests de zona, dungeons y combate de grupo.
---

# RPG / Aventura (Clases, Stats, Mundo, Jefes)

## Objetivo
Diseñar un RPG jugable 30+ horas: 3–5 clases con identidad, stats transparentes, mundo por zonas, quests, dungeons y jefes con mecánicas, más party que premia cooperar.

## Alcance y límites
Versión profunda de género: bucles, progresión, mecánicas, UX, rendimiento y pitfalls.
Diferenciación declarada: `roblox-genre-patterns` es catálogo de 1 línea; esta skill es la versión profunda de RPG. `roblox-game-systems` es recetario fino. NO repite: combate fino se compone con `roblox-combat-systems`, quests/logros con `roblox-quest-progression-systems`, economía con `roblox-economy-balancing`, social/party/clanes con `roblox-social-systems`, eventos mundiales con `roblox-dynamic-events`. Aquí se integran en un mundo coherente.

## Casos de uso
- RPG de mundo abierto con 5 zonas por nivel.
- Dungeon crawler 4 jugadores con 3 jefes.
- RPG de historia con capítulos y decisiones.
- MMO-lite con hubs, profesiones y raids.
- RPG de evento con temporada y reset suave.

## Bucle de juego o sistema (diseño)
- Bucle 2 min: matar/explorar → +XP/loot → subir número visible.
- Bucle 20 min: completar quest de zona, desbloquear punto rápido, mejorar pieza.
- Bucle sesión: dungeon/jefe con loot semanal + progreso de historia.
- Bucle temporada: nivel cap, raid, mount/título exclusivo.
Progresión: XP `100 * 1.28^nivel`, tiempo/nivel 12–20 min hasta 20, 30–45 min hasta 40; stats: cada punto +2% daño o +15 HP; clases con delta: guerrero +40% HP/−10% daño, mago +35% daño/−30% HP, pícaro +20% crit; boss HP = DPS_party_esperado × 120–180 s; si el 80% juega 1 clase, buffa identidad de las otras, no solo números.

## Proceso paso a paso
1. Define 3–5 clases con fantasía, recurso (maná/furia), rol (tank/heal/DPS) y 6–8 habilidades (componer cooldowns con `roblox-abilities-cooldowns`).
2. Stats derivadas en servidor: `daño = base × (1+ATK/100) × multClase`; muestra fórmula simplificada en UI.
3. Mundo por zonas de nivel (1–10, 10–20...) con transiciones, puntos rápidos y nivel sincronizado (sidekick: −2/+2) para jugar con amigos.
4. Quests de zona: 3 principales + 4 secundarias por zona (componer estructura con `roblox-quest-progression-systems`); marcador + distancia siempre.
5. Dungeons: lockout diario/semanal, roles requeridos 1-1-2, checkpoints por jefe (componer con `roblox-checkpoints`).
6. Jefes con 2–4 mecánicas telegrafiadas (AoE 2 s, adds, fase 50%); enrage a 5 min para evitar eternas.
7. Party: loot por contribución + need/greed simple, revive con casteo 3 s, XP compartida en 60 m.
8. Onboarding: 10 min con clase prestada, cambio gratis hasta nivel 10, luego con coste.

## Conocimientos técnicos
### Qué valida el servidor
- Daño/XP/loot calculados en servidor; cliente nunca envía "subo nivel".
- Habilidades con cooldown/recurso/estado (componer validación de habilidades).
- Acceso a zona/dungeon por nivel/quest/llave; teleport solo servidor.
- Need/greed: un voto por jugador, objeto único, timeout 30 s.
### Persistencia
- `DataStoreService`: nivel, XP, clase, stats, inventario, quests, cooldowns de lockout (`dungeonId→reseteaUnix`), puntos rápidos.
- Guarda cada 90 s + tras boss/level-up; `UpdateAsync` si hay trade.
- Temporadas: snapshot `season_3` separado; reset suave conserva cosméticos.
### Errores/desconexiones
- Caída en boss: rejoin en 5 min vuelve a la puerta del jefe, no al inicio, si el grupo sigue vivo.
- Líder se va: liderazgo pasa al siguiente + loot sigue repartible.
- Rollback: congela trade 10 min y avisa; no borra progreso sin backup.
### Anti-exploit
- Anti-farm de élite: lockout + diminishing returns tras 5 kills/hora (−80%).
- Anti-teleport a zona final: valida nivel en cada ganancia de XP.
- Anti-oneshot: clamp de daño/atributo (ej. ATK ≤ 5000) con log de outliers.
- Detección de bots: farmeo 3 h sin quest ni movimiento social = revisión.

## Buenas prácticas
- Identidad antes que números: cada clase debe sentirse distinta en 5 min.
- Tiempo a diversión <10 min: combate, loot y primera quest completada.
- Muestra números honestos (DPS, % crit) y dummies de prueba por zona.
- Accesibilidad: reasignar teclas, modo daltónico, telegrafías con forma + color.
- Performance: culling por zona, pools de enemigos (máx 40 activos), LOD de VFX.

## Errores frecuentes
1. 12 clases sin identidad → todas iguales; 3–5 pulidas mejor.
2. Quest "mata 50" sin historia → churn; mezcla con exploración y jefes.
3. Boss esponja sin mecánicas → aburrido; 2 mecánicas mínimo + fases.
4. Sin sincronía de nivel → amigos no juegan juntos; sidekick obligatorio.
5. Loot ninja sin reglas → toxicidad; need/greed + log visible.

## Criterios de calidad y terminado
- [ ] Nuevo jugador completa tutorial y primera quest en <15 min sin ayuda.
- [ ] 4 clases entre 15–35% pick-rate en 200 jugadores.
- [ ] Boss de 4 con grupo medio cae en 2–4 min con 1–3 wipes de aprendizaje.
- [ ] Exploit de XP (teleport a zona final) otorga 0 XP en 10 pruebas.
- [ ] Rejoin a dungeon conserva lockout y permite retomar en jefe.
- [ ] 20 jugadores + 30 NPCs por zona ≥40 FPS en dispositivo medio.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Teams`, `Attributes`, `CollectionService`, `DataStoreService`, `OrderedDataStore`, `BadgeService`, `MarketplaceService`, `PathfindingService`, `ProximityPrompt`. Componer con `roblox-combat-systems`, `roblox-quest-progression-systems`, `roblox-social-systems`. Verificar en create.roblox.com/docs.

## Limitaciones
- No sustituye el diseño de combate/quests/economía; los compone.
- Raids de 20+ y PvP masivo requieren arquitectura adicional.
- Historia ramificada compleja queda fuera; arcos lineales + secundarias aquí.

```luau
-- Ilustrativo: XP y nivel en servidor.
local function xpParaNivel(nivel: number): number
	return math.floor(100 * (1.28 ^ (nivel - 1)))
end
local function debeSubir(xp: number, nivel: number): boolean
	return xp >= xpParaNivel(nivel)
end
```
