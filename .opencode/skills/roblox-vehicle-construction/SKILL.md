---
name: roblox-vehicle-construction
description: Construcción de vehículos (chasis, cabinas, ruedas/hélices/cascos, colliders y asientos). Úsala cuando necesites coches, barcos, naves o monturas modeladas de forma jugable y estable.
---

# Construcción de Vehículos

## Objetivo

Modelar vehículos (terrestres, acuáticos o voladores) con chasis estable, cabina legible, elementos de contacto (ruedas, hélices, cascos) creíbles, colliders simplificados y asientos bien colocados, priorizando que no vuelquen, no se atasquen y se lean bien desde la cámara de juego.

## Alcance y límites

Qué NO hace ni cubre esta skill:

- NO diseña QUÉ vehículo conviene al juego (temática, rol, roster): eso lo diseñan `roblox-world-building` (generalista) y `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (propias, en curso).
- NO programa la conducción ni la física de movimiento (esta skill es técnica de modelado/construcción, no de gameplay).
- NO cubre el sync de ficheros Rojo: eso lo cubre `roblox-rojo`.
- NO cubre organización global de jerarquías: eso lo cubre `roblox-model-organization`; ni props genéricos (`roblox-props-creation`) ni geometría avanzada (`roblox-meshparts-geometry`) más allá de lo necesario para el vehículo.

Diferenciación declarada: `roblox-world-building` (instalada, generalista fina) y las skills propias (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) diseñan QUÉ construir; esta skill explica CÓMO construirlo (técnica de vehículos). `roblox-rojo` cubre el sync; esta skill cubre la técnica de modelado.

## Casos de uso

- Coche o camión jugable para una ciudad o circuito.
- Barco o lancha con casco creíble para zonas de agua.
- Nave o aeronave estilizada con hélices o rotores.
- Montura o vehículo de evento que debe verse bien y no romperse al subir/bajar.

## Proceso paso a paso

1. **Define tipo y escala.** Decide terrestre / acuático / aéreo y valida tamaño contra avatar: cabina con altura libre ~2x avatar en accesos y asientos donde el avatar quepa sentado sin clipping grave.
2. **Bloquea el chasis primero.** Modela el volumen principal con `Part` o `MeshPart` simple, simétrico, con la base a altura coherente (ruedas o casco debajo, no flotando ni hundido).
3. **Añade el collider jugable.** Crea colliders simples e invisibles (cajas con `Part`) que envuelven chasis y salientes; el modelo visual detallado no debe ser la colisión.
4. **Construye cabina y accesos.** Modela cabina legible (parabrisas, laterales) y deja vanos de entrada/salida amplios; verifica que el avatar entra y sale sin atascarse.
5. **Modela ruedas / hélices / cascos.** Ruedas: mismo diámetro por eje, simétricas, sin solapar el chasis. Hélices/rotores: centrados en su eje y con espacio libre de giro. Cascos: proa/popa legibles y simetría lateral.
6. **Coloca asientos.** Ubica el asiento del conductor centrado respecto a los controles visuales y los de pasajeros con espacio suficiente; comprueba sentado con avatar real.
7. **Equilibra el conjunto.** Revisa simetría izquierda/derecha, centro visual bajo y ausencia de piezas pesadas en voladizo que sugieran vuelco; ajusta antes de decorar.
8. **Decora con presupuesto.** Añade detalles (luces, defensas, alerones) con `Part`, `Decal`/`Texture` o `SurfaceGui` simples; cada detalle debe caber en el volumen del vehículo.
9. **Organiza la jerarquía.** Guarda todo en un `Model` (`Vehiculo_Nombre`) con sub-`Folder` (`Chasis`, `Cabina`, `Ruedas`, `Detalles`, `Colliders`) y `Tags`/`Attributes` (`Vehiculo`, `Tipo="Terrestre"`, `Plazas="2"`).
10. **Prueba jugable final.** Recorre el vehículo a pie y con avatar sentado: subir, sentarse, bajar, empujar contra paredes y pasar por puertas/puentes del nivel (~2x avatar en pasos).

## Conocimientos técnicos

- Chasis como referencia: todo (cabina, ruedas, colliders) se alinea al chasis; si el chasis está torcido, todo hereda el error.
- Colliders simples: cajas invisibles que aproximan el volumen; evitan atascos que produciría colisionar con cada detalle visual.
- Escala avatar: accesos y cabina pensados para avatar de pie/sentado; puertas y vanos ~2x avatar como regla de partida.
- Simetría: un vehículo asimétrico se lee como roto; verifica con vista frontal/superior en el editor.
- Ruedas/hélices/cascos: ruedas alineadas por ejes y mismo tamaño; hélices con espacio de giro libre; cascos simétricos para lectura acuática.
- `SpecialMesh` y `MeshPart`: útiles para formas redondeadas (ruedas, morros) pero con moderación y colisiones por caja (ver `roblox-meshparts-geometry`).
- Rendimiento: cada vehículo suma instancias; reutiliza ruedas y detalles entre vehículos y evita micro-piezas.
- `Workspace` / `StreamingEnabled`: los vehículos se mueven por el mundo; evita anclar lógica frágil a posiciones absolutas y verifica visibilidad con streaming activo.
- `Camera`: valida lectura del vehículo desde la cámara real de juego (tercera persona típica), no solo en vista cercana de editor.

## Buenas prácticas

- Modela simétrico desde el inicio (mitad + espejo mental) en lugar de corregir al final.
- Separa siempre `Colliders` visuales de decoración en su propia carpeta.
- Nombra ruedas por posición (`Rueda_Delantera_Izq`) para detectar errores de simetría.
- Reutiliza ruedas, asientos y luces entre vehículos como mini-kit.
- Prueba con avatar real sentado, no solo con el modelo vacío.

## Errores frecuentes

- Vehículo que flota o hunde ruedas en el suelo. Causa: chasis sin referencia de altura. Solución: fijar altura de base antes de decorar.
- Avatar que se atasca al subir/bajar. Causa: vanos estrechos o colliders decorativos. Solución: vanos ~2x avatar y colliders simples.
- Ruedas de distinto tamaño o descentradas. Causa: modelar cada rueda a ojo. Solución: duplicar una rueda maestra.
- Hélice que atraviesa el fuselaje al girar. Causa: sin espacio libre. Solución: dejar volumen de giro despejado.
- Modelo bonito pero con cientos de piezas que lastra el rendimiento. Causa: decorar sin presupuesto. Solución: tope de instancias por vehículo y reutilización.
- Jerarquía plana con 80 `Part` sin carpetas. Causa: no organizar. Solución: subcarpetas por sistema (criterio de `roblox-model-organization`).

## Criterios de calidad y terminado

- [ ] Chasis simétrico y a altura correcta (sin flotar ni hundirse).
- [ ] Colliders simples separados de la decoración y verificados a pie.
- [ ] Cabina y accesos validados con avatar (~2x avatar en pasos, asiento sin clipping grave).
- [ ] Ruedas/hélices/cascos simétricos y con espacio funcional.
- [ ] Jerarquía en `Model` con sub-`Folder` y `Tags`/`Attributes` (`Vehiculo`, tipo, plazas).
- [ ] Lectura correcta desde la `Camera` de juego y presupuesto de instancias cumplido.
- [ ] Prueba subir/sentarse/bajar y circular por pasos del nivel superada.

## Herramientas

- `Part`, `MeshPart`, `SpecialMesh`, `Model`, `Folder` para chasis, formas y empaquetado.
- `Decal`, `Texture`, `SurfaceGui` para detalles visuales baratos (luces, matrículas, paneles).
- `CollectionService` / Tags y `Attributes` para marcar vehículos y plazas.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera` para validar en mundo y ángulos reales.

Ejemplo Luau ilustrativo (organización por script):

```luau
-- Ilustrativo: etiquetar un vehículo y sus plazas.
local CollectionService = game:GetService("CollectionService")
local coche = workspace:WaitForChild("Vehiculo_Coche01")
CollectionService:AddTag(coche, "Vehiculo")
coche:SetAttribute("Tipo", "Terrestre")
coche:SetAttribute("Plazas", 2)
```

## Limitaciones

- No programa conducción, físicas personalizadas ni balanceo de gameplay.
- No detalla CSG avanzada ni colisiones precisas por malla (ver `roblox-meshparts-geometry`; si dudas de un comportamiento, verifícalo en create.roblox.com/docs).
- No configura sync Rojo; solo deja el modelo organizado para sincronizar (ver `roblox-rojo` y `roblox-model-organization`).
