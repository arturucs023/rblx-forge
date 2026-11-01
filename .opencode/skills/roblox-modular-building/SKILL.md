---
name: roblox-modular-building
description: Construcción modular con grid, kits reutilizables y pivots. Úsala cuando necesites piezas intercambiables, variaciones sin romper el set o escalar un nivel con pocos assets.
---

# Construcción Modular

## Objetivo

Construir niveles y edificios a partir de un kit pequeño de piezas reutilizables (muros, suelos, esquinas, remates) que encajan sobre un grid fijo, mantienen pivots coherentes y admiten variación visual sin romper la compatibilidad del set.

## Alcance y límites

Qué NO hace ni cubre esta skill:

- NO diseña QUÉ construir (temática, estilo, planta del nivel): eso lo diseñan `roblox-world-building` (generalista) y `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (propias, en curso).
- NO cubre el sync de ficheros ni la configuración de `project.json`: eso lo cubre `roblox-rojo`.
- NO cubre creación de props sueltos ni MeshParts a medida: eso lo cubren `roblox-props-creation` y `roblox-meshparts-geometry`.
- NO cubre organización global de jerarquías ni versionado: eso lo cubre `roblox-model-organization`.

Diferenciación declarada: `roblox-world-building` (instalada, generalista fina) y las skills propias (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) diseñan QUÉ construir; esta skill explica CÓMO construirlo (técnica modular). `roblox-rojo` cubre el sync; esta skill cubre la técnica de modelado.

## Casos de uso

- Set de muros/suelos/tejas para una ciudad que debe crecer sin modelar cada casa desde cero.
- Interiores (dungeon, nave, oficina) con pasillos y habitaciones que se recombinan.
- Kit de escaleras, barandillas y remates que encajan en cualquier edificio del juego.
- Prototipado rápido de un nivel usando piezas grises antes del pase de arte.

## Proceso paso a paso

1. **Fija el grid base.** Elige un módulo (p. ej. 4 studs) y declara que toda pieza mide múltiplos exactos (4, 8, 12...). Documenta el módulo en el nombre de la carpeta del kit.
2. **Define la lista cerrada del kit.** Escribe la lista mínima (suelo 4x4, muro 4 de alto, esquina, dintel, escalón, remate) y no añadas piezas nuevas sin justificar cuál sustituyen.
3. **Modela una pieza maestra por tipo.** Usa `Part` con tamaño exacto de grid, anclada (`Anchored=true`), y comprueba que dos copias pegadas no dejan huecos ni solapan.
4. **Normaliza pivots.** Coloca el `Pivot` de cada `Model` en la misma referencia (p. ej. esquina inferior o centro de la base) para que mover/rotar piezas sea predecible.
5. **Valida escala avatar.** Comprueba puertas y pasos: una puerta cómoda ronda ~2x la altura del avatar. Ajusta el kit (altura de muro, ancho de vano) antes de duplicar.
6. **Añade variación sin romper compatibilidad.** Crea variantes que conservan medidas y pivot (muro liso, muro con ventana, muro dañado) y verifica que cada variante sustituye a la base sin mover el resto.
7. **Marca con `CollectionService`/Tags y `Attributes`.** Etiqueta piezas (`Pared`, `Suelo`, `Modular`) y guarda `Attributes` como `Modulo="4"` o `Variante="Ventana"` para localizarlas por script.
8. **Prueba de estrés del set.** Monta una habitación de prueba solo con el kit, recorre a pie cada unión y corrige huecos, saltos de colisión y piezas que z-fighting (superficies coplanares).
9. **Empaqueta por `Folder` y `Model`.** Guarda el kit en un `Folder` (p. ej. `Kit_Muros_4studs`) con cada pieza como `Model` nombrado (`Muro_4x4_Liso`, `Muro_4x4_Ventana`).
10. **Prepara para Rojo sin pisar trabajo.** Exporta el kit como modelo versionado y coordina quién edita el kit (una sola persona o rama) para no romper niveles que ya lo usan.

## Conocimientos técnicos

- Grid y múltiplos: si el módulo es 4 studs, todas las medidas (largo, alto, grosor) deben ser múltiplos para que las uniones cierren.
- `Pivot` coherente: piezas con pivots distintos no se alinean igual al duplicar; la esquina inferior facilita apilar, el centro de base facilita rotar.
- Escala avatar: puertas ~2x altura del avatar; pasillos mínimo para girar con comodidad; escalones que se suben sin saltar de forma incómoda.
- Colisiones jugables: las piezas de tránsito deben tener colisión sólida y sin huecos; los remates decorativos pueden no colisionar si no bloquean.
- Rendimiento: pocas piezas distintas reutilizadas muchas veces rinden mejor que cientos de piezas únicas; evita micro-piezas de 0.2 studs para cerrar huecos (revisa el grid en su lugar).
- `Workspace` / `StreamingEnabled`: los kits modulares se benefician del streaming porque las piezas son predecibles; evita referencias cruzadas frágiles entre piezas lejanas.
- `Camera`: valida desde la cámara de juego que las uniones no muestran huecos visibles en los ángulos reales de juego, no solo en vista de editor cenital.

## Buenas prácticas

- Nombra piezas con medida incluida (`Suelo_8x8`, `Muro_4x4_Puerta`) para saber qué sustituye a qué sin abrir el modelo.
- Mantén el kit pequeño: mejor 12 piezas que encajan que 60 que casi encajan.
- Versiona el kit (`Kit_v1`, `Kit_v2`) y no cambies medidas de `v1` una vez usado en niveles; crea `v2` para cambios.
- Documenta el módulo y el pivot en un `Attributes` o nota dentro del `Folder` del kit.
- Prueba cada variante sustituyendo a la base en un montaje real, no solo mirando la pieza aislada.

## Errores frecuentes

- Piezas de 3.97 studs en un grid de 4: acumulan huecos visibles al repetir. Causa: modelar a ojo. Solución: escribir el tamaño numérico exacto.
- Pivots mezclados (unos al centro, otros a la esquina): al rotar, unas piezas encajan y otras se desplazan. Solución: re-pivotar todo el kit igual.
- Puertas a escala incorrecta (avatar se agacha o sobra un hueco enorme). Causa: no validar con avatar. Solución: regla ~2x avatar y prueba a pie.
- Variantes que cambian el tamaño (el muro "con ventana" mide distinto). Causa: decorar fuera del volumen base. Solución: la decoración debe caber dentro del volumen del módulo.
- Superficies coplanares que parpadean (z-fighting). Causa: dos caras exactamente superpuestas. Solución: desplazar 0.01–0.05 studs o fusionar en una sola pieza.
- Romper niveles al "mejorar" el kit cambiando medidas. Solución: versionar y no editar medidas de kits en uso.

## Criterios de calidad y terminado

- [ ] Toda pieza mide múltiplos exactos del módulo declarado, verificable en sus tamaños.
- [ ] Todos los `Model` del kit comparten la misma convención de `Pivot`.
- [ ] Cada variante sustituye a su base sin mover piezas vecinas (prueba de sustitución superada).
- [ ] Puertas y pasos validados a pie con avatar (~2x avatar en puertas).
- [ ] Montaje de prueba sin huecos, sin saltos de colisión y sin parpadeos visibles desde la `Camera` de juego.
- [ ] Kit empaquetado en `Folder` con nombres con medida y `Tags`/`Attributes` de identificación.
- [ ] Kit versionado y listo para Rojo sin romper niveles existentes.

## Herramientas

- `Part`, `Model`, `Folder` para piezas, conjuntos y empaquetado del kit.
- `CollectionService` / Tags y `Attributes` para marcar piezas y variantes.
- `Workspace` / `StreamingEnabled` y `Camera` para validar streaming y ángulos reales.
- Rojo `project.json` / `$path` / `$className` solo como destino de sync (la configuración la cubre `roblox-rojo`).

Ejemplo Luau ilustrativo (organización por script, no gameplay):

```luau
-- Ilustrativo: listar piezas del kit marcadas con un Tag.
local CollectionService = game:GetService("CollectionService")
for _, pieza in CollectionService:GetTagged("Modular") do
	if pieza:IsA("Model") then
		print(pieza.Name, pieza:GetAttribute("Modulo"))
	end
end
```

## Limitaciones

- No diseña la temática ni la planta del nivel; solo la técnica modular.
- No configura Rojo (`project.json`, `$path`, `$className` — verificar detalles en create.roblox.com/docs si dudas); solo deja el kit listo para sincronizar.
- No sustituye pruebas de rendimiento con contadores reales de instancias en el lugar final.
