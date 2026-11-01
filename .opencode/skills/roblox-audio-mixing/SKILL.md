---
name: roblox-audio-mixing
description: Mezcla, prioriza y optimiza todo el audio del juego. Úsala cuando necesites niveles por familia, ducking, compresión para móvil o presupuestos de assets y voces.
---

# Mezcla, prioridades y optimización de audio

## Objetivo

Convertir una colección de sonidos en una mezcla legible en cualquier
dispositivo: niveles por familia, prioridades y ducking para que lo importante
siempre se oiga, compresión que proteja el móvil, y presupuestos de assets y
voces que el proyecto pueda pagar.

## Alcance y límites

**Diferenciación declarada:** la skill instalada `roblox-audio` cubre el motor
de audio y el grafo moderno (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
`Wire`, efectos). Esta skill NO repite el motor: cubre diseño por dominio de
mezcla y optimización (niveles, prioridades/ducking, compresión móvil,
budgets). La skill instalada `roblox-animation-audio-feedback` cubre el
*juice* general; esta skill no la repite (una buena mezcla hace que ese juice
se escuche en vez de perderse en el barro).

Esta skill NO hace:

- Diseño de ambientes, música, SFX o motores → lo cubren
  `roblox-ambient-soundscapes`, `roblox-dynamic-music`, `roblox-sfx-design` y
  `roblox-vehicle-audio`.
- Implementación del grafo moderno paso a paso → lo cubre `roblox-audio`.
- Accesibilidad de subtítulos o UI visual → fuera de alcance (coordínala con
  el equipo de UI).

## Casos de uso

1. El combate tapa la voz y los pasos: reequilibrar por familias.
2. La mezcla distorsiona en altavoces de móvil pero suena bien en PC.
3. Demasiadas voces simultáneas hunden el rendimiento en batallas.
4. Los assets de audio pesan demasiado para el presupuesto de carga.
5. La música compite con los SFX en la misma banda de frecuencia.
6. El jugador necesita controles de volumen por familia que funcionen.

## Proceso paso a paso

1. **Crea un `SoundGroup` por familia.** Mínimo viable: `Master`, `Music`,
   `Ambience`, `SFX_UI`, `SFX_World`, `Vehicles`, `Voice`. Sin grupos, cada
   ajuste es cirugía individual.
2. **Fija la jerarquía de niveles.** Orden típico: voz > SFX críticos > UI >
   música > ambiente > decorativos. Asigna un nivel base a cada grupo (p. ej.
   voz 1.0, música 0.5, ambiente 0.4) y documenta por qué.
3. **Define prioridades y robo de voz.** Cada familia tiene prioridad y tope
   de voces; al saturar, cae lo decorativo primero y lo crítico nunca. Prueba
   la saturación provocando el peor caso (batalla + lluvia + 5 vehículos).
4. **Implementa ducking donde importe.** Bajo voz o SFX crítico, la música y
   el ambiente bajan 3–6 dB con ataque rápido y recuperación lenta (1–2 s).
   Ejemplo ilustrativo (simplificado):
   ```luau
   -- Ilustrativo: ducking de música bajo un anuncio de voz.
   musica.Volume = musica.Volume * 0.5
   task.wait(2)
   -- recuperar con fundido en vez de salto (ver fundidos en skills de dominio)
   musica.Volume = nivelBaseMusica
   ```
5. **Aplica compresión protectora.** Un `CompressorEffect` suave en el bus
   maestro evita picos que distorsionan en móvil; un `EqualizerEffect`
   recorta graves inútiles para altavoz pequeño. Los valores exactos se
   ajustan de oído, no de tabla.
6. **Fija budgets de assets.** Tope de tamaño total de audio, de duración por
   asset y de voces simultáneas por plataforma (móvil más estricto). Todo
   asset nuevo debe caber o desplazar a otro.
7. **Optimiza formatos y duraciones.** Loops cortos que encadenen bien,
   one-shots recortados sin silencio muerto, nada de estéreo donde el mono
   basta (ambientes de fondo, rodaduras).
