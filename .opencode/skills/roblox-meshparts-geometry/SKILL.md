---
name: roblox-meshparts-geometry
description: MeshParts y geometría (mesh vs parts, CSG con moderación, colisiones caja vs precisas, escalado). Úsala cuando decidas entre piezas clásicas o mallas y necesites formas complejas sin romper rendimiento ni colisiones.
---

# MeshParts y Geometría

## Objetivo

Decidir con criterio cuándo usar `Part` clásicas, cuándo `MeshPart` y cuándo CSG (`UnionOperation` / `NegateOperation`), y aplicar colisiones (caja vs. precisa) y escalado correctos para formas complejas que sigan siendo jugables y baratas.

## Alcance y límites

Qué NO hace ni cubre esta skill:

- NO diseña QUÉ formas necesita cada zona (estilo, temática): eso lo diseñan `roblox-world-building` (generalista) y `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (propias, en curso).
- NO cubre construcción modular, vehículos ni props como tales: eso lo cubren `roblox-modular-building`, `roblox-vehicle-construction` y `roblox-props-creation` (esta skill solo aporta el criterio geométrico).
- NO cubre organización global ni sync: eso lo cubren `roblox-model-organization` y `roblox-rojo`.

Diferenciación declarada: `roblox-world-building` (instalada, generalista fina) y las skills propias (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) diseñan QUÉ construir; esta skill explica CÓMO construirlo (técnica geométrica). `roblox-rojo` cubre el sync; esta skill cubre la técnica de modelado.

## Casos de uso

- Decidir si un arco, escalera curva o roca va en `Part`, CSG o `MeshPart`.
- Recortar un vano (puerta/ventana) con `NegateOperation` sin destrozar el rendimiento.
- Sustituir un grupo de 30 `Part` por un `MeshPart` equivalente.
- Corregir un `MeshPart` que se ve bien pero atraviesa al avatar o engancha.

## Proceso paso a paso

1. **Clasifica la forma.** Recta/repetible → `Part`. Recorte puntual (vano, hueco) → CSG. Curva/orgánica/única repetida muchas veces → candidata a `MeshPart`.
2. **Prueba primero con `Part`.** Bloquea la forma con piezas clásicas y valida escala avatar (pasos ~2x avatar) antes de invertir en malla o CSG.
3. **Usa CSG con moderación.** Une solo lo necesario con `UnionOperation` y recorta con `NegateOperation` para vanos puntuales; evita cadenas de decenas de operaciones.
4. **Separa visual de colisión.** Tras CSG o malla, envuelve en colliders simples de `Part` (cajas) para suelos, muros y pasos; reserva la colisión precisa solo a casos que la exijan (verificar opciones exactas en create.roblox.com/docs si dudas).
5. **Introduce `MeshPart` donde aporte.** Sustituye grupos caros de piezas o formas imposibles en `Part` (ruedas, morros, rocas) por un `MeshPart` de densidad razonable.
6. **Escala con cuidado.** Escala `MeshPart` de forma uniforme cuando sea posible; si escalas no uniforme, verifica deformaciones y revalida colisiones y apoyos.
7. **Valida a pie y con cámara.** Recorre la pieza, choca, sube/baja y mírala desde la `Camera` real; una malla perfecta en editor puede fallar en juego.
8. **Mide el coste.** Compara instancias y legibilidad antes/después; si el `MeshPart` no reduce piezas ni mejora lectura, vuelve a `Part`.
9. **Empaqueta y etiqueta.** Guarda cada pieza como `Model`/`MeshPart` nombrado en su `Folder`, con `Tags`/`Attributes` (`Geometria="Mesh/CSG/Parts"`, `Collider="Caja/Precisa"`).
10. **Deja listo para Rojo.** No versiona binarios nuevos ni dependencias: la malla queda referenciada y organizada para que `roblox-rojo` la sincronice sin pisar trabajo.

## Conocimientos técnicos

- `Part` vs `MeshPart`: `Part` es predecible, barata y fácil de editar; `MeshPart` gana en formas curvas/orgánicas y en reducir muchas piezas a una, pero exige controlar escala y colisión.
- CSG (`UnionOperation` / `NegateOperation`): útil para fusiones y recortes puntuales; el abuso (decenas de uniones) complica edición y colisiones. Con moderación.
- Colisiones caja vs. precisa: la caja (collider simple de `Part`) es estable y barata para jugar; la precisa sigue la malla pero puede enganchar en detalles. Por defecto, caja; precisa solo con motivo.
- Escalado: escalar `MeshPart` cambia también su colisión aparente; revalida apoyos (flotación/hundimiento) y pasos tras cada escalado no uniforme.
- `SpecialMesh`: redondeo barato dentro de `Part` para detalles (esferas, cilindros) sin saltar a malla completa.
- Escala avatar: vanos recortados con `NegateOperation` deben respetar ~2x avatar; un arco precioso pero bajo es un fallo jugable.
- Rendimiento: menos instancias y colliders simples; un `MeshPart` que sustituye a 30 piezas suele compensar, uno que sustituye a 2 no.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera`: valida mallas bajo luz real, con streaming y desde ángulos de juego; los sombreados cambian respecto al editor.

