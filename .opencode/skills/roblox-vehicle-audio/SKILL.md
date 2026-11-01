---
name: roblox-vehicle-audio
description: Diseña audio de vehículos con motor por RPM, superficies y bocinas. Úsala cuando necesites coches, motos, barcos o naves con sonido creíble dentro y fuera.
---

# Audio de vehículos creíble y barato

## Objetivo

Dar a cada vehículo una firma sonora legible: motor que sigue a las RPM y la
carga, rodadura que cambia con la superficie, frenos, claxon y diferencia
interior/exterior, sin multiplicar voces ni romper la mezcla.

## Alcance y límites

**Diferenciación declarada:** la skill instalada `roblox-audio` cubre el motor
de audio y el grafo moderno (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
`Wire`, efectos). Esta skill NO repite el motor: cubre diseño por dominio de
vehículos (motor por RPM/carga, superficies, claxon, interior/exterior). La
skill instalada `roblox-animation-audio-feedback` cubre el *juice* general;
esta skill no la repite (la referencia para remates como derrapes con feel).

Esta skill NO hace:

- SFX genéricos de UI o personajes → lo cubre `roblox-sfx-design`.
- Ambientes de la pista o ciudad → lo cubre `roblox-ambient-soundscapes`.
- Mezcla global y compresión → lo cubre `roblox-audio-mixing`.
- Física o red del vehículo (ownership, interpolación) → transporte y
  replicación finos en `roblox-networking` y `roblox-state-replication`.

## Casos de uso

1. Coche cuyo motor sube con las RPM y gruñe con carga en cuesta.
2. Moto con firma aguda distinguible del coche a 50 m.
3. Barco con motor grave + chapoteo proporcional a la velocidad.
4. Superficies: asfalto, tierra, hierba con rodadura distinta.
5. Claxon y pitidos de marcha atrás sin destrozar la mezcla.
6. Vista interior con motor filtrado y exterior con paso Doppler percibido.

## Proceso paso a paso

1. **Elige el modelo de motor.** Opción A (barata): un loop con `PlaybackSpeed`
   ligado a RPM. Opción B (rica): 2–3 loops (ralentí, medio, alto) con
   crossfade por rango de RPM. Empieza por A; pasa a B solo si A suena a
   juguete.
2. **Mapea RPM→tono y carga→carácter.** El tono sigue a las RPM; añade una
   capa grave o saturación leve con la carga (acelerador/cuesta). Sin capa de
   carga, todos los coches suenan a aspiradora.
3. **Suaviza la señal de RPM.** Interpola las RPM mostradas al audio (p. ej.
   media móvil de 0.15–0.25 s) para que el tono no tiemble. El audio perdona
   menos jitter que el velocímetro.
4. **Añade rodadura por superficie.** Capa de ruido filtrado cuyo volumen
   sigue a la velocidad y cuyo carácter cambia por superficie (tabla
   asfalto/tierra/hierba). Ejemplo ilustrativo (simplificado):
   ```luau
   -- Ilustrativo: rodadura según velocidad y superficie.
   local nivel = math.clamp(velocidad / velocidadMax, 0, 1)
   rodadura.Volume = nivel * volumenPorSuperficie[superficie]
   rodadura.PlaybackSpeed = 0.8 + nivel * 0.5
   ```
5. **Diseña eventos discretos.** Arranque, claxon, frenada, derrape, choque,
   marcha atrás. One-shots con cooldown; el claxon con límite de duración o
   repetición para evitar troleo sonoro.
6. **Separa interior y exterior.** Interior: motor con menos agudos y más
   cuerpo, rodadura atenuada. Exterior: motor completo + rodadura. Conmuta por
   cámara (primera/tercera persona) con fundido de 0.5–1 s, no con corte.
7. **Posiciona cada vehículo en el mundo.** Sonido posicional con distancia de
   corte agresiva (los vehículos lejanos son los primeros que sobran). En
   parrillas grandes, solo los N más cercanos suenan completos.
8. **El servidor valida lo importante.** Estado real del vehículo (velocidad,
   superficie, claxon activo) con autoridad de servidor o con validación de
   rangos; el cliente solo sonoriza. Anti-exploit fino: `roblox-security`.
