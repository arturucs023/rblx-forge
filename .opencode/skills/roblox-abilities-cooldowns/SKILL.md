---
name: roblox-abilities-cooldowns
description: Habilidades con cooldown, cargas y ultis (dash, esquiva, AoE). Úsala cuando necesites diseñar, balancear o validar habilidades con UI de cooldown y anti-spam de servidor.
---

# Habilidades y Cooldowns

## Objetivo
Diseñar e implementar habilidades activas (dash, esquiva, stun, ulti) con cooldowns legibles, validación autoritativa en servidor y UI que siempre refleja el estado real.

## Alcance y límites
Esta skill cubre ciclo completo de habilidad: desbloqueo, activación, cooldown, interrupción, UI y telemetría. Es la versión profunda y de producción.
Diferenciación declarada: `roblox-game-systems` (instalada) es un recetario fino con ejemplos mínimos; esta skill es la versión profunda con balance numérico, máquina de estados y anti-spam. NO cubre combate completo con hitboxes y daño (lo cubre `roblox-combat-systems`), ni progresión de desbloqueos por quests (lo cubre `roblox-quest-progression-systems`), ni precios de habilidades premium (lo cubre `roblox-economy-balancing`). `roblox-genre-patterns` es solo catálogo de géneros y no profundiza en habilidades.

## Casos de uso
- Dash con i-frames y doble carga.
- Esquiva direccional con stamina compartida.
- Ulti con carga por daño dealt y cinemática corta.
- Habilidad de curación con casteo interrumpible.
- Sprint táctico con penalizador de ruido en horror/sigilo.

## Bucle de juego o sistema (diseño)
1. Jugador lee estado (icono + radial + tecla + carga).
2. Intenta activar (input → petición al servidor).
3. Servidor valida (cooldown, recurso, estado, distancia/LOS si aplica).
4. Ejecución (efecto gameplay + VFX/SFX + coste).
5. Recuperación (cooldown/cargas) y feedback de fallo legible.
Balance de ejemplo: dash 12 m, CD 6 s, 2 cargas, recarga 6 s/carga; DPS sostenido no debe subir más de +18% vs. no usar habilidad; ulti cada 90–120 s de juego activo. Si el pick-rate de una habilidad supera 70% o el win-rate de su build supera 55%, renivela costes.

## Proceso paso a paso
1. Define catálogo: ID, tipo (instantánea / casteo / canalizada / toggle), coste, CD, alcance, duración, tags.
2. Define máquina de estados por jugador: `Ready → Casting → Active → Recovering → Ready`, más `Locked` y `Silenced`.
3. Implementa input en cliente solo como intención: envía `RemoteEvent AbilityRequest(ID, tick, aimCFrameCompacto)`, nunca apliques efecto local definitivo.
4. Implementa autoridad en servidor: tabla `estado[Player][AbilityID] = {nextReady, cargas, casteoHasta}`; rechaza si `os.clock() < nextReady`.
5. Aplica efecto desde servidor (velocidad, daño vía `roblox-combat-systems`, buff con `Attributes`), replica con `Attributes` o `RemoteEvent AbilityFired`.
6. Construye UI: radial de cooldown, contador, pips de cargas, flash de "no listo" con motivo (`CD`, `STUN`, `SIN MANÁ`).
7. Añade interrupciones: daño > umbral cancela casteo; muerte/stun limpia estados; cambio de herramienta no duplica timers.
8. Telemetría: uso/min, tasa de rechazo servidor, pick-rate; ajusta números cada iteración.

