---
name: roblox-dynamic-music
description: Diseña música adaptativa por capas según el estado del juego. Úsala cuando necesites música que cambie entre exploración, tensión y combate con loops sin cortes.
---

# Música dinámica por capas y estados

## Objetivo

Construir un sistema de música que sigue al juego: capas instrumentales que
entran y salen según el estado (exploración, tensión, combate, victoria,
derrota), con transiciones musicales limpias y bucles que no se notan.

## Alcance y límites

**Diferenciación declarada:** la skill instalada `roblox-audio` cubre el motor
de audio y el grafo moderno (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
`Wire`, efectos). Esta skill NO repite el motor: cubre diseño por dominio de
música adaptativa (capas por estado, loops, transiciones). La skill instalada
`roblox-animation-audio-feedback` cubre el *juice* general; esta skill no la
repite (la referencia si un cambio musical necesita un acento de feel).

Esta skill NO hace:

- Ambientes no musicales por zonas → lo cubre `roblox-ambient-soundscapes`.
- One-shots de UI, pasos o impactos → lo cubre `roblox-sfx-design`.
- Mezcla global, ducking y presupuestos → lo cubre `roblox-audio-mixing`.
- Efectos de motor de vehículos → lo cubre `roblox-vehicle-audio`.

## Casos de uso

1. Explorar con pad suave que añade percusión al entrar en combate.
2. Mazmorra con capa de tensión que crece por proximidad al jefe.
3. Victoria con stinger de 3 s sobre la base, sin parar la música.
4. Música que baja automáticamente en menús y cinemáticas.
5. Biomas con temas distintos y puente musical entre ellos.
6. Juego sin presupuesto de composición: dos capas bien usadas mejor que
   cinco pistas mediocres.

## Proceso paso a paso

1. **Define 3–5 estados musicales.** No más al inicio: `Calma`, `Tension`,
   `Combate`, más `Menu` y `Stinger` como casos especiales. Cada estado extra
   multiplica el trabajo de transiciones.
2. **Compón por capas apilables, no por pistas separadas.** Base armónica +
   ritmo + melodía, todas al mismo tempo y tonalidad, para poder sumar o
   restar sin disonancias. Pistas separadas por estado casi siempre chocan.
3. **Garantiza loops sin cortes.** Cada capa con `Looped = true`, duración
   múltiplo del compás y cola de reverberación recortada o incluida en el
   loop. Prueba cada loop aislado 5 minutos: si el corte se nota, no sirve.
4. **Centraliza el estado musical en el servidor.** El servidor valida lo
   importante: si hay combate o no, si el jefe vive, si la partida terminó.
   El cliente solo mezcla capas. Replica cambios con `RemoteEvent`.
5. **Diseña la matriz de transiciones.** Por cada par de estados, decide:
   fundido directo (2–4 s), espera al final del compás, o stinger puente.
   Combate→Calma casi siempre pide fundido largo; Calma→Combate admite corte
   con golpe de entrada.
6. **Implementa fundidos por capa.** Ejemplo ilustrativo (simplificado):
   ```luau
   -- Ilustrativo: subir la capa de percusión al entrar en combate.
   local TweenService = game:GetService("TweenService")
   local info = TweenInfo.new(2.5, Enum.EasingStyle.Linear)
   capaPercusion:Play()
   TweenService:Create(capaPercusion, info, { Volume = 0.7 }):Play()
   ```
7. **Añade stingers para eventos puntuales.** Victoria, derrota, descubrimiento:
   one-shot sobre la base sin detenerla. Un stinger tapa un fundido mediocre.
8. **Reserva la banda de la voz y los SFX.** Música con menos medios-agudos
   agresivos; el ducking fino (bajar música bajo voz/SFX) es de
   `roblox-audio-mixing`, pero el diseño por capas ya debe dejar hueco.
9. **Trata menús y cinemáticas.** Baja la música a 0.2–0.3 o cambia a capa
   mínima; nunca la pares en seco salvo pantalla de título inicial.
10. **Sincroniza cambios con gameplay, no con reloj.** El cambio a combate
    debe dispararse por el evento real (daño, agro), no por temporizador.
11. **Prueba secuencias completas.** Calma→Tensión→Combate→Victoria→Calma sin
    pausas raras, solapes disonantes ni picos de volumen.
12. **Congela el alcance.** Añadir un sexto estado a última hora rompe la
    matriz de transiciones. Cierra estados antes de pulir.

## Conocimientos técnicos

- El servidor valida lo importante: estado de combate, vida del jefe, fase de
  partida. El cliente nunca decide solo "estamos en combate" si eso afecta a
  otros sistemas.
- Persistencia: guarda la preferencia de música del jugador (volumen, mute)
  si el juego la ofrece; el estado musical vivo (capa actual) se recalcula al
  entrar, nunca se restaura de un guardado.
- Errores: si un asset de capa falla al cargar, sigue con las capas
  disponibles y registra el fallo; jamás dejes al jugador en silencio total
  por un asset caído. Usa `pcall` donde la carga sea externa.
- Agrupa capas en un `SoundGroup` propio (`Music`) para control global de
  volumen y mute con un solo ajuste.
- `Sound` con `Looped = true` es la base fiable; si usas `AudioPlayer` del
  grafo moderno, los detalles del grafo son de `roblox-audio`.

## Buenas prácticas

- Mismo tempo y tonalidad en todas las capas apilables.
- Fundidos de 2–4 s; cambios a combate pueden ser más rápidos (1–2 s).
- Nombra por convención: `MUS_bosque_base_120bpm_v1`.
- Documenta la matriz de transiciones en una tabla visible para todo el equipo.
- Prueba a volumen bajo: si la música molesta bajita, molestará alta.
- Un stinger bueno vale más que una quinta capa.

## Errores frecuentes

1. Pistas separadas por estado con distinto tempo → transición imposible.
2. Parar y rearrancar música en cada cambio → baches y reinicios molestos.
3. Dejar que el cliente decida el estado musical con efecto en gameplay.
4. Loop con clic al cerrar → se nota cada 30 s durante horas.
5. Música que compite con voz y SFX en la misma banda.
6. Demasiados estados al inicio → matriz de transiciones inabarcable.
7. No probar la secuencia completa, solo estados aislados.

## Criterios de calidad y terminado

- [ ] 3–5 estados definidos y matriz de transiciones documentada.
- [ ] Todas las capas comparten tempo y tonalidad.
- [ ] Cada loop aguanta 5 minutos aislado sin corte perceptible.
- [ ] Secuencia completa Calma→Combate→Victoria sin baches ni disonancias.
- [ ] Stingers de eventos clave implementados sin detener la base.
- [ ] Menús y cinemáticas con tratamiento musical definido.
- [ ] Preferencia de volumen/mute del jugador respetada.

## Herramientas

- `Sound`, `SoundGroup` (`Music`), `SoundService` para capas y control global.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` si el proyecto usa el
  grafo moderno (motor: `roblox-audio`).
- `RemoteEvent` para replicar cambios de estado musical desde el servidor.
- Interpolación de `Volume` para fundidos (ver ejemplo ilustrativo).

## Limitaciones

- No compone música: asume assets compuestos o adquiridos legalmente.
- No diseña ambientes ni SFX: deriva a `roblox-ambient-soundscapes` y
  `roblox-sfx-design`.
- No fija mezcla final ni ducking: deriva a `roblox-audio-mixing`.
- No documenta el grafo moderno en profundidad: deriva a `roblox-audio`.
- Verifica cualquier miembro de API dudoso en create.roblox.com/docs.
