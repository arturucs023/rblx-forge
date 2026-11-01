# RBLX Forge — registro de pruebas

Niveles: IMPLEMENTADO / CONFIGURADO / DETECTADO / CONECTADO / PROBADO / PENDIENTE.

## Prueba de aceptación OpenCode 1–8 (2026-11-01) — PROBADO

Script: `scripts/acceptance-opencode.js` (servidor propio en 28981, modelo
gratuito `opencode/mimo-v2.6-flash-free`, limpieza con taskkill /T + verificación
de puerto y proceso). Resultado TODO OK:
1. detecta (`where opencode`, v2.2.4); 2. conecta (Basic auth con password de
stdout); 3. crea sesión; 4. envía prompt; 5. streaming SSE (37 eventos) +
respuesta "OK"; 6. historial (3 mensajes); 7. permisos (0 pendientes) + interrupt;
8. sesión eliminada, puerto cerrado, sin huérfanos.
Hallazgos aplicados al producto: auth Basic obligatoria, unwrap `{data}`,
`Model.Ref={id,providerID}`, mensajes con `content[]` (no `parts`).
Permiso aprobar/rechazar en vivo: PENDIENTE (requiere tarea que lo dispare;
 UI cableada y compilada).

## FASE 0 (2026-11-01) — PROBADO

- Prerrequisitos: Rust 1.96 MSVC, link.exe (VS BuildTools 18), WebView2 156,
  Node 22, npm 11. CoinGame intacto en Studio (CoinConfig + Remotes).
- API OpenCode v2.2.4: 138 rutas; contratos de sesión/prompt/eventos/permisos/
  PTY/modelos verificados campo a campo (docs-openapi-2.2.4.json).
- `opencode serve --hostname --port` verificado en `--help`.

## FASE 1 (2026-11-01) — en curso

- [x] Scaffold `create-tauri-app@4.7.5` (react-ts, Tauri 2). PROBADO
- [x] `npm install` (27+13 paquetes, 0 vulnerabilidades). PROBADO
- [x] `npm run build` (tsc + vite, 30 módulos). PROBADO
- [x] `cargo check` backend (ureq, tauri-plugin-log, log). PROBADO
- [x] `npm run tauri build` (exe + MSI + NSIS). PROBADO (2.94 MiB / 2.11 MiB)
- [x] Autenticación real descubierta: `server password` + Basic
  `base64("opencode:"+pw)` (tráfico del CLI inspeccionado). IMPLEMENTADO
- [x] Backend: captura de password, health con auth, SSE por fetch en cliente.
  `cargo test` 5/5. PROBADO
- [ ] Humo del .exe en Windows: arranca y se mantiene 15 s, cierre limpio. PROBADO (pid verificado, kill limpio)
- [x] Sesión real + streaming: ver Prueba de aceptación 1–8. PROBADO
- [ ] Clics reales en la UI (Nueva sesión, Enviar, Aprobar/Rechazar permiso).
  PENDIENTE manual: abrir la app, Conectar OpenCode, Asistente → + Nueva →
  enviar "di OK" → verificar stream → provocar un permiso (pedir crear archivo)
  → Aprobar → comprobar archivo. Sin esto no se declara FASE 3.

## FASE 2 (2026-11-01)

- [x] Backend: 21 comandos (proyectos, fs con raíz blindada, Rojo).
  `cargo test` 5/5 con FS temporal real (CRUD, plantillas, traversal bloqueado,
  salvaguardas). PROBADO. Bug real encontrado y corregido por los tests
  (plantillas se escribían en el padre).
- [x] Frontend: Proyectos (crear/importar/favoritos/buscar/eliminar con
  confirmación), Explorador (árbol, vista previa, crear/renombrar/eliminar,
  búsqueda), sesiones vinculadas por directorio. `npm run build` OK. PROBADO
  (compilación).
- [ ] E2E UI con clics reales. PENDIENTE (manual; checklist en informe).

## Build final con fix de conexión (2026-11-01) — PROBADO

- Instalador: MSI 3.15 MiB + NSIS 2.29 MiB. Humo del exe: 15 s vivo, kill limpio.
- Limpieza de sondas: proxy node y servidores de prueba eliminados
  (verificados por pid/hora/puerto); servicio global 28894 intacto.

