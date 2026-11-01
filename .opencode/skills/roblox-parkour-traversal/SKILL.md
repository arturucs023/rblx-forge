---
name: roblox-parkour-traversal
description: Parkour y traversal (vault, climb, wallrun, slide, stamina). Úsala cuando añadas trepar, deslizarte o correr por paredes con validación anti-vuelo.
---

# Parkour y Traversal

## Objetivo

Añadir movimiento fluido sobre obstáculos —vault, climb, wallrun, slide— con detección de bordes robusta, costes de stamina claros y validación de servidor que permite fluidez sin regalar vuelo.

## Alcance y límites

Cubre traversal a pie más allá del controlador base: detección, ejecución, cancelación, stamina y anti-exploit.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe: lo cubre `roblox-characters`.
- NO cubre el controlador base (walk/jump/coyote): lo cubre `roblox-character-controller` (esta skill lo extiende, no lo sustituye).
- NO cubre clips de locomoción base: lo cubre `roblox-locomotion-animation` (aquí solo clips específicos vault/climb/slide).
- NO cubre vehículos: ver `roblox-land-vehicles`, `roblox-air-vehicles`, `roblox-water-vehicles`.
- NO cubre NPCs con parkour: lo cubre `roblox-npcs`.
- NO cubre cámaras de traversal: lo cubre `camera-systems`.

## Casos de uso

1. Trepar muretes bajos con vault fluido en vez de saltar.
2. Escalar muros marcados con subida animada y coste.
3. Wallrun corto en paredes lisas para atajos.
4. Slide bajo obstáculos con ventana de cancelación.
5. Stamina que evita spam infinito de climb.
6. Jugadores que usan climb para volar fuera del mapa.

## Proceso paso a paso

1. **Fija el vocabulario del juego.** Elige 2–4 movimientos (ej. vault + climb + slide). Cada uno con: altura/longitud máxima, coste de stamina, cooldown, si conserva momento. Más de 4 sin tutorial = nadie los usa.
2. **Etiqueta el mundo.** Con `CollectionService` marca: `Vaultable` (0.8–1.5 m), `Climbable` (muros concretos), `Wallrun` (lisas y rectas), `SlideUnder` (huecos). Lo no etiquetado nunca activa parkour.
3. **Implementa detección por delante, no por tacto.** Para vault/climb: sonda a la altura de cadera/cabeza en la dirección de movimiento del `HumanoidRootPart`. Requiere: velocidad mínima, ángulo de aproximación (<45°) y borde libre arriba. Sin las tres, no se dispara.
4. **Define ejecución como estado con fin.** Cada movimiento es un estado temporal: inicio (0.1 s) → desplazamiento guiado → salida con velocidad pactada. Duración máxima hardcodeada (vault ~0.4 s, wallrun ~1.2 s). Sin fin garantizado hay vuelos.
5. **Sincroniza clip con desplazamiento.** El clip (ver locomoción) dura lo que el desplazamiento: vault de 0.4 s sobre murete de 1 m. Si el arte y el movimiento discrepan, ajusta primero el desplazamiento pactado, luego el clip.
6. **Añade stamina como economía.** Vault barato, climb caro por segundo, wallrun con drenaje, slide gratis pero con cooldown. Sin stamina el jugador escala el rascacielos a base de saltos encadenados.
7. **Diseña cancelaciones.** Todo movimiento se cancela por: daño, salto (wallrun→salto de pared), fin de stamina, pérdida de superficie. Cada cancelación deja velocidad coherente, nunca cero seco en el aire.
8. **Valida en servidor.** El servidor conoce etiquetas, posiciones y stamina: acepta el parkour solo si hay superficie etiquetada cerca, altura dentro de rango y stamina suficiente. El cliente propone ("quiero vault"), el servidor autoriza el desplazamiento.
9. **Prueba la ruta dorada y la rota.** Diseña una ruta que encadena tus 3 movimientos y una ruta de exploit (intento de escalar fuera del mapa). La primera debe fluir; la segunda debe ser rechazada sin kicks falsos a jugadores con lag.
10. **Tutorializa en el mundo.** Un murete obvio + indicación la primera vez; el resto se descubre. Sin enseñanza, el parkour no existe para el jugador.

## Conocimientos técnicos

