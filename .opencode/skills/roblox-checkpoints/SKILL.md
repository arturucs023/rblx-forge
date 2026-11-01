---
name: roblox-checkpoints
description: Checkpoints con guardado de progreso, respawn y anti-skip. Úsala cuando necesites obbies, torres, carreras o niveles con etapas verificadas.
---

# Checkpoints (Guardado de Progreso y Anti-Skip)

## Objetivo
Guardar progreso por etapas de forma justa: respawn rápido en el último checkpoint válido, sin skips por teleport y con states que sobreviven a rejoin.

## Alcance y límites
Cubre checkpoints lineales y ramificados, respawn, skips comprables, validación de orden y persistencia.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con orden validado y anti-skip. NO cubre diseño de dificultad de saltos (componer con `roblox-obby` para obbies), ni recompensas globales (lo cubre `roblox-economy-balancing`), ni misiones (lo cubre `roblox-quest-progression-systems`). `roblox-genre-patterns` no profundiza.

## Casos de uso
- Obby de 50–200 etapas con guardado.
- Torre con pisos y skips de pago.
- Carrera con vueltas y sectores.
- Mazmorra con puertas que requieren checkpoint previo.
- Modo historia con capítulos rejugables.

## Bucle de juego o sistema (diseño)
1. Avanzar etapa (salto/carrera/puerta).
2. Tocar checkpoint → confirmación visual/sonora.
3. Morir/caer → respawn en 1–2 s en último válido.
4. Opcional: skip con coste creciente.
5. Completar → tiempo, muertes y recompensa.
Balance de ejemplo: checkpoints cada 3–7 saltos difíciles o 60–90 s; skip = 25 Robux o 500 monedas, +50% por skip adicional en la misma sesión; respawn <2 s; si el abandono en una etapa supera 35%, añade checkpoint intermedio o nerfea salto.

## Proceso paso a paso
1. Numera checkpoints `Stage_001...N` con `Attributes` (`StageIndex`, `RespawnCFrame`, `RequiereAnterior`).
2. Etiqueta con `CollectionService` tag `Checkpoint`; un `Script` servidor registra toques, no `LocalScripts`.
3. Servidor valida orden: solo acepta `Stage_N` si `maxStage >= N-1` (lineal) o si el grafo permite el salto (ramificado con lista de adyacencia).
4. Detección por zona (`Touched` con debounce + verificación de `HumanoidRootPart`) o por proximidad cada 0.25 s; prefiere zona + orden.
5. Guarda `maxStage` en memoria y en `DataStoreService` cada checkpoint importante (cada 5 o cada torre), no cada toque.
6. Respawn: `Humanoid.Died` → `PivotTo(RespawnCFrame + offset)` + invulnerabilidad 1.5 s + cámara estable.
7. Skips: `RemoteFunction SkipRequest` valida coste y mueve a `N+1` como si lo hubiera tocado (con auditoría).
8. UI: progreso `12/50`, barra por torre, botón skip con coste, tabla de mejores tiempos.

## Conocimientos técnicos
### Qué valida el servidor
- Toque real: distancia al checkpoint ≤10 studs y `Humanoid` vivo del jugador correcto.
- Orden: rechaza saltos de >1 etapa salvo skip comprado o atajo declarado.
- Skip: fondos suficientes, etapa existe, cooldown 5 s entre skips.
- Tiempos: si completa 50 etapas en <120 s con saltos de 5 studs, marca para revisión (teleport).
### Persistencia
- Guarda `maxStage`, `muertes`, `mejorTiempo`, `skipsUsados` con `DataStoreService` (`progress_v2`).
- Al rejoin ofrece "continuar en etapa X" o reiniciar; nunca spawnea en etapa sin validar requisitos.
- Versiona por torre/mapa (`towerA_v3`); cambio de layout resetea o migra con aviso.
### Errores/desconexiones
- Muerte durante guardado: el respawn usa último confirmado, no el pendiente.
- Checkpoint móvil/destruido: fallback al anterior válido + log.
- Doble toque por lag: idempotente (si ya es max, ignora).
### Anti-exploit
- Anti-teleport: valida desplazamiento entre checkpoints consecutivos (distancia/tiempo coherente con velocidad a pie +20%).
- Anti-fly: si el jugador toca checkpoints sin tocar suelo intermedio (muestreo), invalida racha.
- `Touched` cliente jamás otorga etapa; solo el servidor escribe `maxStage`.
- Skips con rate-limit y log para detectar abuso de reembolsos.

## Buenas prácticas
- Checkpoints visibles a 40 m con luz/sonido distintos al activarse.
- Respawns sin caída inmediata ni cámara girada; invulnerabilidad breve señalizada.
- Dificultad en olas: 3 fáciles, 1 reto, checkpoint; evita 10 difíciles seguidos.
- Usa `Attributes` para etapa actual y replica a UI sin polling.
- Modo práctica con checkpoints infinitos y sin ranking para reducir rage-quit.

## Errores frecuentes
1. `Touched` sin debounce → 20 toques/s y spam; debounce 1 s por jugador.
2. Guardar cada etapa en DataStore → throttling; guarda cada 5 y al salir.
3. Respawn en el borde → muerte en bucle; offset +2 studs y chequeo de suelo.
4. Permitir tocar en cualquier orden → skips gratis; validar `N-1`.
5. Sin invulnerabilidad → muerte doble en lava; 1–1.5 s con parpadeo.

## Criterios de calidad y terminado
- [ ] Teleport a etapa 40 desde la 5 rechazado 10/10 veces.
- [ ] 100 toques legítimos con lag 150 ms aceptados sin falsos rechazos >3%.
- [ ] Rejoin continúa en etapa guardada en 5/5 pruebas.
- [ ] Respawn medio 1.2–2 s medido en 20 muertes.
- [ ] Skip cobra exacto y avanza 1 etapa con auditoría.
- [ ] Abandono por etapa medido para detectar picos >35%.

## Herramientas
Servicios/clases: `Players`, `CollectionService`, `Attributes`, `DataStoreService`, `RemoteEvent`, `RemoteFunction`, `BadgeService` (premio por torre). Verificar en create.roblox.com/docs.

## Limitaciones
- No diseña saltos ni torres completas; componer con `roblox-obby`.
- No gestiona rankings globales cross-server; usa `OrderedDataStore`/`MemoryStoreService` como extensión.
- No cubre puertas con llaves complejas; eso es `roblox-quest-progression-systems`.

```luau
-- Ilustrativo: validación de orden lineal.
local maxStage = {}
local function tocaCheckpoint(player, n: number): boolean
	local actual = maxStage[player.UserId] or 0
	if n == actual + 1 or n <= actual then
		maxStage[player.UserId] = math.max(actual, n)
		return true
	end
	return false -- skip no válido
end
```
