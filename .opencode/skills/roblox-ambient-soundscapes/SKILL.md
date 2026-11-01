---
name: roblox-ambient-soundscapes
description: Diseña ambientes sonoros por capas y zonas con transiciones suaves. Úsala cuando necesites ambience de bosque, ciudad, cueva, lluvia, día/noche o mezclas que cambian por zona.
---

# Ambientes sonoros por capas y zonas

## Objetivo

Construir paisajes sonoros ambientales creíbles y baratos en rendimiento: capas
independientes (base, detalle, eventos esporádicos) que entran y salen según la
zona del jugador, la hora del día y el clima, con transiciones sin cortes ni
saltos de volumen perceptibles.

## Alcance y límites

**Diferenciación declarada:** la skill instalada `roblox-audio` cubre el motor
de audio y el grafo moderno (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
`Wire`, efectos). Esta skill NO repite el motor: cubre diseño por dominio de
ambientes (capas, zonas, día/noche, transiciones). La skill instalada
`roblox-animation-audio-feedback` cubre el *juice* general y el feel de
interacciones; esta skill no la repite (la referencia para remates de feel
donde un cambio de zona merezca un acento).

Esta skill NO hace:

- Composición musical adaptativa → lo cubre `roblox-dynamic-music`.
- Diseño de one-shots de UI, pasos o impactos → lo cubre `roblox-sfx-design`.
- Mezcla global, compresión y presupuestos de assets → lo cubre
  `roblox-audio-mixing`.
- Chat de voz ni moderación de voz → lo cubre el motor (`roblox-audio`) y
  `VoiceChatService` (verificar miembros exactos en create.roblox.com/docs).

## Casos de uso

1. Bosque con base de viento + pájaros esporádicos + arroyo solo cerca del río.
2. Ciudad con tráfico lejano de día que baja de noche y grillos que suben.
3. Cueva con goteo aleatorio y reverberación percibida más cerrada.
4. Lluvia global con capa de interior atenuada bajo techo.
5. Zona de peligro con capa de tensión grave que entra por proximidad.
6. Transición día/noche con crossfade de 10–20 segundos sin silencios.

## Proceso paso a paso

1. **Inventaria las zonas.** Lista cada bioma o interior con su rectángulo o
   radio aproximado. No pases de 6–8 zonas con audio propio en un primer pase.
2. **Define 2–4 capas por zona.** Base continua (viento, tráfico), detalle
   (hojas, ecos) y esporádicos (búho, gota). La base usa `Sound` con
   `Looped = true`; los esporádicos son one-shots con temporizador aleatorio.
3. **Asigna cada capa a un `SoundGroup`.** Por ejemplo: `AmbienceBase`,
   `AmbienceDetail`, `AmbienceOneshots`. Esto permite mezclar por familia sin
   tocar volúmenes individuales (el cómo mezclar es de `roblox-audio-mixing`).
4. **Elige emisor global o posicional.** Bases de zona: `Sound` no posicional
   (o `AudioEmitter` global según grafo usado). Detalles atados a un punto
   (cascada, generador): sonido posicional con `RollOffMaxDistance` ajustado.
5. **Implementa detección de zona en el servidor.** El servidor determina en
   qué zona está cada jugador (por posición) y lo replica; el cliente solo
   mezcla. El servidor valida lo importante: nunca fíes al cliente para
   decidir zonas con efecto de gameplay (zona de peligro audible).
6. **Programa crossfades, no cortes.** Al cambiar de zona, interpola el
   `Volume` de la capa saliente a 0 en 2–4 s y la entrante a su nivel en 2–4 s.
   Ejemplo ilustrativo (simplificado):
   ```luau
   -- Ilustrativo: fundido de una capa ambiental.
   local TweenService = game:GetService("TweenService")
   local info = TweenInfo.new(3, Enum.EasingStyle.Linear)
   TweenService:Create(capaSaliente, info, { Volume = 0 }):Play()
   capaEntrante:Play()
   TweenService:Create(capaEntrante, info, { Volume = 0.6 }):Play()
   ```
7. **Añade variación a los esporádicos.** Intervalo aleatorio (p. ej. 8–25 s)
   y `PlaybackSpeed` ligeramente aleatorio (0.92–1.08) para evitar repetición
   mecánica. Si suena robótico, vuelve a este paso antes de añadir más sonidos.
8. **Trata el día/noche como dos mezclas.** Define niveles día y noche por
   capa e interpola con la hora del juego en 10–20 s. No pares y rearranques
   sonidos: solo mueve volúmenes.