8. **Expón controles al jugador.** Volumen por familia (al menos master,
   música, SFX) + mute total, persistidos como preferencia. Verifica que el
   mute silencie de verdad todas las familias, incluido el grafo moderno.
9. **Mezcla de referencia en tres dispositivos.** Auriculares, altavoz de
   móvil y altavoz de portátil. Si solo mezclas en uno, fallas en los otros
   dos seguro.
10. **Prueba el peor caso sonoro.** Batalla multijugador con lluvia, música de
    combate, vehículos y voz: debe seguir legible y sin distorsión.
11. **Registra y congela la mezcla.** Tabla grupo → nivel → prioridad → tope
    de voces → ducking. Sin tabla, cada update reintroduce el caos.
12. **Revisa por plataforma.** Móvil: menos voces, menos graves, niveles más
    conservadores. PC/consola: puedes abrir la mano, pero sin romper la
    jerarquía.

## Conocimientos técnicos

- El servidor valida lo importante: los niveles y prioridades son diseño de
  cliente, pero cualquier volumen ligado a gameplay (p. ej. atenuar al rival)
  debe venir de datos validados en servidor, nunca de la preferencia local.
- Persistencia: guarda preferencias de volumen/mute por jugador; la mezcla
  base vive en configuración versionada, no en datos de jugador.
- Errores: si un efecto (`CompressorEffect`, `EqualizerEffect`) no existe en
  un contexto, la mezcla debe seguir funcionando sin él (degradación
  elegante, no silencio). Envuelve en `pcall` lo que dependa del entorno.
- `SoundService` como bus global; `SoundGroup` por familia como faders;
  `CompressorEffect` y `EqualizerEffect` como protección y corrección.
- Con grafo moderno (`AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire`),
  replica la misma jerarquía de buses: la mezcla es la misma, cambia el
  cableado (detalle del motor: `roblox-audio`).

## Buenas prácticas

- Mezcla por familias, nunca sonido a sonido.
- Ducking con recuperación lenta: el bombeo rápido cansa más que el volumen.
- Headroom permanente en el master: la suma de picos siempre sorprende.
- Presupuestos escritos y visibles antes de producir assets nuevos.
- Controles de jugador simples: 3–4 sliders como máximo.
- Revisa la mezcla tras cada gran feature de audio, no solo al final.

## Errores frecuentes

1. Sin `SoundGroup` por familia → ajustes imposibles de mantener.
2. Todo al máximo volumen → guerra de volumen y distorsión.
3. Ducking con recuperación instantánea → bombeo audible y molesto.
4. Compresión agresiva que aplana toda la dinámica → fatiga.
5. Presupuestos solo de palabra → se incumplen en la primera entrega.
6. Mezclar solo en auriculares buenos → desastre en móvil.
7. Mute que no muta alguna familia (normalmente ambiente o un emisor
   del grafo) → bug reportado el día 1.

## Criterios de calidad y terminado

- [ ] `SoundGroup` por familia con niveles y prioridades documentados.
- [ ] Ducking de música/ambiente bajo voz y SFX críticos, sin bombeo.
- [ ] Compresión protectora sin aplanamiento audible.
- [ ] Budgets de tamaño, duración y voces definidos por plataforma.
- [ ] Controles de volumen por familia + mute total, persistidos.
- [ ] Mezcla verificada en auriculares, móvil y portátil.
- [ ] Peor caso sonoro legible y sin distorsión.

## Herramientas

- `SoundService`, `SoundGroup`, `Sound` como base de mezcla por familias.
- `CompressorEffect`, `EqualizerEffect` para protección y corrección.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` si el proyecto usa el
  grafo moderno (motor: `roblox-audio`).
- Persistencia de preferencias para volúmenes del jugador.

## Limitaciones

- No diseña contenidos (ambientes, música, SFX, vehículos): deriva a las
  cuatro skills de dominio.
- No documenta el grafo moderno en profundidad: deriva a `roblox-audio`.
- No hace accesibilidad visual ni subtítulos.
- Verifica cualquier miembro de API dudoso en create.roblox.com/docs.
