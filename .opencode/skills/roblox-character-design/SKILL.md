---
name: roblox-character-design
description: Diseño visual de personajes y avatares (silueta, proporciones, rol/equipo). Úsala cuando crees un héroe, enemigo, NPC jugable o sistema de customización.
---

# Diseño de Personajes y Avatares

## Objetivo

Definir personajes legibles, atractivos y coherentes con el gameplay: silueta reconocible a distancia, proporciones que comunican rol y velocidad, colores de equipo/facción claros y customización que no rompe la legibilidad ni el rendimiento.

## Alcance y límites

Esta skill cubre dirección visual del personaje: silueta, proporciones, paleta, `Accessory`, `HumanoidDescription` y reglas de customización.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe (`Character` reaparición, caché de `Humanoid`/`Animator`): lo cubre `roblox-characters`.
- NO cubre construcción de rigs (`Motor6D`, jerarquías, validación): lo cubre `roblox-rigging`.
- NO es dispatcher general de animación: lo cubre `roblox-animation`; los detalles por dominio están en `roblox-locomotion-animation`, `roblox-combat-animation` y `roblox-expressive-animation`.
- NO cubre NPCs con IA/navegación: lo cubre `roblox-npcs`.
- NO cubre cámaras (encuadre, follow, shake): lo cubre `camera-systems`; aquí solo se define qué debe verse bien en cámara.

## Casos de uso

1. Héroe jugable que debe destacar entre 8 jugadores en pantalla.
2. Enemigos con tiers (débil / élite / jefe) legibles a 30+ metros.
3. Equipos rojo vs azul sin confusión para daltónicos.
4. Sistema de customización (piel, ropa, sombreros, mochilas) con límites.
5. Adaptación de avatar de plataforma (`HumanoidDescription`) a estilo del juego.
6. Mascota o compañero que no se confunde con un enemigo.

## Proceso paso a paso

1. **Define el rol en una frase.** Ejemplo: "tanque lento que bloquea puertas". Todo (ancho, altura, color) deriva de ahí.
2. **Boceta la silueta en negro puro.** Dibuja 3 variantes solo con formas. Si no se distinguen en miniatura, vuelve a empezar.
3. **Fija proporciones con bloques.** Cabeza:tronco:piernas. Anota: alto total en studs, ancho de hombros, largo de piernas (las piernas largas se leen como "rápido").
4. **Asigna paleta de rol.** 1 color dominante (60%), 1 secundario (30%), 1 acento (10%). Reserva el acento para la zona que el gameplay necesita leer (manos, arma, núcleo).
5. **Diseña lectura de equipo.** Banda de equipo en torso + cabeza, no solo en un `Accessory` pequeño que se pierde a distancia. Prueba con filtros de daltonismo.
6. **Mapea a `HumanoidDescription`.** Traduce tu diseño a propiedades estándar: alturas, anchos, colores de cuerpo, camisa/pantalón. Documenta qué campo toca cada decisión.
7. **Define kit de `Accessory` permitido.** Lista blanca: qué slots existen (cabeza, torso, espalda), tamaño máximo y si afectan hitbox visual. Prohíbe accesorios que cubran la cara o el color de equipo.
8. **Valida en contexto.** Coloca 4 copias en un mapa gris, aléjate con `Camera` a 20/40/60 studs (ver `camera-systems` para encuadre) y pregunta: ¿sé qué es cada uno y de qué equipo es?
9. **Prueba de animación base.** Reproduce idle y walk (ver `roblox-locomotion-animation`). Si el diseño se rompe al moverse (manos que atraviesan torso), ajusta proporciones, no la animación.
10. **Congela la guía.** Exporta hoja de personaje: silueta, paleta con códigos, límites de customización y checklist de aprobación.

## Conocimientos técnicos

