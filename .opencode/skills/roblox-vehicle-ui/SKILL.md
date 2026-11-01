---
name: Vehículos Roblox UI
description: Garaje, spawn, HUD de conducción y daños. Úsala cuando crees selección de vehículos, customización, velocímetro, combustible o estados de daño.
---

# Vehículos Roblox UI

## Objetivo

Hacer usar vehículos sin fricción ni trampas: elegir en el garaje, spawnear en punto válido, conducir leyendo velocidad/combustible/daño de un vistazo, personalizar lo visible y entender qué pasa al romperse. La UI informa; la física y la propiedad las decide el servidor.

## Alcance y límites

Cubre: garaje (lista, stats, spawn), HUD de conducción (velocidad, combustible, daño, cinturón/faro), customización visual, y estados (ocupado, destruido, sin permiso).

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Física, asientos o red de vehículos: sistema de juego/servidor (verificar en create.roblox.com/docs); aquí solo su reflejo.
- Tienda de vehículos con cobro: lo cubre `roblox-shop-ui` (aquí el botón Ver/Comprar).
- Controles táctiles base: `roblox-mobile-touch-ui` (aquí su disposición para conducir).

## Casos de uso

- Garaje con 6 coches, stats (Vel/Aceler/Control 0-10) y "Spawnear".
- HUD con velocímetro 87 km/h, gasolina 62%, daño Leve y botón Faro.
- Personalización: color, llantas, bocina con preview en `ViewportFrame`.
- "Vehículo ocupado por Luis" o "Destruido · reaparece en 0:12".
- Moto con indicador de casco y nhắc "Sin combustible: busca gasolinera".

## Proceso paso a paso

1. **Define el contrato de uso.** Quién puede spawnear (propiedad/nivel), dónde (puntos válidos), cuántos a la vez, qué pasa al destruirse (cooldown, coste). Escríbelo antes de dibujar el garaje.
2. **Maqueta garaje + HUD.** Garaje: lista/carril + `ViewportFrame` preview + stats + botones Spawnear/Personalizar. HUD: velocímetro abajo-derecha, combustible + daño arriba o junto a velocidad, acciones (Faro/Bocina/Salir) en arco táctil. Móvil: garaje por pestañas, HUD sin tapar botones de lái.
3. **Construye las cards del garaje.** `Frame` + preview + `TextLabel` nombre + 3 barras 0-10 + estado (Disponible/Ocupado/Destruido 0:12/Bloqueado Nivel X). Spawnear es acción primaria con debounce.
4. **Spawn con feedback.** Al pulsar Spawnear: loading breve → aparece en punto libre (si no hay, la UI dice "Sin punto libre, espera" en vez de solapar coches). Si falla el servidor, revierte con causa + acción.
5. **HUD de conducción legible.** Velocidad en número grande tabular + unidad, combustible con barra + % y aviso al 20% y 10%, daño en 4 niveles (Intacto/Leve/Grave/Crítico) con icono + texto (no solo color), botones Faro/Bocina/Salir de 56+ px.
6. **Personalización visual.** Color (paleta 8-12), llantas (3-5), bocina (2-3), placa con texto filtrado. Preview en `ViewportFrame` con el modelo real; Guardar pide al servidor y muestra confirmación. Nada que cambie stats se vende como "visual".
7. **Daños y consecuencias.** Al subir el daño: aviso + degradado sugerido en HUD ("Grave: busca taller"); al destruirse: modal breve con causa, cooldown visible y botones "Reparar/Spawnear otro/Salir". Sin jumpscares ni bloqueo eterno.
8. **Permisos y robo.** Si el juego permite pasajeros/robo, la UI muestra dueño, candado y "Pedir subir" vs "Robar (riesgo)" con consecuencia explícita. Toda acción la valida el servidor.
9. **Verifica conduciendo de verdad.** Spawnea, conduce 5 min, choca, agota combustible, destruye, repara, personaliza y reentra. En PC, móvil y mando, sin solapes y a 60 fps.

## Conocimientos técnicos

- HUD de velocidad (clases estables):

  ```luau
  -- Ejemplo ilustrativo: pintar velocidad y combustible
  local speedLabel = hud:WaitForChild("SpeedValue") :: TextLabel
  local fuelFill = hud:WaitForChild("FuelFill") :: Frame

  local function setDrive(speed: number, fuel: number)
    speedLabel.Text = string.format("%d km/h", math.floor(speed + 0.5))
    fuelFill.Size = UDim2.fromScale(math.clamp(fuel, 0, 1), 1)
  end
  ```

