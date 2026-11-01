---
name: roblox-sfx-design
description: Diseña SFX de UI, interacción y personajes con variación anti-repetición. Úsala cuando necesites clics, pasos, saltos, impactos, pickups o feedback sonoro de acciones.
---

# Diseño de SFX de UI, interacción y personajes

## Objetivo

Crear efectos de sonido cortos y legibles que confirmen cada acción del jugador
(UI, pasos, saltos, golpes, recogidas) con variación suficiente para no
cansar en cientos de repeticiones, dentro de un presupuesto claro de assets y
voces simultáneas.

## Alcance y límites

**Diferenciación declarada:** la skill instalada `roblox-audio` cubre el motor
de audio y el grafo moderno (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
`Wire`, efectos). Esta skill NO repite el motor: cubre diseño por dominio de
SFX (one-shots, variación, presupuestos de uso). La skill instalada
`roblox-animation-audio-feedback` cubre el *juice* general y el feel de
movimiento; esta skill no la repite (la referencia para sincronizar SFX con
animaciones y marcadores de feel).

Esta skill NO hace:

- Ambientes continuos por zonas → lo cubre `roblox-ambient-soundscapes`.
- Música adaptativa → lo cubre `roblox-dynamic-music`.
- Audio de motores y vehículos → lo cubre `roblox-vehicle-audio`.
- Mezcla global y compresión → lo cubre `roblox-audio-mixing`.

## Casos de uso

1. Clics de UI (hover, press, error, compra) coherentes en todo el juego.
2. Pasos que cambian según superficie (hierba, piedra, madera, metal).
3. Salto, aterrizaje y daño del personaje con peso creíble.
4. Espada que impacta carne, madera, piedra o falla, con sonidos distintos.
5. Pickup de moneda que no taladra tras 200 recogidas.
6. Juego móvil con límite estricto de voces y tamaño de assets.

## Proceso paso a paso

1. **Lista cada acción con SFX.** UI, movimiento, combate, interacción,
   sistema (logro, error). Si no está en la lista, no existe: los SFX
   huérfanos aparecen tarde y mal.
2. **Clasifica por prioridad.** Críticos (daño recibido, error de compra),
   normales (pasos, clics) y decorativos (brillos extra). En saturación, los
   decorativos caen primero.
3. **Define el presupuesto.** Fija tope de voces simultáneas (p. ej. 8–12 en
   móvil) y tamaño total de SFX. Todo lo que diseñes debe caber ahí; si no,
   recorta antes de producir.
4. **Diseña one-shots cortos y con ataque claro.** 0.1–0.5 s para UI y pasos;
   hasta 1 s para impactos importantes. Un SFX que tarda en "entrar" se
   percibe como lag.
5. **Añade variación anti-repetición.** 3–5 variantes por SFX frecuente o un
   `PlaybackSpeed` aleatorio de 0.94–1.06 más volumen ±10 %. Ejemplo
   ilustrativo (simplificado):
   ```luau
   -- Ilustrativo: paso con variación de tono y volumen.
   local variantes = { paso1, paso2, paso3 }
   local elegido = variantes[math.random(1, #variantes)]
   elegido.PlaybackSpeed = 0.94 + math.random() * 0.12
   elegido.Volume = 0.45 + math.random() * 0.1
   elegido:Play()
   ```
6. **Mapea superficies y materiales.** Tabla material→sonido para pasos e
   impactos. El servidor valida lo importante: el material real del impacto
   se confirma en servidor (transporte y validación finos: `roblox-networking`,
   `roblox-security`).
7. **Posiciona lo que ocurra en el mundo.** SFX de mundo como sonido
   posicional con distancia de corte; UI siempre no posicional y centrada.
8. **Sincroniza con animación.** Dispara pasos e impactos desde eventos de
   animación, no desde temporizadores a ojo. El feel del timing es de
   `roblox-animation-audio-feedback`: coordínate con ella.
