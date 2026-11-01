---
name: roblox-expressive-animation
description: Emotes, expresiones faciales y gestos de interacción. Úsala cuando los personajes se sienten robóticos en social, tiendas o cinemáticas.
---

# Animación Expresiva e Interacción Social

## Objetivo

Dar vida social al personaje: emotes legibles, expresiones faciales (incluido `FaceControls` donde aplique) y gestos de interacción con objetos (`ProximityPrompt`, `Tool`) con timing que no interfiere con locomoción ni combate.

## Alcance y límites

Cubre expresividad del jugador: emotes, bailes, saludos, gestos de usar/recoger, expresiones y reglas de capas sociales.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe: lo cubre `roblox-characters`.
- NO cubre rigs ni pesos faciales: lo cubre `roblox-rigging` (aquí se usan rigs ya válidos).
- NO es el dispatcher general: `roblox-animation` define el marco; aquí dominio expresivo.
- NO cubre locomoción ni combate: ver `roblox-locomotion-animation` y `roblox-combat-animation` (esta skill convive en capas bajas de prioridad).
- NO cubre NPCs con diálogos/IA: lo cubre `roblox-npcs`.
- NO cubre cámaras de cinemática: lo cubre `camera-systems`.

## Casos de uso

1. Rueda de emotes (saludar, bailar, sentarse) para lobby social.
2. Gesto de recoger objeto / abrir cofre sincronizado con `ProximityPrompt`.
3. Expresiones de victoria/derrota al final de ronda.
4. Personaje que mira y señala un objetivo para compañeros.
5. Tienda donde el vendedor hace gesto de ofrecer (jugador con rol).
6. Foto grupal donde todos bailan sin atravesarse.

## Proceso paso a paso

1. **Clasifica cada gesto.** Social puro (baile, saludo: puede interrumpir locomoción), interacción (recoger, usar: breve y con objeto), reactivo (sorpresa, victoria: se dispara por evento). Cada clase tiene reglas distintas de prioridad y cancelación.
2. **Define duración y cancelación.** Sociales: 1–4 s, cancelables al moverse. Interacción: 0.5–1.2 s, no cancelable a mitad salvo movimiento forzado. Reactivos: 0.5–1 s, no interrumpen combate. Escríbelo antes de animar.
3. **Diseña en capas.** Piernas = locomoción (siguen andando si el jugador se mueve), torso/brazos/cabeza = gesto. Un saludo nunca debe bloquear las piernas salvo que sea baile sentado.
4. **Exagera la pose clave.** A distancia social (10–20 studs) los gestos sutiles no se leen: saludo con brazo bien alto, sorpresa con torso atrás + brazos abiertos. Una pose fuerte vale más que 2 s de movimiento tibio.
5. **Sincroniza con el objeto.** Para `ProximityPrompt` o `Tool`: frame de contacto = momento en que el objeto cambia (se recoge, se abre). Si el gesto termina 0.5 s antes del efecto, parece mimo. Ajusta el clip al evento, no al revés.
6. **Añade cara al final, no al principio.** Primero cuerpo legible, luego expresión (`FaceControls` o cabeza) como refuerzo. La cara sola no sostiene un emote a 15 studs.
7. **Controla el timing social.** Entrada rápida (0.1–0.15 s de fade), hold legible (al menos 0.4 s en la pose clave), salida suave. Los bailes en loop necesitan inicio/fin que encajen sin salto.
8. **Prueba en grupo.** Pon 5 personajes haciendo el emote a la vez con latencia: ¿se entiende? ¿se pisan los sonidos? ¿los accesorios (`Accessory`) atraviesan caras vecinas?
9. **Reglas de abuso.** Define cooldown por emote, qué emotes se bloquean en combate o en partida competitiva y qué gestos requieren validación de servidor (los que dan efectos).
10. **Entrega el catálogo.** Cada emote con: nombre, duración, capa, cancelable sí/no, cooldown, si requiere objeto y si da efecto de gameplay.

## Conocimientos técnicos