## Buenas prácticas

- Regla de oro: `Part` por defecto, CSG para recortes puntuales, `MeshPart` para lo que `Part` no puede hacer bien.
- Un `UnionOperation` por pieza lógica, no uno por nivel entero.
- Toda malla o CSG en zona de paso lleva collider de caja aunque "parezca" colisionar bien.
- Nombra con tipo geométrico (`Arco_CSG_4studs`, `Roca_Mesh_01`) para saber qué estás tocando.
- Conserva la versión en `Part` como referencia hasta validar la malla en juego.

## Errores frecuentes

- Nivel entero fusionado en una sola `UnionOperation` imposible de editar. Causa: unir por unir. Solución: uniones pequeñas y reversibles.
- Avatar que atraviesa una malla bonita. Causa: confiar en la colisión de la malla sin collider. Solución: caja simple envolvente.
- Avatar enganchado en adornos de malla. Causa: colisión precisa sobre detalle. Solución: colisión por caja y detalle sin colisión.
- `MeshPart` deformado tras escalado no uniforme. Causa: estirar sin verificar. Solución: escala uniforme o revalidación completa.
- Vanos recortados demasiado bajos/estrechos. Causa: no validar con avatar. Solución: regla ~2x avatar y prueba a pie.
- Sustituir 2 `Part` por un `MeshPart` pesado sin ganancia. Causa: moda de malla. Solución: medir instancias y legibilidad antes/después.
- Introducir binarios o dependencias nuevas para una malla. Causa: saltarse la regla. Solución: prohibido; solo geometría con herramientas existentes.

## Criterios de calidad y terminado

- [ ] Decisión `Part` / CSG / `MeshPart` justificada por forma y coste, no por gusto.
- [ ] CSG limitada a fusiones/recortes puntuales, editable por piezas.
- [ ] Colliders simples en toda zona de paso; colisión precisa solo donde esté justificada.
- [ ] Escalados verificados (sin flotación, hundimiento ni deformación) y pasos ~2x avatar.
- [ ] Prueba a pie y desde `Camera` real superada; coste de instancias igual o mejor que antes.
- [ ] Piezas nombradas por tipo geométrico con `Tags`/`Attributes` de geometría y collider.
- [ ] Sin binarios ni dependencias nuevas; listo para sync Rojo.

## Herramientas

- `Part`, `MeshPart`, `SpecialMesh` para formas base y redondeos.
- `UnionOperation`, `NegateOperation` para fusiones y recortes puntuales.
- `Model`, `Folder`, `CollectionService` / Tags, `Attributes` para empaquetar y marcar.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera` para validación real.
- Rojo `project.json` / `$path` / `$className` solo como destino (configura `roblox-rojo`).

Ejemplo Luau ilustrativo (organización por script):

```luau
-- Ilustrativo: auditar qué piezas usan colisión precisa.
local conteo = 0
for _, d in workspace:GetDescendants() do
	if d:IsA("MeshPart") and d:GetAttribute("Collider") == "Precisa" then
		conteo += 1
		print("Precisa:", d:GetFullName())
	end
end
print("MeshParts con colisión precisa:", conteo)
```

## Limitaciones

- No crea ni edita mallas externas; solo decide y aplica su uso dentro de Studio.
- No programa física ni gameplay; solo geometría y colisiones jugables.
- No configura Rojo ni versionado global. Si dudas de cualquier propiedad (colisiones, escalado, CSG), verifícala en create.roblox.com/docs.
