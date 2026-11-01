---
name: Diálogos Roblox Nativos
description: NPC con ProximityPrompt, respuestas, typewriter y chat. Úsala cuando crees conversaciones, elecciones, tiendas de NPC o narrativa integrada con TextChatService.
---

# Diálogos Roblox Nativos

## Objetivo

Hacer hablar a los NPC con herramientas nativas de Roblox: acercarse, pulsar la tecla, leer con efecto máquina de escribir, elegir respuesta y verlo integrado con el chat. Sin sistemas inventados: `ProximityPrompt`, objetos `Dialogue`/`DialogueChoice` o UI propia equivalente, y `TextChatService` como canal.

## Alcance y límites

Cubre: prompt de interacción, caja de diálogo con typewriter, elecciones/respuestas, historial breve, integración con `TextChatService`, y conexión con misiones/tiendas.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo o guion narrativo: lo cubre `roblox-game-ux` (aquí se implementa el guion dado).
- Diario de misiones: lo cubre `roblox-quest-journal-ui` (el diálogo puede otorgar una misión, no gestionarla).
- Tienda completa: lo cubre `roblox-shop-ui` (el NPC puede abrirla, no sustituirla).
- Notificaciones globales: lo cubre `roblox-notifications-ui`.

## Casos de uso

- Aldeano con "Hablar (E)" que abre 3 líneas con typewriter y botón Continuar.
- Mercader con elecciones "Comprar / Vender / Adiós" que abren la tienda o cierran.
- Misión entregada al elegir "Tengo los cristales" con validación visible.
- Conversación que también aparece en el chat como burbuja o mensaje del sistema.
- NPC ocupado ("Hablando con Ana…") que pone cola en vez de solaparse.

## Proceso paso a paso

1. **Escribe el guion mínimo.** Nodos: saludo → 1-3 líneas → 2-4 elecciones → cierres. Cada línea ≤140 caracteres, cada elección ≤48. Si necesita scroll, córtala.
2. **Coloca el prompt.** `ProximityPrompt` en el NPC con `ActionText` "Hablar", `ObjectText` nombre del NPC, `KeyboardKeyCode` E, `HoldDuration` 0 (o corto si es acción sensible), `MaxActivationDistance` 8-12. Solo visible con el NPC en rango y libre.
3. **Construye la caja de diálogo.** `ScreenGui` → `Frame` inferior centrado (70% ancho PC, 94% móvil) + `TextLabel` nombre NPC + `TextLabel` cuerpo con typewriter + fila de `TextButton`s de elección + Continuar/Omitir/Adiós. `ImageLabel` retrato opcional a la izquierda.
4. **Implementa el typewriter.** Revela caracteres en 15-25 ms con omisión al pulsar (primer clic completa, segundo avanza). Respeta "reducir movimiento" (si está activo, muestra directo; ver `roblox-settings-ui`). Nunca bloquees el avance si el efecto falla.
5. **Elecciones como botones.** Cada `DialogueChoice` o entrada de tu tabla = un `TextButton` con consecuencia visible ("Comprar → abre tienda"). Deshabilita las no disponibles con motivo ("Te faltan 3 cristales"), no las ocultes sin más.
6. **Integra TextChatService.** Muestra la línea del NPC en burbuja sobre su cabeza y/o como mensaje del canal, según el juego; el texto visible por todos pasa por filtrado (verificar en create.roblox.com/docs). La UI de diálogo y el chat cuentan la misma historia, no dos distintas.
7. **Gestiona estado y concurrencia.** Un jugador por conversación activa (o turnos visibles); al alejarse > distancia o moverse, cierra con fundido y guarda el nodo. Dos jugadores no pisan la misma caja: segundo ve "Ocupado".
8. **Conecta con sistemas.** "Aceptar misión" llama al flujo del diario, "Comprar" abre la tienda, "Entrenar" abre el selector. Cada conexión deja rastro ("Misión añadida al diario" como toast del sistema).
9. **Verifica en contexto.** Habla caminando, habla en móvil, spamea E, alĂŠjate a mitad, dos jugadores a la vez. Subtítulos legibles sobre fondos variables y con tamaño de texto Grande activado.

## Conocimientos técnicos

- Prompt + caja (clases estables):

  ```luau
  -- Ejemplo ilustrativo: prompt de hablar en un NPC
  local prompt = Instance.new("ProximityPrompt")
  prompt.Name = "TalkPrompt"
  prompt.ActionText = "Hablar"
  prompt.ObjectText = "Aldeana Mira"
  prompt.MaxActivationDistance = 10
  prompt.HoldDuration = 0
  prompt.Parent = npc:WaitForChild("Head")
  ```

