---
name: roblox-obby
description: Obbies con dificultad por etapas, checkpoints y control de rage-quit. Úsala cuando necesites torres, rage games justos, skips y tiempos verificados.
---

# Obbies (Dificultad, Checkpoints, Torres)

## Objetivo
Diseñar obbies adictivos y justos: curva por etapas, checkpoints cada poco, skips pagos opcionales y anti-rage que retiene sin regalar.

## Alcance y límites
Versión profunda de género: bucles, progresión, mecánicas, UX, rendimiento y pitfalls.
Diferenciación declarada: `roblox-genre-patterns` es catálogo de 1 línea; esta skill es la versión profunda de obby. `roblox-game-systems` es recetario fino; aquí se compone. NO repite: checkpoints técnicos se componen con `roblox-checkpoints`, habilidades de movimiento (dash/doble salto) con `roblox-abilities-cooldowns`, quests/logros con `roblox-quest-progression-systems`, monetización con `roblox-economy-balancing`.

## Casos de uso
- Torre de 100 pisos con 3 dificultades.
- Rage obby corto con skip de pago.
- Obby cooperativo con botones de 2 jugadores.
- Carrera de obby con timer y leaderboard.
- Mega-obby de 1000 etapas con guardado por mundos.

## Bucle de juego o sistema (diseño)
- Bucle 30 s: intentar salto → fallar barato → reintentar en <2 s.
- Bucle 10 min: superar sección temática y ver progreso % subir.
- Bucle sesión: coronar torre, foto + badge + tiempo.
Dificultad: mide `muertes/intento` por etapa; fácil <15%, media 15–35%, difícil 35–60%, extremo >60% solo opcional; 70% etapas fáciles/medias, 25% difíciles, 5% extremas; checkpoint cada 4–8 saltos o 60–90 s; si el abandono en una etapa supera 40% en 500 intentos, nerfea (plataforma +0.5 studs o checkpoint extra).

## Proceso paso a paso
1. Bloquea layout por secciones temáticas de 10 etapas con checkpoint grande al final (componer guardado con `roblox-checkpoints`).
2. Estandariza saltos: distancia base 7 studs andando, 10–12 corriendo; altura 2–3; lava = muerte instantánea con respawn 1.5 s.
3. Variedad rotativa: saltos, `Conveyor`, hielo (fricción baja), botones temporales, láseres con patrón; introduce 1 mecánica nueva por sección con zona segura de práctica.
4. Skips: 1 gratis por torre + resto con Robux/moneda creciente; skip no da tiempo de leaderboard.
5. Modos: normal (checkpoints), hardcore (sin checkpoints, badge aparte), contrarreloj (timer servidor).
6. UX: etapa actual/total, % torre, muertes, timer, fantasma de mejor intento si aplica.
7. Validación de tiempos: timer solo servidor; completa con `Touched` ordenado (componer con `roblox-checkpoints`).
8. Playtest por cohorte: novatos deben completar torre fácil en 15–25 min con <80 muertes.

## Conocimientos técnicos
### Qué valida el servidor
- Orden de checkpoints y tiempos coherentes (velocidad a pie + tolerancia).
- Skip con pago y auditoría; leaderboard excluye runs con skip.
- Ganador/badge solo si recorrió etapas requeridas en orden.
- Rate-limit de toques de checkpoint 10/s.
### Persistencia
- `DataStoreService`: `maxStage` por torre, mejor tiempo sin skip, muertes totales, skips usados.
- Guarda cada checkpoint grande + al salir; versión por torre (`obbyTorreA_v2`).
- Rejoin ofrece continuar; hardcore nunca guarda a mitad.
### Errores/desconexiones
- Caída mid-torre: rejoin al último checkpoint grande, no al exacto si cambió el layout.
- Plataforma móvil desincronizada: usa `TweenService`/CFrame servidor con tiempo, no física cliente.
- Empuje entre jugadores: colisión opcional desactivable en zonas estrechas.
### Anti-exploit
- Anti-fly/teleport entre checkpoints (distancia/tiempo); 3 strikes = run invalidada sin ban.
- Anti-noclip en muros finos: grosor mínimo 1 stud + kill-brick detrás si es crítico.
- Speed-hack: si el tiempo por sección <60% del récord humano, invalida.
- Skips falsos: solo el servidor puede avanzar etapa.

## Buenas prácticas
- Muerte barata y rápida: respawn ≤2 s, sin pantalla de carga.
- Señaliza: verde = seguro, rojo = muerte, amarillo = temporal; tutorial de 5 saltos.
- Checkpoints visibles y distintos; sonido de logro corto.
- Rage control: mensaje humorístico, botón práctica, pausa sugerida tras 10 muertes seguidas.
- Performance: reutiliza piezas, `CanCollide` solo donde importa, LOD en torres de 500+ partes.

## Errores frecuentes
1. 20 saltos difíciles sin checkpoint → rage-quit 60%; checkpoint cada 5.
2. Plataformas de 1 stud con lag → imposible en móvil; mínimo 3×3 para normal.
3. Lava con hitbox gigante → muertes injustas; hitbox 10% más pequeña que visual.
4. Timer en cliente → récords falsos; timer servidor.
5. Sin modo práctica → novatos abandonan; práctica sin ranking.

## Criterios de calidad y terminado
- [ ] Torre fácil completada por 5 testers nuevos en 15–25 min.
- [ ] Ninguna etapa con abandono >40% en 500 intentos.
- [ ] Teleport a la cima rechazado 10/10 sin badge.
- [ ] Respawn medio <2 s en 20 muertes.
- [ ] Run con skip excluida de leaderboard automáticamente.
- [ ] 30 jugadores en torre ≥45 FPS.

## Herramientas
Servicios/clases: `Players`, `CollectionService`, `Attributes`, `DataStoreService`, `OrderedDataStore` (tiempos), `RemoteEvent`, `BadgeService`, `TweenService`. Componer con `roblox-checkpoints` y `roblox-abilities-cooldowns`. Verificar en create.roblox.com/docs.

## Limitaciones
- No cubre habilidades de movimiento avanzadas; componer con habilidades.
- No cubre rankings cross-server complejos; extensión con `MemoryStoreService`.
- No genera torres procedurales; layout manual o generador aparte.

```luau
-- Ilustrativo: tasa de abandono por etapa.
local function abandono(intentos: number, abandonos: number): number
	if intentos == 0 then return 0 end
	return abandonos / intentos
end
-- Si > 0.40 en 500 intentos, nerfear etapa.
```