- **Detección:** sondas (rayos/volúmenes) desde el `HumanoidRootPart` o `Humanoid`: altura de obstáculo, espacio libre encima, normal de pared. La normal decide: suelo = caminar, pared vertical = wallrun/climb, borde bajo = vault.
- **`HumanoidRootPart` guiado:** durante vault/climb el desplazamiento sigue una curva pactada (no física libre). Al terminar se devuelve el control al controlador base con la velocidad de salida documentada.
- **Wallrun:** requiere pared continua, velocidad mínima de entrada y temporizador máximo; la gravedad se reduce, no se elimina. Sin pared o sin velocidad, cae.
- **Slide:** estado bajo con fricción reducida y hitbox visual agachada; cancela al saltar o al chocar. Útil bajo obstáculos `SlideUnder`.
- **Stamina:** recurso 0–100 con regen solo en suelo quieto o caminando. Toda acción de parkour declara coste; el servidor es la autoridad del saldo.
- **`CollectionService`:** única fuente de verdad de qué es escalable. Preguntar por etiqueta evita que un renombrado abra un exploit.
- **Anti-vuelo:** límites duros: ganancia máxima de altura por movimiento, duración máxima, cooldown entre climbs. El servidor corrige (snap suave) en vez de expulsar ante discrepancias pequeñas por lag.

Ejemplo ilustrativo (puerta de entrada con triple condición, no código final):

```luau
-- Ilustrativo: el vault exige etiqueta, altura y velocidad mínima.
if etiqueta == "Vaultable" and alturaBorde <= 1.5 and velocidadHumanoide >= 8 then
	-- El cliente pide; el servidor re-valida etiqueta + distancia antes de autorizar.
	solicitarVault(borde)
end
```

## Buenas prácticas

- El cliente propone, el servidor valida: etiquetas, distancia a la superficie, stamina y cooldown se comprueban en servidor; el cliente solo predice el inicio visual.
- Un movimiento nuevo = una etiqueta + un coste + un límite. Sin excepciones.
- Conserva el momento en la salida: vault mantiene velocidad, wallrun→salto la convierte en impulso lateral pactado.
- Todo parkour funciona con mando y táctil (un botón de salto contextual); nada de combos de 3 teclas.
- Registra intentos rechazados por el servidor para detectar spots de exploit y falsos positivos por lag.
- Coordina fades con `roblox-animation-systems` y `roblox-locomotion-animation`: el parkour es un estado más de la matriz.

## Errores frecuentes

1. **Parkour por contacto:** activarse al rozar cualquier parte. Exige etiqueta + ángulo + velocidad.
2. **Climb infinito:** sin coste ni cooldown se escala todo. Stamina + cooldown + altura máxima por intento.
3. **Wallrun eterno:** sin temporizador el jugador cruza el mapa por la pared. Máximo ~1 s + velocidad mínima.
4. **Salida a velocidad cero en el aire:** cancelar wallrun y quedarse flotando. Toda salida deja velocidad pactada o caída inmediata.
5. **Servidor que confía:** aceptar "estoy en climb" sin comprobar superficie cercana = vuelo libre. Valida etiqueta y distancia.
6. **Detección solo visual:** el clip dice vault pero el cuerpo atraviesa el murete. Desplazamiento pactado + colisión real, no solo animación.
7. **Parkour que rompe cámaras:** giros bruscos que pelean con `camera-systems`. Fija velocidad de giro durante estados guiados.

## Criterios de calidad y terminado

- [ ] 2–4 movimientos con ficha (rango, coste, cooldown, velocidad de salida).
- [ ] Etiquetas `CollectionService` colocadas y documentadas; nada funciona sin etiqueta.
- [ ] Detección triple (etiqueta + geometría + velocidad) verificada en banco de pruebas.
- [ ] Stamina con costes y regen medidos; imposible escalar spots de test sin pausa.
- [ ] Validación de servidor rechaza vuelo/exploits en prueba adversaria sin falsos positivos con 150 ms.
- [ ] Ruta dorada completable por jugador nuevo tras una sola indicación.
- [ ] Transiciones registradas en la matriz de `roblox-animation-systems`.

## Herramientas

- Banco de obstáculos (muretes 0.8/1.2/1.5 m, muro climbable, pared wallrun, túnel slide).
- Ficha de movimiento estándar + tabla de etiquetas del mundo.
- Cliente de prueba de exploits (intentos de climb en pared no marcada, wallrun infinito).
- Ruta dorada cronometrada para calibrar fluidez.

## Limitaciones

- No cubre ganchos, dash aéreo ni teleports (son habilidades, otra disciplina).
- No cubre física de cuerdas ni ragdoll.
- No sustituye al controlador base: lo extiende.
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