- `ProximityPrompt.Triggered` abre la `ScreenGui` de diálogo; la UI vive en `PlayerGui` y se cierra con Adiós, distancia o `UserInputService` (E/Esc según proyecto).
- `Dialogue`/`DialogueChoice`/`DialogueChoiceSet` como objetos del NPC o tabla equivalente en datos (verificar en create.roblox.com/docs para el modelo exacto del proyecto); la UI pinta el nodo actual y sus respuestas.
- `TextChatService` para burbujas/mensajes: configura el canal y el filtrado según el proyecto (verificar en create.roblox.com/docs). Nunca muestres texto de jugador sin filtrar.
- `TweenService` para entrada (subida 8 px + fundido 0.2 s) y fundido de burbujas; `UITextSizeConstraint` + `TextScaled` controlado para cuerpos largos.
- Cámara: mantén control del jugador salvo cinemática documentada; si acercas la cámara, restaura al cerrar.

### Identidad visual de esta skill (original, no copiar)

- Dirección "viñeta de cuento": caja inferior color tinta (#141A2E a 94%) con franja de acento cobre (#E8A15C), nombre del NPC en versalitas ámbar, retrato circular con `UIStroke`.
- Tipografía: cuerpo 16-18 regular con interlineado 1.4, nombre 13 mayúsculas con tracking, elecciones 15 semibold en botones. Typewriter con cursor "_" parpadeante lento.
- Composición: retrato 64 + texto flexible + Continuar a la derecha; elecciones en columna de 2-4 botones de 48+ px. `UIPadding` 14-18, `UICorner` 12.
- Espaciado: caja separada 3% del borde inferior, sin tapar botones táctiles (coordina con `roblox-mobile-touch-ui`).
- Estados: escribiendo (cursor + "Omitir"), completo (Continuar destacado), elección hover +brillo / pressed 0.97 / no-disponible gris + motivo, ocupado (banda "Hablando con…"), error de distancia (cierre con fundido, no corte).
- Animación: solo typewriter + entrada/salida. Sin rebotes ni shakes en texto narrativo.

## Buenas prácticas

- 1 idea por línea, 3 líneas por nodo, 4 elecciones máximo.
- Toda elección muestra su consecuencia o su motivo de bloqueo.
- Omitir siempre disponible; Adiós visible desde el primer nodo.
- Mismo tono y nombres que el diario y la tienda; el NPC no promete lo que el juego no da.
- Subtítulos con fondo para leerse sobre cielo, nieve o cuevas.
- Guion original; sin copiar diálogos de obras protegidas.

## Errores frecuentes

- Typewriter sin omitir que obliga a esperar 10 s por línea en móvil.
- `ProximityPrompt` con distancia 30 que abre diálogos desde el otro pueblo.
- Texto de jugador reenviado al chat sin filtrar (riesgo de moderación).
- Caja que tapa joystick y botones táctiles y deja al jugador vendido.
- Dos jugadores en el mismo diálogo con elecciones cruzadas.
- Inventar clases o eventos del chat que no existen en vez de verificar la documentación.

## Criterios de calidad y terminado

- [ ] Conversación completa (saludo→elección→cierre) con teclado, táctil y mando.
- [ ] Omitir, Adiós y cierre por distancia funcionan sin estados rotos.
- [ ] Elecciones bloqueadas explican el motivo; las conexiones (misión/tienda) dejan rastro.
- [ ] Legible en 3 resoluciones y con tamaño de texto Grande.
- [ ] Sin errores en consola bajo spam de E ni con 2 jugadores simultáneos.
- [ ] Guion original y filtrado de texto verificado según documentación.

## Herramientas

- Studio: Play con 2 clientes, simulador móvil, prueba de `ProximityPrompt` en rango real.
- MCP Studio (si disponible): capturas de caja + burbuja sobre el NPC en 3 resoluciones.
- Rojo: guiones como datos (nodos, líneas, elecciones) editables por narrativa.
- Selene: lint del controlador de nodos y del typewriter.

## Limitaciones

- El modelo exacto de `Dialogue` y las APIs de `TextChatService` evolucionan (verificar en create.roblox.com/docs); no asumas firmas.
- El filtrado y la moderación dependen de la plataforma; esta UI no los sustituye.
- Conversaciones multi-jugador complejas (votaciones, turnos) son otro sistema, no este diálogo 1:1.
- La accesibilidad total (voz, lectura) requiere ajustes del proyecto (`roblox-settings-ui`).
