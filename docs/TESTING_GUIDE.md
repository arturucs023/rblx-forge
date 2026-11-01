# Guía de pruebas

## Pirámide

1. **Estáticas** (sin Studio): `stylua --check`, `selene` sobre `src/` y
   ejemplos `.lua` de skills propias.
2. **Unidad** (requiere Studio): TestEZ vía `Packages/` + proyecto Rojo.
   Specs en `tests/` mapeados al contenedor de pruebas. Sin runner CI
   configurado → ejecución manual en Studio (pendiente, ver abajo).
3. **Integración en vivo** (puente MCP): `solo_playtest`/`multiplayer_playtest`
   + `eval_server/client_runtime` + `get_runtime_logs` + screenshots + input real.
4. **Móvil/red**: `capture_device_matrix` + `set_network_profile(poor)`.

## Matriz mínima por sistema nuevo

| Prueba | Cómo | Criterio |
|---|---|---|
| Recogida/efecto feliz | teleport o input real + `eval` | estado cambia, réplica llega |
| Ataque (remotes) | `FireServer` inválido/lejano/tipo erróneo | sin cambios |
| Respawn/recuperación | esperar ciclo + re-probar | vuelve al estado esperado |
| Regresión | re-leer vecinos + re-ejecutar su prueba | sin roturas |
| Limpieza | stop + status + Edit intacto | `idle`, plantilla deshabilitada |

## Pendiente

- Runner TestEZ ejecutable (manual en Studio o CI con `run-in-roblox`): specs
  aún no escritos; `wally install` + `Packages/TestEZ.lua` listos.
- Multi-cliente del prototipo CoinGame (2 clientes recogiendo a la vez).