9. **Aplica límites de repetición.** Cooldown mínimo por SFX (p. ej. pasos
   cada 0.25 s, moneda cada 0.05 s con robo de voz: el más viejo se corta).
10. **Prueba la fatiga.** Repite cada SFX frecuente 100 veces seguidas. Si
    molesta, añade variantes o baja agudos antes de seguir.
11. **Verifica en móvil.** Altavoz pequeño exagera agudos y distorsiona
    graves: prueba toda la tabla de SFX en dispositivo real o perfil
    equivalente.
12. **Congela la tabla.** Documento final: acción → asset → prioridad →
    cooldown → variantes. Sin documento, el caos vuelve en la primera update.

## Conocimientos técnicos

- El servidor valida lo importante: impactos con daño, compras y eventos con
  economía se confirman en servidor; el SFX es feedback, nunca prueba de que
  la acción valió. Los detalles de validación son de `roblox-security`.
- Persistencia: solo preferencias (volumen SFX, mute); el estado de
  cooldowns y variantes es efímero y no se guarda.
- Errores: si un asset de SFX falla, el juego sigue sin él y lo registra;
  ningún `Play` debe romper gameplay. Envuelve cargas externas en `pcall`.
- Agrupa en `SoundGroup` propios (`SFX_UI`, `SFX_World`, `SFX_Player`) para
  mezclar por familia y mutear por separado.
- `Sound` no posicional para UI; posicional con atenuación para mundo. Si el
  proyecto usa `AudioEmitter`/`AudioPlayer`, el grafo es de `roblox-audio`.

## Buenas prácticas

- Ataque rápido, cola corta: el SFX estorba menos cuanto antes termina.
- 3–5 variantes para lo que suena más de 50 veces por sesión.
- Cooldowns por SFX, no globales: el paso no debe mutear el daño.
- Nombra por convención: `SFX_ui_click_v2`, `SFX_paso_hierba_03`.
- Deja headroom: ningún SFX masterizado al límite, la mezcla los suma.
- Accesibilidad: toda información crítica del SFX debe tener eco visual.

## Errores frecuentes

1. Un solo sample para pasos o monedas → fatiga en minutos.
2. SFX largos que se solapan consigo mismos → barro y saturación.
3. Disparar SFX por temporizador en vez de por evento de animación.
4. UI posicional o mundo no posicional → desorientación espacial.
5. Sin cooldown: 20 monedas a la vez revientan la mezcla.
6. Confiar el resultado (daño, compra) al SFX del cliente → explotable.
7. No probar en altavoz de móvil → agudos asesinos en producción.

## Criterios de calidad y terminado

- [ ] Tabla completa acción → asset → prioridad → cooldown → variantes.
- [ ] SFX frecuentes aguantan 100 repeticiones sin fatiga evidente.
- [ ] Pasos e impactos varían por superficie/material real.
- [ ] UI no posicional; mundo posicional con distancia de corte.
- [ ] Cooldowns y robo de voz implementados y probados en saturación.
- [ ] Eventos con efecto (daño, compra) validados en servidor.
- [ ] Tabla verificada en móvil sin distorsión ni agresividad.

## Herramientas

- `Sound`, `SoundGroup` (`SFX_UI`, `SFX_World`, `SFX_Player`), `SoundService`.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` si el proyecto usa el
  grafo moderno (motor: `roblox-audio`).
- `RemoteEvent` para anunciar eventos de SFX validados por el servidor.
- Eventos de animación como disparadores de sincronía.

## Limitaciones

- No diseña ambientes, música ni motores: deriva a `roblox-ambient-soundscapes`,
  `roblox-dynamic-music` y `roblox-vehicle-audio`.
- No fija mezcla global ni compresión: deriva a `roblox-audio-mixing`.
- El feel de animación y remates es de `roblox-animation-audio-feedback`.
- Verifica cualquier miembro de API dudoso en create.roblox.com/docs.