9. **Atenúa interiores.** Bajo techo, baja la capa exterior (0.2–0.4 del
   nivel) y sube una capa de interior (reverberación leve, crujidos). Detecta
   interior con raycast vertical o por zona marcada, no por el cliente a ciegas.
10. **Considera `VoiceChatService`.** El ambiente nunca debe enmascarar la voz:
    reserva margen de volumen y documenta que la mezcla de voz la gobierna el
    motor (`roblox-audio`). Si dudas de un miembro del servicio, escribe
    "(verificar en create.roblox.com/docs)".
11. **Prueba con recorridos reales.** Camina entre zonas, entra y sale de
    interiores, y cambia día/noche. Anota cada clic, corte o salto de volumen.
12. **Recorta y congela.** Elimina capas que nadie nota en prueba ciega. Cada
    sonido simultáneo cuesta; menos capas bien mezcladas suenan mejor.

## Conocimientos técnicos

- El servidor valida lo importante: la zona activa de cada jugador y cualquier
  bandera con efecto de gameplay se calculan en el servidor y se replican con
  `RemoteEvent` (el transporte fino es de las skills instaladas
  `roblox-networking` y `roblox-security`).
- Persistencia: las preferencias de ambiente del jugador (volumen de ambiente,
  mute) pueden guardarse en `DataStoreService` (verificar cuota y API exacta
  en create.roblox.com/docs); el estado transitorio (zona actual, fase de
  fundido) NO se persiste, se recalcula al entrar.
- Errores: envuelve la resolución de zona en `pcall` si depende de datos
  externos; ante error, cae a una mezcla neutra segura en vez de silenciarlo
  todo.
- `SoundService` gobierna la escucha global; `SoundGroup` agrupa por familia;
  `EqualizerEffect` / `CompressorEffect` pertenecen a la mezcla
  (`roblox-audio-mixing`), no a esta skill.
- Los sonidos posicionales usan atenuación por distancia; ajusta
  `RollOffMaxDistance` para que el detalle muera antes de contaminar la zona
  vecina.

## Buenas prácticas

- Máximo 3–4 capas simultáneas por jugador en móvil.
- Loops de al menos 8–15 s, con inicio y fin que encadenen sin clic.
- Nombra assets por convención: `AMB_bosque_base_v1`.
- Documenta por zona: capas, niveles día/noche, tiempos de fundido.
- Prueba con auriculares y con altavoz de móvil: lo que funciona en uno puede
  saturar en el otro.
- Deja un "silencio diseñado": no todas las zonas necesitan 3 capas.

## Errores frecuentes

1. Cortar sonidos al cambiar de zona en vez de fundir → clics y baches.
2. Demasiadas capas simultáneas → barro sonoro y coste de rendimiento.
3. Esporádicos con intervalo fijo → el cerebro detecta el patrón en minutos.
4. Dejar que el cliente decida zonas con efecto de gameplay → explotable.
5. Subir el ambiente hasta tapar la voz → quejas garantizadas.
6. Loops cortos (2–3 s) con el corte audible → fatiga inmediata.
7. No probar la transición noche→día, solo día→noche → sorpresas al amanecer.

## Criterios de calidad y terminado

- [ ] Cada zona tiene su mezcla documentada (capas + niveles día/noche).
- [ ] Ningún cambio de zona produce cortes, clics ni silencios.
- [ ] Día/noche transiciona en 10–20 s sin rearranques.
- [ ] Interiores atenúan el exterior de forma audible pero no brusca.
- [ ] Con 5 minutos de juego, ningún esporádico se percibe repetitivo.
- [ ] La voz sigue inteligible con el ambiente al máximo (margen reservado).
- [ ] Recorrido de prueba completo sin anomalías anotadas.

## Herramientas

- `Sound`, `SoundGroup`, `SoundService` para capas y mezcla por familia.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` si el proyecto usa el
  grafo moderno (detalle del motor: `roblox-audio`).
- `VoiceChatService` solo como consideración de coexistencia con la voz.
- `RemoteEvent` para replicar la zona activa calculada en servidor.
- `TweenService` (verificar nombre exacto en create.roblox.com/docs) o
  interpolación manual para fundidos.

## Limitaciones

- No diseña música ni SFX: deriva a `roblox-dynamic-music` y
  `roblox-sfx-design`.
- No fija la mezcla final ni presupuestos: deriva a `roblox-audio-mixing`.
- No documenta el grafo moderno en profundidad: deriva a `roblox-audio`.
- El feel de remates e impactos es de `roblox-animation-audio-feedback`.
- Si un miembro de API no aparece aquí, verifícalo en
  create.roblox.com/docs antes de usarlo.
