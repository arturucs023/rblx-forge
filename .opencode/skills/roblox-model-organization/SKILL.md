---
name: roblox-model-organization
description: Organización de modelos y jerarquías (naming, carpetas, tags/atributos, versionado, Rojo). Úsala cuando necesites jerarquías limpias, importar sin duplicar y dejar el proyecto listo para sincronizar.
---

# Organización de Modelos y Jerarquías

## Objetivo

Mantener jerarquías limpias y predecibles (naming, `Folder`, `Model`, `Tags`/`Attributes`) para encontrar cualquier pieza en segundos, importar sin duplicar, versionar lo que importa y dejar el proyecto listo para Rojo sin pisar trabajo ajeno.

## Alcance y límites

Qué NO hace ni cubre esta skill:

- NO diseña QUÉ construir (temática, estilo, niveles): eso lo diseñan `roblox-world-building` (generalista) y `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (propias, en curso).
- NO cubre la técnica de modelado (modular, vehículos, props, geometría): eso lo cubren `roblox-modular-building`, `roblox-vehicle-construction`, `roblox-props-creation` y `roblox-meshparts-geometry`.
- NO configura el sync Rojo (`project.json`, `$path`, `$className`): eso lo cubre `roblox-rojo`; esta skill solo prepara la jerarquía para sincronizar.

Diferenciación declarada: `roblox-world-building` (instalada, generalista fina) y las skills propias (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) diseñan QUÉ construir; esta skill explica CÓMO construirlo (técnica de organización). `roblox-rojo` cubre el sync; esta skill cubre la técnica de modelado/orden.

## Casos de uso

- Proyecto con cientos de instancias donde nadie encuentra nada.
- Importar un set nuevo sin duplicar materiales, props o kits existentes.
- Preparar carpetas y nombres antes de activar sync Rojo.
- Limpiar un lugar heredado lleno de `Part` sueltas y nombres `Part(47)`.

## Proceso paso a paso

1. **Audita el estado actual.** Lista `Folder` raíz, cuenta `Part` sueltas fuera de `Model` y detecta duplicados por nombre; anota los 5 peores focos de desorden.
2. **Define la convención de nombres.** Fija formato (`Categoria_Nombre_Variante`: `Muro_4x4_Ventana`, `Prop_Taberna_Silla01`, `Vehiculo_Coche01`) y prohíbe nombres genéricos nuevos.
3. **Crea la jerarquía raíz.** Organiza por `Folder` estables (`Kit_Modular`, `Sets`, `Vehiculos`, `Props`, `Colliders`, `Decoracion`) y evita más de 3 niveles de anidado.
4. **Convierte piezas sueltas en `Model`.** Agrupa cada objeto lógico en un `Model` con `Pivot` útil (base centrada en props, esquina/centro coherente en modulares) y escala avatar verificada (~2x avatar en pasos).
5. **Etiqueta con `CollectionService` y `Attributes`.** Añade Tags por rol (`Modular`, `Prop`, `Vehiculo`, `Collider`) y `Attributes` (`Set`, `Modulo`, `Version`) para búsquedas por script.
6. **Dedup antes de importar.** Antes de traer nada, busca por nombre y Tag si ya existe; reutiliza o versiona (`Silla02`) en lugar de duplicar (`Silla(1)`).
7. **Decide qué versionar.** Versiona kits, sets y vehículos (`Kit_v1`); no versiones piezas de trabajo temporal ni duplicados. Documenta la versión en `Attributes`.
8. **Separa colisiones y decoración.** Mueve colliders a sub-`Folder` `Colliders` por modelo para que sean visibles, auditables y no se confundan con visual.
9. **Prepara para Rojo.** Agrupa por carpetas que mapearán a `$path`/`$className`, evita renombrados masivos sin avisar y coordina ediciones para no pisar trabajo (la configuración la hace `roblox-rojo`).
10. **Verifica y congela.** Recorre el lugar a pie, comprueba que todo se encuentra por nombre/Tag, que no hay duplicados y que el conteo de instancias es razonable; congela la convención.

## Conocimientos técnicos

- `Model` vs `Folder`: `Model` para objetos con `Pivot` y posición (piezas colocables); `Folder` para agrupar sin transformar (sets, categorías).
- Naming con medida y set: incluir módulo o set en el nombre evita sustituciones erróneas y facilita el sync.
- `CollectionService` / Tags y `Attributes`: la forma robusta de clasificar sin depender de nombres frágiles; permite auditorías por script.
- `Pivot` coherente por categoría: props en base, modulares según convención del kit; pivots mezclados rompen colocación.
- Presupuesto de instancias: la organización revela el coste (contar por carpeta/set) y permite podar antes de que el rendimiento caiga.
- `Workspace` / `StreamingEnabled`: jerarquías planas y por zonas se llevan mejor con streaming que marañas de referencias cruzadas.
- `Camera`: valida que la limpieza no rompa visibilidad (piezas movidas a carpetas siguen visibles desde ángulos reales).
- Rojo `project.json` / `$path` / `$className`: la jerarquía debe mapear limpiamente a rutas; carpetas estables = sync estable (detalles de config en `roblox-rojo`; si dudas, verificar en create.roblox.com/docs).

## Buenas prácticas

- Renombra al crear, no al final: cada pieza nace con su nombre definitivo.
- Máximo 3 niveles de anidado; más niveles esconden piezas y rompen búsquedas.
- Un `Model`, un `Pivot` útil, un rol (Tag): nada de modelos "mixtos".
- Reutiliza antes de importar; versiona antes de duplicar.
- Documenta la convención en un `Attributes` o nota en la carpeta raíz para el equipo.

## Errores frecuentes

- Cientos de `Part(12)` imposibles de buscar. Causa: no renombrar al crear. Solución: convención obligatoria y auditoría por script.
- Duplicados `Silla`, `Silla(1)`, `Silla(2)`. Causa: importar sin buscar. Solución: búsqueda por nombre/Tag previa y reutilización.
- Colliders mezclados con decoración. Causa: sin subcarpeta. Solución: `Folder` `Colliders` por modelo.
- Renombrado masivo que rompe el sync Rojo. Causa: renombrar sin coordinar. Solución: cambios de nombre planificados con `roblox-rojo`.
- Jerarquías de 6 niveles donde nadie encuentra las ruedas del coche. Causa: sobre-organizar. Solución: aplanar a 3 niveles por sistema (`Chasis`, `Ruedas`, `Detalles`).
- Versionar todo (incluso pruebas) hasta llenar el proyecto. Causa: sin criterio. Solución: versionar solo kits/sets/vehículos en uso.
- Pisar trabajo ajeno al reorganizar. Causa: mover carpetas compartidas sin avisar. Solución: una persona/rama por reorganización y sync coordinado.

## Criterios de calidad y terminado

- [ ] Cero `Part` funcionales sueltas fuera de `Model`/`Folder` con nombre.
- [ ] Convención de nombres aplicada (categoría, medida/set, variante) sin genéricos nuevos.
- [ ] Jerarquía raíz estable con ≤3 niveles y `Pivot` coherente por categoría.
- [ ] Tags y `Attributes` (rol, set, versión) verificables por script.
- [ ] Sin duplicados: toda importación reutiliza o versiona explícitamente.
- [ ] Colliders separados en sub-`Folder` y escala avatar validada en pasos (~2x avatar).
- [ ] Proyecto listo para Rojo sin renombrados pendientes ni conflictos de edición.

## Herramientas

- `Model`, `Folder`, `Part`, `MeshPart` como bloques de organización.
- `CollectionService` / Tags y `Attributes` para clasificación y auditoría.
- `Workspace` / `StreamingEnabled`, `Camera`, `Lighting` para validar tras reorganizar.
- Rojo `project.json` / `$path` / `$className` como destino de sync (configura `roblox-rojo`).

Ejemplo Luau ilustrativo (organización por script):

```luau
-- Ilustrativo: detectar piezas sueltas sin agrupar en la raíz.
local sueltas = 0
for _, hijo in workspace:GetChildren() do
	if hijo:IsA("Part") or hijo:IsA("MeshPart") then
		sueltas += 1
		print("Suelta:", hijo:GetFullName())
	end
end
print("Piezas sueltas en raíz:", sueltas)
```

## Limitaciones

- No configura `project.json`, `$path` ni `$className` (eso es `roblox-rojo`); solo prepara jerarquías compatibles.
- No modela piezas nuevas; solo ordena, nombra y etiqueta lo existente.
- No introduce binarios ni dependencias nuevas. Ante cualquier duda de clases o servicios, verificar en create.roblox.com/docs.
