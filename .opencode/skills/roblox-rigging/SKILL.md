---
name: roblox-rigging
description: Rigs R6/R15/custom con Motor6D, jerarquías y validación. Úsala cuando tu modelo no se anima, se deforma raro o necesitas un rig propio.
---

# Rigging R6 / R15 / Custom

## Objetivo

Construir y validar rigs articulados que se animen sin deformaciones: jerarquía correcta de `Motor6D`, pivotes y offsets coherentes, escalado que no rompe articulaciones y un checklist que detecta rigs rotos antes de animar.

## Alcance y límites

Cubre estructura del rig: huesos/partes, `Motor6D`, `Bone`/`SkinnedMesh` básico, escalado y validación.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe ni gestión de `Humanoid` en juego: lo cubre `roblox-characters`.
- NO cubre dirección visual (silueta, paleta): lo cubre `roblox-character-design`.
- NO cubre clips ni blending (cubre `roblox-animation`; por dominio: `roblox-locomotion-animation`, `roblox-combat-animation`, `roblox-expressive-animation`).
- NO cubre NPCs con IA: lo cubre `roblox-npcs` (aquí solo el rig que esos NPCs usarían).
- NO cubre cámaras: lo cubre `camera-systems`.

## Casos de uso

1. Convertir un modelo estático en personaje animable.
2. Crear un rig custom (araña de 6 patas, gólem sin cuello, arma con partes móviles).
3. Diagnosticar brazo que rota desde el hombro equivocado o cabeza que se estira.
4. Escalar un jefe 2x sin que se separen las articulaciones.
5. Preparar `SkinnedMesh` con `Bone` para hombros/codos suaves.
6. Migrar animaciones entre R6 y R15 decidiendo qué rehacer.

## Proceso paso a paso

1. **Elige plantilla: R6, R15 o custom.** R6 = 6 partes rígidas, barato y robusto. R15 = 15 partes, mejor deformación de extremidades. Custom solo si el cuerpo no es humanoide (más de 2 brazos, sin cabeza). Anota la decisión.
2. **Verifica la raíz.** Debe existir `HumanoidRootPart` como base de movimiento y un `Humanoid` que lo gobierne. Todo lo visible cuelga de esa raíz, directa o indirectamente.
3. **Construye la jerarquía de arriba abajo.** Torso → cabeza / brazo sup. → brazo inf. → mano. Muslo → pierna → pie. Cada unión es exactamente un `Motor6D` con `Part0` = padre y `Part1` = hijo. Sin `Motor6D` duplicados en la misma unión.
4. **Fija `C0`/`C1` en pose neutra.** Coloca el modelo en pose T o A, alinea pivotes y registra los valores de `C0`/`C1`. Toda animación parte de estos offsets; si los cambias después, todas las animaciones se desplazan.
5. **Nombra de forma canónica.** Usa los nombres estándar de R6/R15 cuando sea humanoide (cabeza, torso, brazos, piernas). Los rigs custom usan sufijos claros (`PataDelantera_L1`, `PataDelantera_L2`). Nada de `Parte1`, `Parte2`.
6. **Conecta `Animator`.** El `Animator` vive dentro del `Humanoid` y los `AnimationTrack` actúan sobre los `Motor6D` por nombre. Si falta `Animator`, nada se mueve aunque el rig sea perfecto.
7. **Si usas `SkinnedMesh`, valida `Bone`.** Cada `Bone` debe tener padre correcto y la malla debe referenciar esos huesos. Un vértice con peso 100% a un hueso equivocado produce estiramientos "chicle".
8. **Prueba de escala.** Escala el modelo al tamaño mínimo y máximo de diseño y reproduce idle. Si las uniones se separan, el escalado no preservó `C0`/`C1`: corrige el pipeline de escalado, no los valores a mano uno por uno.
9. **Pasa el checklist de validación** (ver criterios). No entregues el rig hasta que las 8 pruebas pasen.
10. **Congela y documenta.** Guarda pose neutra, valores `C0`/`C1` base y mapa de nombres para que animadores y código hablen el mismo idioma.

## Conocimientos técnicos

