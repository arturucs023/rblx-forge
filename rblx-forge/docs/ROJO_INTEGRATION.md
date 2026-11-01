# Integración Rojo (FASE 4E + F2)

## Comandos (todos reales, probados)

- `rojo_detect` / `rojo_validate`: `default.project.json` parseado (`name` +
  `tree`), `$path` existentes verificados en disco.
- `rojo_build`: `rojo build -o game.rbxlx` con stdout/stderr/código (test Rust
  con binario vendoreado genera `.rbxlx` de verdad).
- `rojo_serve_start/stop/status`: proceso hijo gestionado, espera a puerto
  abierto (TCP), kill al detener/cerrar app. Puerto 34872+ con fallback.
- `rojo_tree`: árbol DataModel derivado de `tree` + archivos (`*.server.luau`
  → Script, `*.client.luau` → LocalScript, `*.luau` → ModuleScript).

## Sincronización

`serve` expone el proyecto; **sin el plugin Rojo en Studio no se aplica
nada**. La app lo advierte en la UI. Sin `default.project.json` válido no se
permite iniciar (error explícito, no intento ciego).

## Limitaciones

- Sin live-read del place: `rojo_tree` es "la vista que Rojo sincroniza", no
  el estado en vivo de Studio (etiquetado así en la UI).
- Playtest (`F4F`): pendiente; requiere Studio abierto + MCP + sesión de
  agente. No se simula: el panel Studio lo marca como verificación manual.
- `serve` + `build` simultáneos sobre el mismo proyecto: permitidos (distintos
  procesos), cada uno con su estado visible.