- **Silueta primero:** el jugador reconoce formas antes que detalles. Hombros anchos = poder; cuerpo estrecho y alto = velocidad; masa baja y ancha = tanque.
- **Proporciones y gameplay:** personajes cabezones se leen "amigables"; proporciones realistas se leen "serios". Las manos grandes mejoran la lectura de ataques (ver `roblox-combat-animation`).
- **`Humanoid` y escala:** la altura afecta percepción de velocidad: un personaje alto parece más lento aunque vaya igual. Compensa con efectos o ajusta `Humanoid` solo tras probar en mapa real.
- **`HumanoidDescription`:** es la vía estándar para aplicar apariencia de avatar sin reconstruir el `Character` a mano. Úsala como contrato entre diseño y código.
- **`Accessory`:** cada accesorio suma geometría y posibles colisiones visuales. Límite recomendado: 0–3 por personaje jugable en móvil.
- **`SkinnedMesh` vs partes rígidas:** la malla con piel suaviza hombros/codos pero exige pesos correctos; las partes rígidas son más baratas y predecibles. Decide por presupuesto, no por moda.
- **Contraste y fondo:** diseña contra los fondos reales del juego (pasto verde, cueva oscura), no contra fondo blanco de editor.
- **Legibilidad facial:** a más de 15 studs la cara no se lee; no pongas información de gameplay solo en la cara (ver `roblox-expressive-animation` para cuándo sí usarla).

Ejemplo ilustrativo (contrato diseño → código, no lógica final):

```luau
-- Ilustrativo: aplicar la paleta aprobada vía HumanoidDescription.
local description = Instance.new("HumanoidDescription")
description.Torso = Color3.fromRGB(30, 90, 200) -- color de equipo documentado
description.LeftArm = Color3.fromRGB(30, 90, 200)
description.RightArm = Color3.fromRGB(30, 90, 200)
-- El Humanoid del Character aplica esta descripción al aparecer.
```

## Buenas prácticas

- Una idea por personaje: si necesita dos frases para explicarse, divídelo en dos diseños.
- Reserva los colores más saturados para información de gameplay (equipo, peligro, objetivo).
- El cliente propone customización, el servidor valida: todo cambio de apariencia (color, `Accessory` equipado) debe pasar por validación de servidor contra la lista blanca antes de replicarse a otros jugadores.
- Documenta "lo prohibido" con ejemplos visuales, no solo con texto.
- Mantén el `HumanoidRootPart` visualmente centrado: capas o mochilas gigantes descentran la percepción del pivote.
- Diseña pensando en `SkinnedMesh` y en partes rígidas a la vez si el juego soporta ambos.
- Revisa diseño con animaciones reales puestas, nunca en pose T estática solamente.

## Errores frecuentes

1. **Diseñar en zoom máximo:** se ve genial de cerca e ilegible en juego. Probar siempre a distancia de `Camera` real.
2. **Equipo solo en un pin pequeño:** a 30 studs desaparece. El color de equipo debe ocupar torso o cabeza.
3. **Accesorios que tapan hitbox visual:** sombreros enormes que ocultan si el jugador lleva arma o no.
4. **Paleta del personaje = paleta del mapa:** personaje verde en jungla verde. Exige contraste mínimo documentado.
5. **Customización sin límites:** permite combinaciones que rompen rol (enemigo que parece aliado). Siempre lista blanca validada en servidor.
6. **Manos y pies del mismo color que el suelo:** se pierde la lectura de pisadas y ataques. Reserva un tono distinto.
7. **Ignorar `HumanoidDescription`:** reconstruir apariencia a mano genera inconsistencias entre respawns; usa el contrato estándar que gestiona `roblox-characters`.

## Criterios de calidad y terminado

- [ ] Silueta reconocible en miniatura (64 px) por 3 de 3 probadores.
- [ ] Rol (rápido/tanque/soporte) adivinado correctamente sin explicación.
- [ ] Equipo/facción identificado al 100% a 30 studs, incluyendo simulación de daltonismo.
- [ ] Kit de `Accessory` con límites escritos y validados en servidor.
- [ ] Hoja de personaje congelada: paleta, proporciones y `HumanoidDescription` base.
- [ ] Validado con idle/walk reales sin clipping grave.

## Herramientas

- Editor de avatares y vista previa de `HumanoidDescription` del entorno de desarrollo.
- Mapa de prueba gris con distancias marcadas (20/40/60 studs) y fondos del juego.
- Checklist de aprobación de personaje (esta skill) + pruebas de cámara con `camera-systems`.
- Tabla de lista blanca de customización para validación de servidor.

## Limitaciones

- No genera modelos ni texturas por sí misma; define dirección y contratos.
- No ajusta rendimiento de mallas ni presupuestos de triángulos (ver auditoría de rendimiento del proyecto).
- No sustituye pruebas con jugadores reales ni criterios de accesibilidad legal; la verificación de daltonismo aquí es heurística.
- Cualquier API fuera de la lista estable debe escribirse como "(verificar en create.roblox.com/docs)".