- **`Motor6D` 101:** une dos partes con un offset (`C0` en el padre, `C1` en el hijo). La animación modifica la rotación/posición relativa. Si `Part0`/`Part1` están cruzados, el miembro rota al revés.
- **R6 vs R15:** R6 tiene brazos/piernas de una sola pieza (animación más tosca pero barata); R15 divide en superior/inferior/mano/pie (codos y rodillas creíbles). No mezcles nombres de ambos en un mismo rig.
- **`HumanoidRootPart`:** no se anima directamente con `Motor6D`; es el pivote de desplazamiento. Si el rig "flota" al animar, suele ser el `Humanoid` compensando un pivote descentrado.
- **`Animator` + `Animation` + `AnimationTrack`:** el `Animation` es el clip; al reproducirlo en el `Animator` obtienes un `AnimationTrack` controlable (peso, velocidad, fade). El track busca articulaciones por nombre: un nombre mal escrito = miembro inmóvil sin error visible.
- **`Bone` y `SkinnedMesh`:** permiten doblado suave pero son más frágiles al escalado y al renombrado. Un hueso renombrado tras pesar la malla rompe la deformación.
- **Escalado:** escala posiciones y offsets proporcionalmente. Escalar solo las partes sin tocar `C0`/`C1` separa el rig.
- **`Accessory` y rigs:** los accesorios suelen soldarse a la cabeza o torso; si el punto de soldadura depende de un hueso renombrado, el sombrero sale volando.

Ejemplo ilustrativo (auditoría de rig, no código final):

```luau
-- Ilustrativo: verifica que cada Motor6D tenga Part0/Part1 y nombres esperados.
for _, d in ipairs(rigModelo:GetDescendants()) do
	if d:IsA("Motor6D") then
		assert(d.Part0 ~= nil and d.Part1 ~= nil, "Motor6D sin extremos: " .. d.Name)
		print(d.Name, "une", d.Part0.Name, "->", d.Part1.Name)
	end
end
```

## Buenas prácticas

- Un `Motor6D` por articulación, ni cero ni dos.
- Pose neutra versionada: cualquier cambio de `C0`/`C1` base se comunica a animación y código.
- Nombres canónicos; el cliente propone un rig custom, el servidor valida que los nombres/huesos coincidan con la lista permitida antes de aceptar animaciones o escalas de ese jugador.
- Prefiere R15 estándar salvo razón medida (rendimiento o estilo); lo custom multiplica el trabajo de animación.
- Valida el rig con un `AnimationTrack` de prueba (brazos arriba) antes de producir 20 clips.
- Documenta qué partes son visuales y cuáles colisionan: el rig visual no debe definir la física.

## Errores frecuentes

1. **Dos `Motor6D` en el mismo cuello:** compiten y la cabeza vibra. Deja uno.
2. **`Part0`/`Part1` invertidos:** el codo dobla hacia atrás. Revisa padre → hijo.
3. **`Animator` fuera del `Humanoid` o duplicado:** los tracks no se reproducen o se duplican. Un solo `Animator` dentro del `Humanoid`.
4. **Nombres no estándar:** el clip de R15 no mueve nada porque tu brazo se llama `BrazoMolon`. Renombra al estándar o re-mapea.
5. **Escalar a mano parte por parte:** separa `C0`/`C1`. Usa el flujo de escalado del `Humanoid`/`HumanoidDescription` o un script que escale offsets.
6. **Pesos de `Bone` al 100% en un hueso vecino:** el hombro se estira como chicle al levantar el brazo. Revisa pesos en la malla.
7. **`Accessory` soldado al hueso equivocado:** sombrero que sigue a la mano. Re-solda al punto documentado.

## Criterios de calidad y terminado

- [ ] Jerarquía padre→hijo completa sin `Motor6D` huérfanos ni duplicados.
- [ ] Pose neutra con `C0`/`C1` registrados y reproducibles.
- [ ] Clip de prueba mueve cada articulación principal sin error silencioso.
- [ ] Escala min/max sin separaciones ni estiramientos.
- [ ] `Animator` único dentro de `Humanoid`; tracks de prueba con peso y fade correctos.
- [ ] Si hay `SkinnedMesh`: sin vértices perdidos al doblar codos/rodillas al máximo.
- [ ] Documento de nombres entregado a animación y código.

## Herramientas

- Vista de jerarquía del editor + plugin de rig de la plataforma para crear `Motor6D`.
- Script de auditoría (ejemplo de arriba) que lista `Motor6D` sin extremos.
- Clip de prueba estándar (brazos arriba, sentadilla, giro de cabeza).
- Comparador R6/R15 para decidir migraciones.

## Limitaciones

- No cubre animación facial avanzada ni `IKControl` en tiempo real más allá de lo estructural (el IK se trata en locomoción/combate).
- No optimiza mallas ni presupuestos de huesos para móvil.
- No sustituye al ciclo de vida de `roblox-characters` (respawn, streaming).
- Cualquier API fuera de la lista estable: "(verificar en create.roblox.com/docs)".