## Conocimientos técnicos
### Qué valida el servidor
- Cooldown y cargas con reloj de servidor (`os.clock()`), nunca `tick()` de cliente.
- Recurso suficiente (maná/stamina leído de `Attributes` del servidor).
- Estado permitido: no muerto, no stuneado, no en menú/tienda.
- Parámetros dentro de rango: distancia objetivo ≤ alcance + tolerancia 2 studs, ángulo y línea de vista si es dirigida.
- Rate-limit: máximo 8 peticiones/s por jugador; exceso = ignorar + contar strike.
### Persistencia
- Guarda con `DataStoreService` solo desbloqueos y nivel de habilidad, jamás cooldowns activos. Al cargar, todo entra en `Ready` salvo ulti que entra con 30% de carga.
- Versiona tabla `abilities_v1`; migración con pcall y valores por defecto.
### Errores/desconexiones
- Si el cliente pierde paquetes, el servidor es fuente de verdad: cliente reconcilia UI al recibir `AbilityState`.
- `PlayerRemoving` limpia timers y casteos. Reaparición resetea estados a `Ready`.
- Fallo de `RemoteEvent` o exploit detectado: responde con código de error tipado, no con kick salvo reincidencia (3 strikes en 60 s).
### Anti-exploit
- El cliente nunca envía "hago 500 de daño" ni "mi CD terminó"; el servidor recalcula todo.
- Sanitiza `aimCFrame`: clamp de magnitud, NaN check (`v ~= v`), y distancia máxima desde `HumanoidRootPart`.
- Detección de spam: ventana deslizante; más de 12 intentos en 2 s = silenciar inputs 5 s y loggear.
- No confíes en `CooldownGui` local; un exploiter puede ocultarla, el servidor sigue bloqueando.

## Buenas prácticas
- Un `Script` servidor `AbilityServer` + un `ModuleScript` compartido `AbilityDefs`; un `LocalScript` solo para input y fantasmas visuales.
- Usa `CollectionService` para etiquetar zonas que silencian habilidades (`NoAbilityZone`).
- Cooldown global corto (0.35 s) además del específico para evitar macros de doble habilidad.
- Feedback en <150 ms aunque el efecto lo autorice el servidor: pre-visual local no autoritativo + corrección.
- Accesibilidad: reasignar teclas, alternativa táctil con botones grandes, daltonismo en radiales.

## Errores frecuentes
1. Cooldown solo en cliente → spam infinito con executor; corrige moviendo reloj a servidor.
2. Cargas que se duplican al reequipar herramienta → guarda estado por `Player`, no por herramienta.
3. Dash que atraviesa paredes → valida destino con `Raycast`/`Shapecast` en servidor y desliza o cancela.
4. Ulti que no se interrumpe al morir → el fantasma sigue haciendo daño; limpia con `Humanoid.Died`.
5. UI desincronizada tras lag → no animar CD solo con `TweenService`; reconciliar con timestamp servidor.

## Criterios de calidad y terminado
- [ ] 100 activaciones legítimas consecutivas sin falso rechazo con ping 80–200 ms.
- [ ] Script de spam (20 req/s durante 10 s) bloqueado sin caída de servidor ni efecto aplicado.
- [ ] UI muestra motivo de fallo en 100% de rechazos probados (CD, recurso, estado).
- [ ] Dash respeta colisiones en 50/50 intentos contra muro fino y grueso.
- [ ] Pick-rate de habilidades entre 15–70% y delta de win-rate por build <6 pp en muestra de 200 rondas.
- [ ] Rejoin no conserva cooldowns y no duplica cargas.

## Herramientas
Servicios/clases: `RemoteEvent`, `Players`, `Attributes`, `CollectionService`, `TweenService`, `ProximityPrompt` (para habilidades de interacción si aplica), `PathfindingService` (no necesario aquí), `DataStoreService` (solo desbloqueos). Todo con APIs estables; si dudas, verificar en create.roblox.com/docs.

## Limitaciones
- No implementa hitboxes precisas ni balance de daño sostenido; componer con `roblox-combat-systems`.
- No implementa árboles de talentos ni quests de desbloqueo; componer con `roblox-quest-progression-systems`.
- Latencias >300 ms requieren diseño con predicción adicional fuera de este alcance.

```luau
-- Ilustrativo: validación mínima de cooldown en servidor.
local estado = {}
local CD = 6
local function puedeUsar(playerId: string): boolean
	local s = estado[playerId]
	if not s then s = { listoEn = 0 } estado[playerId] = s end
	return os.clock() >= s.listoEn
end
local function marcarUso(playerId: string)
	estado[playerId].listoEn = os.clock() + CD
end
```