- **Capas y prioridades:** lo expresivo vive en prioridad baja/media sobre locomoción de torso, nunca sobre hit-react o ataque (ver combate). Las piernas casi siempre quedan para locomoción.
- **`AnimationTrack` social:** fade de entrada corto para respuesta inmediata; los loops (baile) deben tener pose inicial = pose final o fundido de loop dedicado.
- **`FaceControls`:** controles faciales donde el rig los soporte; refuerzan pero no sustituyen la pose corporal. Si el rig no los tiene, la cabeza (`Motor6D` del cuello) asume la expresión con inclinaciones.
- **`ProximityPrompt` + gesto:** el prompt dispara el evento; el gesto es presentación. El servidor valida la interacción (distancia, cooldown, propiedad del objeto); el gesto nunca otorga el ítem.
- **`Tool` en gestos:** esconder o bajar el `Tool` durante bailes evita armas atravesando cabezas. Define por emote si el arma se guarda.
- **`Accessory` y emotes:** sombreros grandes + reverencias = clipping garantizado. Prueba cada emote con el accesorio más grande permitido.
- **Replicación social:** los emotes deben verse en otros clientes; el servidor valida permiso/cooldown y ordena la reproducción (ver `roblox-animation-systems`).

Ejemplo ilustrativo (capa social que respeta piernas, no código final):

```luau
-- Ilustrativo: saludo solo en torso/brazos, piernas libres para locomoción.
local saludo = animator:LoadAnimation(animSaludo)
saludo.Priority = Enum.AnimationPriority.Action2 -- por encima de idle, por debajo de golpe
saludo:Play(0.12)
-- Al moverse se detiene: el jugador recupera el control sin pop largo.
```

## Buenas prácticas

- El cliente propone el emote, el servidor valida: permiso, cooldown, contexto (¿en combate? ¿muerto?) y si el emote otorga algo, solo el servidor lo concede.
- Todo emote social debe ser cancelable por movimiento o daño; jamás bloquees control más de 1 s sin motivo de gameplay.
- Un gesto, una lectura a 15 studs: si necesita explicación, exagéralo.
- Separa emotes "puros" (sin efecto) de interacciones (con efecto): los segundos siempre pasan por servidor.
- Respeta locomoción: el expresivo no mueve el `HumanoidRootPart` salvo bailes marcados como "enraizados" y documentados.
- Incluye al menos una opción de emote sentada/accesible para foto grupal y accesibilidad social.

## Errores frecuentes

1. **Emote que bloquea control 3 s en partida competitiva:** frustración y reports. Todo lo social se cancela al moverse.
2. **Gesto sin contacto:** recoger que termina antes de que el objeto desaparezca. Sincroniza frame de contacto con evento.
3. **Cara como único canal:** expresión sutil invisible a 15 studs. Cuerpo primero, cara después.
4. **Baile con loop roto:** salto visible cada 2 s. Iguala pose inicial/final o añade fundido.
5. **Arma atravesando cabezas:** bailar con `Tool` equipado sin guardarlo. Baja o esconde el arma por emote.
6. **Spam de emotes con sonido:** 10 jugadores bailando = caos. Cooldown + límite de sonido simultáneo.
7. **Emote que otorga ventaja:** gesto que esconde la hitbox o permite ver tras paredes. Valida en servidor y prohíbe en combate si hace falta.

## Criterios de calidad y terminado

- [ ] Catálogo entregado con duración, capa, cancelación y cooldown por emote.
- [ ] Cada emote legible a 15 studs por probador nuevo sin explicación.
- [ ] Gestos de interacción sincronizados con el evento (contacto = efecto).
- [ ] Cancelación por movimiento/daño verificada en todos los sociales.
- [ ] Prueba grupal de 5 jugadores sin clipping grave ni caos de sonido.
- [ ] Validación de servidor para emotes con efecto; los puros documentados como visuales.
- [ ] Sin desplazamiento de `HumanoidRootPart` salvo bailes "enraizados" declarados.

## Herramientas

- Catálogo de emotes (tabla estándar de esta skill).
- Escena social de prueba: 5 maniquíes, distancia marcada a 15 studs.
- Lista de `Accessory` más grandes para prueba de clipping.
- Checklist de sincronía objeto-gesto para cada `ProximityPrompt`.

## Limitaciones

- No cubre diálogos ramificados ni IA conversacional (ver `roblox-npcs` para NPCs).
- No cubre cinemáticas con múltiples cámaras (ver `camera-systems`).
- No sustituye moderación de contenido: los emotes de usuarios requieren filtros adicionales fuera de esta skill.
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
