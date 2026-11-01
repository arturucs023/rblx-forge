---
name: roblox-props-creation
description: Creación de props con presupuesto de instancias, colliders simples y LOD manual. Úsala cuando necesites mobiliario, decoración o sets temáticos que rindan bien y se lean a distancia.
---

# Creación de Props

## Objetivo

Crear props (mobiliario, decoración, objetos interactivos visuales) que se lean bien a distancia de juego, cuesten pocas instancias, colisionen de forma simple y funcionen como sets temáticos coherentes reutilizables en varios lugares.

## Alcance y límites

Qué NO hace ni cubre esta skill:

- NO diseña QUÉ props necesita cada zona (temática, estilo, lista de set): eso lo diseñan `roblox-world-building` (generalista) y `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (propias, en curso).
- NO cubre construcción de vehículos: eso lo cubre `roblox-vehicle-construction`.
- NO cubre geometría avanzada con `MeshPart` ni CSG compleja: eso lo cubre `roblox-meshparts-geometry`.
- NO cubre organización global ni versionado: eso lo cubren `roblox-model-organization` y `roblox-rojo` (sync).

Diferenciación declarada: `roblox-world-building` (instalada, generalista fina) y las skills propias (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) diseñan QUÉ construir; esta skill explica CÓMO construirlo (técnica de props). `roblox-rojo` cubre el sync; esta skill cubre la técnica de modelado.

## Casos de uso

- Mobiliario interior (mesas, sillas, estanterías) para varias habitaciones.
- Decoración exterior (farolas, cajas, barriles, señales) repetida por una ciudad.
- Set temático coherente (taberna medieval, laboratorio, tienda) con paleta y materiales comunes.
- Objetos de evento que deben rendir bien aunque haya decenas en pantalla.

## Proceso paso a paso

1. **Define el presupuesto.** Fija tope de instancias por prop (p. ej. pequeño ≤8, mediano ≤20) y tope por escena; anótalo en la carpeta del set.
2. **Bloquea silueta con `Part`.** Modela primero el volumen legible a distancia (caja, cilindro) y valida que se reconoce desde la `Camera` de juego antes de detallar.
3. **Valida escala avatar.** Comprueba altura de uso (mesa, mostrador, silla) contra avatar; pasos y accesos cercanos ~2x avatar donde aplique.
4. **Simplifica colliders.** Envuelve el prop en 1–2 cajas de colisión simples; los detalles (patas finas, adornos) no colisionan individualmente.
5. **Detalla barato.** Añade detalle con `Decal`/`Texture`, `SurfaceGui` simple o `SpecialMesh` básico en lugar de docenas de `Part` pequeñas.
6. **Crea LOD manual.** Para props repetidos, prepara versión completa y versión lejana simplificada (menos piezas) y decide a qué distancia se intercambian en tu nivel.
7. **Agrupa el set temático.** Reutiliza paleta y `MaterialVariant` (vía `MaterialService`) coherentes en todo el set; verifica coherencia con dudas en create.roblox.com/docs si algo no está claro.
8. **Empaqueta como `Model`.** Cada prop es un `Model` con `Pivot` útil (base centrada para apoyar en suelo) y nombre descriptivo (`Prop_Mesa_Taberna`).
9. **Etiqueta con Tags/`Attributes`.** Marca set y rol (`Prop`, `Set="Taberna"`, `ColliderSimple="true"`, `LOD="Cerca/Lejos"`) con `CollectionService` para gestión por script.
10. **Prueba en masa.** Coloca la cantidad real que habrá en escena, recorre a pie, choca contra los props y verifica rendimiento y legibilidad a distancia.

## Conocimientos técnicos

- Presupuesto de instancias: cada `Part`/`MeshPart` suma; decenas de props × decenas de piezas escalan rápido. Menos piezas por prop = escenas más sanas.
- Colliders simples: 1–2 cajas por prop evitan atascos y cuestan poco; colisionar con cada pata o adorno es la causa típica de enganches.
- LOD manual: versión lejana con silueta pero sin detalle interior; se usa cuando el prop está lejos de la `Camera` y el detalle no se aprecia.
- Escala avatar: un prop "bonito" pero inutilizable (silla donde el avatar no cabe, mostrador que tapa la cámara) falla su función.
- `MaterialService` / `MaterialVariant`: reutilizar variantes del set mantiene coherencia y evita materiales únicos por prop (verificar nombres exactos en create.roblox.com/docs si dudas).
- `Terrain`, `Lighting`, `Workspace`/`StreamingEnabled`: valida props bajo la iluminación real y con streaming, porque el color y la visibilidad cambian entre editor y juego.
- `SurfaceGui`/`Decal`/`Texture`: detalle visual barato frente a geometría; ideal para etiquetas, pantallas, vetas o carteles.
- Jerarquías: `Model` por prop dentro de un `Folder` por set (`Set_Taberna`) para localizar y reutilizar sin duplicar.

## Buenas prácticas

- Un prop = un `Model` = un `Pivot` en la base; facilita colocar decenas sin ajustes.
- Reutiliza patas, asas y remates entre props del mismo set como micro-kit.
- Prefiere texturas/decals a geometría para detalles menores de ~0.5 studs.
- Nombra con set incluido (`Prop_Taberna_Silla01`) para filtrar por set.
- Documenta el presupuesto real (instancias por prop) junto al set.

## Errores frecuentes

- Silla de 40 piezas que al repetirse 30 veces hunde el rendimiento. Causa: sin presupuesto. Solución: tope de instancias y detalle barato.
- Avatar enganchado en patas de mesa. Causa: cada pata colisiona. Solución: una caja envolvente simple.
- Props que flotan o se hunden. Causa: `Pivot` fuera de la base. Solución: pivot en base centrada y prueba de apoyo.
- Set incoherente (5 maderas distintas en la misma taberna). Causa: materiales por prop. Solución: paleta y `MaterialVariant` compartidos.
- Detalle invisible en juego. Causa: modelar mirando de cerca en editor. Solución: validar siempre desde la `Camera` y distancia reales.
- Duplicar props renombrándolos a mano hasta perder la cuenta. Causa: sin `Tags`/`Attributes`. Solución: etiquetar set y rol desde el inicio.
- Sync Rojo que pisa props ajenos. Causa: editar ficheros compartidos sin coordinar. Solución: sets por carpeta y sync según `roblox-rojo`.

## Criterios de calidad y terminado

- [ ] Cada prop cumple su presupuesto de instancias declarado.
- [ ] Colliders simples (1–2 cajas) verificados chocando a pie, sin enganches.
- [ ] Escala avatar validada en props de uso (sentarse, apoyar, rodear).
- [ ] Versión LOD lejana lista para props repetidos en masa.
- [ ] Set temático coherente en paleta y materiales, empaquetado en `Folder` por set.
- [ ] Props como `Model` con `Pivot` en base, nombres con set y `Tags`/`Attributes`.
- [ ] Prueba en masa (cantidad real en escena) superada a distancia de `Camera` real.

## Herramientas

- `Part`, `MeshPart`, `SpecialMesh`, `Model`, `Folder` para modelar y empaquetar.
- `Decal`, `Texture`, `SurfaceGui` para detalle barato.
- `MaterialService` / `MaterialVariant` para coherencia de materiales del set.
- `CollectionService` / Tags, `Attributes` para marcar set, rol y LOD.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera`, `Terrain` para validación en condiciones reales.

Ejemplo Luau ilustrativo (organización por script):

```luau
-- Ilustrativo: marcar todos los props de un set.
local CollectionService = game:GetService("CollectionService")
local set = workspace:WaitForChild("Set_Taberna")
for _, prop in set:GetDescendants() do
	if prop:IsA("Model") then
		CollectionService:AddTag(prop, "Prop")
		prop:SetAttribute("Set", "Taberna")
	end
end
```

## Limitaciones

- No diseña la temática del set; solo la técnica de construcción eficiente.
- No implementa intercambio automático de LOD por script; solo prepara las versiones.
- No configura sync Rojo ni versionado global (ver `roblox-rojo` y `roblox-model-organization`); si dudas de una clase o servicio, verifícalo en create.roblox.com/docs.
