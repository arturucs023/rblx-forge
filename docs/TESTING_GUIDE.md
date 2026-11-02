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

## Verificación del Asistente (2026-11-02)

- `npm run build` (tsc + vite) OK; `vitest run` 12 ficheros / 46 tests OK,
  incluyendo `chat/text`, `chat/models` y `opencode` (contrato type/role).
- `scripts/probe-attach.cjs` y `probe-attach2.cjs` contra servidor OpenCode
  propio: `files:[{uri:'file://…'}]` → 200; el modelo leyó el contenido real
  del adjunto (palabra aleatoria verificada); forma de tool parts y tiempos
  `ran/completed` confirmados. Sin Studio: la comprobación visual en la app
  queda pendiente de revisión manual.

## Verificación skills propias + selector + uso GO (2026-11-02)

- `src/lib/chat/skills.ts` (+`skills.test.ts`): catálogo id:desc desde
  `eval_list_skills` (solo registro propio), preámbulo de exclusividad,
  matching por id/nombre, validación contra registro, topes
  (catálogo 35k chars, 3 extractos de 6k con tope 18k). `sendPrompt` inyecta
  el catálogo en el primer mensaje de cada sesión y adjunta extractos +
  `skills[]` validados (fallback a texto plano si el servidor rechaza).
- `vitest run` 14 ficheros / 63 tests OK; `npm run build` (tsc + vite) OK.
- `GET /api/experimental/usage/limits` verificado 200 contra servidor propio
  temporal (puerto 28991, sin tocar el 28894): `data:null` sin firmar.
  UI en Configuración con auto-refresh silencioso cada 5 s.
- Visual en app (desplegable hacia arriba, acordeón por proveedor, flyout de
  variantes al hover, pill 📚): pendiente de revisión manual en la app.

## Verificación tema DESIGN.md + modo Imágenes (2026-11-02)

- `src/index.css`: `@theme` con valores literales del manifiesto
  (`docs/APP_THEME.md` documenta la tabla); `tsc + vite` OK.
- `src-tauri/src/images.rs`: validación/parseo/sniff puros con 4 tests
  (`cargo test` 43/43). Contrato REST verificado en docs oficiales
  (envelope `{result:{image},success,errors}`, steps máx 8, 10k Neurons/día
  gratis). `vitest` 68/68 (15 ficheros, incluye `images.test.ts`).
- Generación extremo a extremo: VERIFICADA por el usuario con credenciales
  propias (el 401 inicial era token mal copiado; el diagnóstico lo identificó).
- Pegado de imágenes y coste (`images_save_upload`, `extract_usage_note`,
  chips `[Image N]`): `vitest` 72/72, `cargo test` 45/45, `npm run build` OK.
- Selector multi-modelo + Google (Interactions API, `google_check_key`,
  calibración con medición real 173 N): `vitest` 74/74, `cargo test` 48/48,
  `npm run build` OK. Generación Google extremo a extremo: PENDIENTE de clave
  del usuario (contrato de la Interactions API verificado en docs oficiales).