## Modelos por sesión (2026-11-01) — PROBADO

- `GET /api/model` (58 modelos), `GET /api/model/default`, `GET session`
  (incluye `model` tras cambio), `POST .../model` con round-trip verificado
  (script `probe-models.js`: switch aplicado y reflejado).
- UI: insignia de modelo activo + selector agrupado por proveedor con coste;
  per-session switch; sin filtro por plan (lo gestiona OpenCode).

- `npm run build` (tsc + vite, 63 módulos) y `cargo test` 11/11 en verde.
- Instalador: MSI 3.14 MiB + NSIS 2.28 MiB + exe generados sin errores.
- Humo del exe final: 15 s vivo, kill limpio, sin rastro.
- Mecanismo `rojo serve` verificado aparte (escucha en puerto, kill limpio).

- Rust: `cargo test` 11/11 (CRUD, traversal, plantillas, toolchain real,
  stylua/selene reales, rojo build/tree reales, watcher real). El test PTY
  usa watchdog 25 s: en sesiones sin estación de ventana se omite con nota
  (FORGE_REQUIRE_PTY=1 lo exige). PROBADO.
- Frontend: `npm run test` 9/9 (diff, parsers con fixtures reales, feed).
  `npm run build` OK. PROBADO.
- Terminal/actividad/watcher/diff/toolchain/Studio-MCP/Rojo-serve/build/tree/
  editor/biblioteca/testing/viewport: implementados contra APIs y binarios
  reales; compilación + tests unitarios en verde.
- PENDIENTE manual (sin simular): clics E2E en la app; terminal en sesión
  interactiva; permiso aprobar/rechazar en vivo; `rojo serve` + plugin con
  proyecto real; TestEZ con runner; MSI en máquina limpia.

## FASE 9 Skill Evaluation Engine (2026-11-01) — PROBADO

- Rust: `cargo test` 25/25 (registro/duplicados/renombres, estático A-D+T,
  crossrefs, 30 benchmarks con distribución y pesos, grupos, tmp guard,
  migrate/run/snapshot/prune en SQLite real en memoria).
- Frontend: `npm run test` 20/20 (scoring honesto, autoVerdict, heurística Lua,
  contratos de tipos). `npm run build` OK.
- E2E `rblx-forge/scripts/eval-acceptance.cjs`: TODO OK contra servidor propio
  (puerto 28982, v2.2.4, pid propio eliminado; global 28894 intacto): 148 skills,
  sesión en tmpdir con copias, prompt de benchmark real, respuesta del modelo,
  .luau generados solo en tmpdir, hash de originales idéntico, permisos OK,
  puerto liberado y tmp eliminado.
- Observación honesta: el servidor rechazó `skills:[{id}]` con ID no registrado
  en ese directorio; el runner reintenta sin skills y lo registra (ver
  `docs/EVALUATION.md`, Limitaciones).

## FASE 10 Multi-Agent Orchestrator (2026-11-01) — TESTEADO, E2E COMPLETO

- Rust: `cargo test` 36/36 (8 nuevos: DAG/ciclos/ready/transiciones/permisos/
  herencia de modelo/ranking/conflictos/seed de 10 perfiles).
- Frontend: `npm run build` y `npm run test` en verde (29 con modelos).
- E2E `rblx-forge/scripts/orch-acceptance.cjs`: **TODO OK** contra servidor
  propio con el modelo default real: 10 perfiles + 36 skill IDs en disco,
  arquitecto 12k chars, dev generó 6 .luau en el tmpdir, **selene vendoreado
  detectó un parse_error real** y el revisor QA devolvió **verdict=REJECT con
  1 issue** (el bucle de revisión funciona de verdad). Originales intactos,
  puerto liberado y tmp eliminado.
- Lecciones verificadas: los gratuitos `mimo/glm/deepseek-free` no respondían
  (solo el default sí); pasar el modelo explícito funciona. El prompt debe
  llevar la **ruta absoluta** del ámbito o el modelo escribe fuera (observado:
  un write a `Temp/src/...`; corregido).
