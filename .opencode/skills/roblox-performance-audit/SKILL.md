---
name: Auditoría de Rendimiento Roblox
description: Diagnostica y corrige problemas de rendimiento con profilers y análisis de escena. Úsala cuando el juego lagee, dé tirones, caiga FPS, crashee en móvil o antes de optimizar código caliente.
---

# roblox-performance-audit

Optimización basada en evidencia: mide primero, corrige después, vuelve a
medir. Complementarias: `roblox-performance`, `roblox-testing`,
`roblox-physics`, `roblox-mobile-playtest`. Requiere un peer en ejecución
(`server`/`client-N`).

## Objetivo

Atribuir el coste de frame (script / física / render / red), encontrar los
peores ofensores, corregir con el cambio mínimo eficaz y demostrar la mejora.

## Alcance y límites

- Cubre: diagnóstico con profilers, lectura correcta de métricas, orden de
  corrección, re-medición y gate móvil.
- NO implementa sistemas ni diseña gameplay (eso es de las skills de sistemas).
- NO sustituye a `roblox-performance` como referencia de técnicas; esta skill
  es el procedimiento de auditoría de principio a fin.

## Casos de uso

- Lag, tirones, FPS bajos o crasheos en móvil sin causa clara.
- Revisión pre-release de rendimiento.
- Sospecha de script caliente, overdraw, física o replicación costosa.

## Proceso paso a paso

1. **Baseline.** En un playtest, captura en el peer afectado:
   `capture_script_profiler` (hotspots Luau), `capture_micro_profiler`
   (`focus: script/physics/render/network`), `get_scene_analysis`
   (`mode: all`, `topN: 20`), `get_memory_breakdown`. Anota números.
2. **Lee bien.** Las filas del profiler son inclusivas/acumuladas: nunca las
   sumes como totales disjuntos. Compara `total_us`/coste propio, no solo
   conteo de llamadas.
3. **Corrige en este orden** (lo barato primero):
   - Conteo de partes/instancias: reutiliza, criba decoración lejana, ajusta
     `StreamingEnabled` antes de borrar a lo bruto; tope de 2048 studs por `BasePart`.
   - Luau por frame: mueve trabajo a eventos, cachea `WaitForChild`, evita
     asignaciones en bucles calientes, desconecta conexiones sin uso.
   - Replicación: menos remotes y más ligeros, evita tablas grandes, rate-limit cliente→servidor.
   - Render: shadow map solo donde aporte, limita partes con `CastShadow`, vigila
     overdraw por transparencias/VFX apilados, comprime audio.
   - Física: ancla escenografía estática, reduce assemblies sin anclar, revisa
     churn de network ownership en vehículos.
4. **Re-mide** con las mismas capturas; informa antes/después por métrica.
5. **Gate móvil.** `capture_device_matrix` en preset bajo + perfil de red `poor`;
   el juego debe seguir jugable, no solo rápido en escritorio.

## Conocimientos técnicos

- Filas inclusivas vs exclusivas del profiler; `total_us` como métrica reina.
- `StreamingEnabled`, budgets de memoria por categoría, coste de replicación.

## Buenas prácticas

- Ningún cambio sin baseline previo del mismo escenario.
- Un solo cambio cada vez; si hay varios sospechosos, el top offender primero.
- Repite la medición con la misma configuración de captura.

## Errores frecuentes

- Optimizar sin perfil (reescribir código frío).
- Sumar filas inclusivas y "encontrar" un 300% de coste de frame.
- Probar solo en Studio de escritorio y fallar en teléfonos.

## Criterios de calidad y terminado

- [ ] Baseline y después anotados para script/render/física/memoria.
- [ ] Peor ofensor corregido; delta medido con la misma configuración.
- [ ] Preset móvil + red pobre sigue jugable.
- Verificación: mismas llamadas `capture_*` antes y después; cita ambos
  resultados. Ninguna afirmación de "más rápido" sin números.

## Herramientas

- MCP: `capture_script_profiler`, `capture_micro_profiler`,
  `get_scene_analysis`, `get_memory_breakdown`, `capture_device_matrix`,
  `get_runtime_logs` para errores relacionados.

## Limitaciones

- No corrige cuellos de botella del motor ni del dispositivo; documenta el
  mínimo hardware viable si el juego no llega.
- Requiere playtest con peers reales; sin ellos solo hay revisión estática.

## Ejemplo: evento en vez de polling

```lua
-- ANTES (bucle caliente): 60 chequeos/seg para siempre
task.spawn(function()
	while true do
		for _, coin in CoinsFolder:GetChildren() do annonse(coin) end
		task.wait(1 / 60)
	end
end)

-- DESPUÉS (dirigido por eventos): coste cero en idle
CoinsFolder.ChildAdded:Connect(registerCoin)
CoinsFolder.ChildRemoved:Connect(unregisterCoin)
```