- Barras y velocímetro a `Scale` con `UIAspectRatioConstraint` en diales; números tabulares con `UITextSizeConstraint`; `UIPadding` y `UICorner` coherentes con el HUD base.
- `ViewportFrame` para preview del garaje: un modelo, cámara 3/4 fija, rotación lenta opcional; en lista usa `ImageLabel`.
- `UserInputService` para atajos (F faro, H bocina, E salir según proyecto) + botones táctiles equivalentes; `ProximityPrompt` para "Subir" en el mundo 3D.
- Estado (dueño, daño, combustible) replicado por el servidor (verificar en create.roblox.com/docs); la UI pinta y pide acciones, nunca otorga propiedad ni repara localmente.
- `TweenService` para avisos (flash de daño 0.2 s, pulso de combustible bajo) y transiciones garaje↔HUD.

### Identidad visual de esta skill (original, no copiar)

- Dirección "taller industrial": fondo asfalto (#12161F), tarjetas acero (#232B3D) con franja amarilla taller (#FFC53D), HUD en pastillas oscuras con números blancos y acento verde ok (#3DDC84) / rojo crítico (#FF5A5A).
- Tipografía: velocidad 30-36 extra-negrita tabular, etiquetas 11 mayúsculas, stats 13 con número. Unidad siempre visible ("km/h", "%").
- Composición: garaje en carril + preview 16:10; HUD con velocidad abajo-derecha, combustible+daño arriba-derecha, acciones en arco. `UIPadding` 12, `UICorner` 10.
- Espaciado: velocímetro 140-180 de diámetro equivalente, gap 10 entre pastillas, botones de acción 56-64.
- Estados: intacto/leve/grave/crítico con icono + texto + color; combustible bajo con parpadeo lento (1 Hz máx.); spawn loading con spinner; destruido con modal y cuenta atrás.
- Animación: aguja/barra suavizada 0.15 s, avisos con pulso, transiciones con fundido. Nada que distraiga a 120 km/h.

## Buenas prácticas

- Velocidad + combustible + daño visibles sin apartar la vista del camino.
- Niveles de daño con texto, no solo color; combustible con % y aviso doble (20%/10%).
- Spawnear explica dónde aparecerá ("Punto B · Taller") antes de pulsar.
- Personalización con preview real y Guardar explícito; sin cambios silenciosos.
- Coherencia con HUD base, tienda y notificaciones: mismos números, mismos iconos.
- Textos de placa y nombres filtrados; sin texto libre sin control.

## Errores frecuentes

- Velocímetro que tapa el centro o los botones táctiles de giro.
- Permitir spawnear 10 coches spameando el botón (falta debounce + validación servidor).
- Mostrar "Reparado" en cliente sin confirmación y romper el coche al reentrar.
- Daño solo por color que daltónicos no distinguen a velocidad.
- Preview con modelo distinto al que spawnea (llantas que no existen).
- Robar/usar vehículos ajenos sin validación y abrir la puerta al exploit.

## Criterios de calidad y terminado

- [ ] Ciclo garaje→spawn→conducir→dañar→destruir→reparar probado con servidor.
- [ ] HUD legible a velocidad sin tapar la carretera en 3 resoluciones.
- [ ] Sin spawns duplicados ni propiedad falsa bajo spam o latencia alta.
- [ ] Personalización guarda y persiste tras reentrar.
- [ ] 60 fps conduciendo en PC y sin caídas atribuibles a la UI en móvil.
- [ ] Arte y nombres originales, textos filtrados donde aplique.

## Herramientas

- Studio: Play con servidor conduciendo, simulador móvil + mando, `Output` para spawns fallidos.
- MCP Studio (si disponible): capturas de garaje y HUD en marcha en 3 resoluciones.
- Rojo: vehículos, stats y opciones visuales como datos editables.
- Selene: lint de handlers de spawn/reparar/personalizar y debounces.

## Limitaciones

- Física, colisiones y propiedad real viven en el juego/servidor (verificar en create.roblox.com/docs).
- El HUD no sustituye tutorial de conducción; si nadie sabe girar, el problema es del juego.
- `ViewportFrame` y reflejos tienen coste; preview sobrio y documentado.
- Combustible/daño como sistemas de gameplay los balancea el proyecto, no esta UI.