9. **Limita voces por vehículo.** Tope por vehículo (p. ej. motor + rodadura +
   1 evento) y tope global de vehículos audibles. Sin topes, 10 coches
   hunden móvil.
10. **Prueba maniobras límite.** Acelerón, frenada, derrape, choque en cadena,
    8 vehículos juntos. Anota saturación, cortes y motores que se quedan
    "enganchados" sonando tras salir del coche.
11. **Corta el sonido al abandonar.** Al salir o destruir el vehículo, fundido
    rápido (0.3 s) y parada garantizada, incluso en casos de error (usa
    `pcall` y limpieza en destrucción).
12. **Documenta la firma por vehículo.** Loops, rangos de RPM, superficies,
    niveles interior/exterior. Dos vehículos con el mismo loop rompen la
    fantasía.

## Conocimientos técnicos

- El servidor valida lo importante: velocidad, superficie y eventos con coste
  (choques con daño) se confirman en servidor; el cliente sonoriza lo
  replicado. Replicación fina: `roblox-state-replication`, `roblox-networking`.
- Persistencia: solo preferencias (volumen de vehículos, mute de claxon
  ajeno si existe); el estado sonoro del vehículo es efímero.
- Errores: toda parada de sonido de vehículo debe tener ruta de limpieza en
  destrucción/desconexión; un motor "enganchado" es el bug clásico. Usa
  `pcall` en fundidos encadenados.
- `Sound` posicional con atenuación para vehículos; `SoundGroup` propio
  (`Vehicles`) para mezclar y mutear por familia.
- Si el proyecto usa `AudioEmitter`/`AudioListener`, el grafo es de
  `roblox-audio`; el diseño de firmas sigue siendo de esta skill.

## Buenas prácticas

- Un loop de motor de 4–8 s que aguante `PlaybackSpeed` de 0.7 a 1.6 sin
  artefactos cantosos.
- Interior/exterior como dos mezclas, no como dos juegos de assets.
- Claxon con cooldown y duración máxima: el troleo sonoro llega el día 1.
- Distancias de corte agresivas; el silencio lejano es rendimiento gratis.
- Nombra por vehículo: `VEH_cocheA_motor_mid_v1`.

## Errores frecuentes

1. Solo `PlaybackSpeed` sin capa de carga → efecto aspiradora.
2. RPM sin suavizar → tono tembloroso e irreal.
3. Sin distancia de corte → 15 motores audibles a la vez.
4. Motor que sigue sonando tras salir o destruir el vehículo.
5. Claxon sin límites → arma de troleo.
6. Interior y exterior idénticos → la cámara interior decepciona.
7. Cliente decide velocidad/sonido con efecto en gameplay → explotable.

## Criterios de calidad y terminado

- [ ] Motor sigue a RPM y carga sin artefactos en todo el rango.
- [ ] Rodadura cambia por superficie y velocidad de forma audible.
- [ ] Interior/exterior conmutan con fundido, sin cortes.
- [ ] Claxon y eventos con cooldowns y límites probados.
- [ ] Topes de voces por vehículo y globales implementados.
- [ ] Ningún motor "enganchado" tras salir, destruir o desconectar.
- [ ] Firma documentada por vehículo, sin loops compartidos entre distintos.

## Herramientas

- `Sound`, `SoundGroup` (`Vehicles`), `SoundService` para firmas y familias.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` si el proyecto usa el
  grafo moderno (motor: `roblox-audio`).
- `RemoteEvent` para estado de vehículo validado por el servidor.
- Detección de superficie (raycast o zona) y de cámara para interior/exterior.

## Limitaciones

- No hace física, red ni anti-exploit de vehículos: deriva a
  `roblox-networking`, `roblox-state-replication` y `roblox-security`.
- No diseña SFX genéricos ni ambientes: deriva a `roblox-sfx-design` y
  `roblox-ambient-soundscapes`.
- No fija mezcla global: deriva a `roblox-audio-mixing`.
- Verifica cualquier miembro de API dudoso en create.roblox.com/docs.
