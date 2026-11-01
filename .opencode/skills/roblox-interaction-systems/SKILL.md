---
name: roblox-interaction-systems
description: Interacciones con raycast, prompts, hold y feedback. Úsala cuando necesites puertas, loot, NPC diálogo, recolección o botones con UX clara.
---

# Interacciones con el Entorno

## Objetivo
Crear interacciones predecibles y rápidas: el jugador siempre sabe qué puede tocar, cuánto tarda y qué pasará, con validación servidor en cada activación.

## Alcance y límites
Cubre `ProximityPrompt`, `ClickDetector`, raycast de mirada, hold-to-interact, feedback y accesibilidad.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con UX, concurrencia y spam-control. NO cubre recolección con economía de nodos (lo cubre `roblox-resource-gathering`), ni construcción (lo cubre `roblox-building-placement`), ni diálogo ramificado (requiere sistema de diálogo dedicado). `roblox-genre-patterns` no profundiza.

## Casos de uso
- Puertas/cajas fuertes con hold y llave.
- Loot con ventana personal y spam-click.
- NPC que abre tienda/diálogo al acercarse.
- Botones de mapa que activan puentes/trampas.
- Reparar/hackear con barra de progreso interrumpible.

## Bucle de juego o sistema (diseño)
1. Descubrir affordance (outline + prompt a distancia legible).
2. Acercarse (rango) y leer coste/efecto.
3. Mantener/pulsar (hold 0–3 s según riesgo).
4. Validación y efecto + feedback inmediato.
5. Cooldown y re-uso claro.
Balance de ejemplo: loot común hold 0.4 s, puerta con llave instantánea, hackeo 3 s interrumpible; rango 10–14 studs; cooldown 1 s para evitar doble uso; si el tiempo medio de interacción supera 2.5 s en acciones frecuentes, baja hold o añade mejora.

## Proceso paso a paso
1. Elige canal: `ProximityPrompt` (recomendado 3D), `ClickDetector` (clic simple), raycast personalizado (mirada + tecla E).
2. Estandariza prompts: `ActionText`, `ObjectText`, `HoldDuration`, `MaxActivationDistance` (10–14), `RequiresLineOfSight` cuando importe.
3. Muestra solo lo relevante: 1 prompt prioritario por proximidad; oculta el resto para evitar solape.
4. Activa vía `Prompt.Triggered` en servidor (Script, no LocalScript) o `RemoteEvent Interact(id)` si es raycast custom.
5. Valida en servidor: existe, en rango, con requisitos (llave/nivel), sin cooldown, sin uso concurrente.
6. Ejecuta efecto atómico (abrir, dar loot, teleport local) y marca `enUso` con timeout.
7. Feedback triple: animación + sonido + UI ("+3 Madera", "Puerta desbloqueada"); fallo con motivo.
8. Accesibilidad: alternativa a hold (pulsar 3 veces), tamaño de prompt grande, subtítulos de sonidos clave.

## Conocimientos técnicos
### Qué valida el servidor
- Distancia con posición servidor ≤ `MaxDistance + 2` tolerancia.
- Hold completado en servidor (`Triggered` ya lo garantiza; en custom valida duración).
- Requisitos: item/llave en inventario servidor, nivel, equipo.
- Concurrencia: objeto con `ocupadoPor` + expiración 5 s; segundo jugador recibe "en uso".
### Persistencia
- Puertas/cofres persistentes guardan estado (`abiertoPor`, `lootReclamado_UserId`) con `DataStoreService` solo si el diseño lo exige.
- Loot personal: guarda `reclamados[]` por jugador, no estado global.
- Cofres diarios: guarda `ultimaReclamacionUnix` y valida 20 h en servidor.
### Errores/desconexiones
- Hold interrumpido por muerte/salida: cancela sin efecto ni cobro.
- Objeto destruido mid-hold: falla elegante con mensaje, sin error.
- Doble trigger por lag: idempotencia por `usoId`; segundo se ignora.
### Anti-exploit
- `ClickDetector` con `MaxActivationDistance` siempre; sin él hay uso a través del mapa.
- Nunca des loot porque el cliente diga "abrí cofre X"; el servidor decide.
- Rate-limit 8 interacciones/s; más = ignorar + strike.
- Valida línea de vista para palancas críticas con `Raycast` servidor si hay riesgo de usar a través de muros.

## Buenas prácticas
- Un `Script` `InteractionServer` + `ModuleScript InteractDefs`; prompts creados por código, no a mano 1 por 1.
- `CollectionService` tags: `Lootable`, `Door`, `Hackable` para registro y limpieza.
- Prioridad: revive > puerta de misión > loot > decorativo.
- Cooldown visual en el prompt (`Enabled=false` + cuenta atrás).
- Sonido de error distinto por motivo (lejos, bloqueado, en uso).

## Errores frecuentes
1. Lógica en `LocalScript` con `Triggered` cliente → loot falso; mover a servidor.
2. 15 prompts visibles a la vez → ilegible; prioriza el más cercano.
3. Hold de 5 s para loot trivial → abandono; reserva holds largos a riesgo real.
4. Sin `RequiresLineOfSight` en palanca secreta → activable por exploit; activarlo.
5. Sin timeout de `enUso` → objeto bloqueado para siempre si el jugador se va.

## Criterios de calidad y terminado
- [ ] 30 interacciones legítimas con ping 150 ms sin falsos rechazos >3%.
- [ ] Uso a 30 studs o a través de muro rechazado 10/10.
- [ ] Doble trigger simultáneo entrega 1 solo loot.
- [ ] Hold interrumpido por muerte no cobra ni entrega.
- [ ] 50 objetos interactuables con <1 ms de coste idle.
- [ ] Test táctil: todos los prompts usables sin teclado.

## Herramientas
Servicios/clases: `ProximityPrompt`, `ClickDetector`, `Players`, `CollectionService`, `Attributes`, `RemoteEvent`, `TweenService`, `DataStoreService` (estados persistentes). Verificar en create.roblox.com/docs.

## Limitaciones
- No cubre árboles de diálogo ni cinemáticas; requiere sistema narrativo aparte.
- No cubre inventario general; componer con `roblox-resource-gathering` o `roblox-crafting`.
- Raycast custom a 60 Hz para muchos jugadores requiere optimización adicional.

```luau
-- Ilustrativo: registro de interactuables por tag.
local CollectionService = game:GetService("CollectionService")
for _, obj in CollectionService:GetTagged("Lootable") do
	print("Loot:", obj:GetFullName())
end
```
