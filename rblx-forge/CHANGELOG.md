# RBLX Forge — cambios

## 2026-11-01 — Conteo real de skills (adiós al "46" hardcodeado)

- Nuevo comando `workspace_stats`: cuenta directorios con SKILL.md en
  `.agents/skills` y `.opencode/skills` (probado con FS temporal).
- Inicio muestra el total real + desglose; Configuración permite cambiar la
  ruta del workspace (persistente, `workspace.dir`).

## 2026-11-01 — Rediseño visual de la app

- Sistema visual propio: tokens de superficie, pills de estado, botones
  unificados, micro-animaciones (fade-up), focus visible, scrollbars y
  scrollbar discretos; sidebar con iconos SVG y secciones; topbar compacta
  con pills; chat con burbujas, tarjeta de modelo y entrada elevada;
  portada de Inicio con tarjetas de estado; tablas y tarjetas con hover.
- Sin cambios funcionales: misma lógica, mismos contratos, mismos tests
  (12/12 vitest, `npm run build` OK).

## 2026-11-01 — Fix crash Asistente (Maximum update depth)

- Causa: selector de Zustand que devolvía `[]` nuevo en cada evento SSE →
  cascada de re-renders hasta el límite de React. Referencia estable
  (`EMPTY_MSGS`) + blindaje ante formas inesperadas (nulls, content no
  array) en ChatMessage/ToolRow/sessionTotals/eventToFeed.
- Frontera de error por módulo (enseña el fallo exacto + copiar + reintentar)
  en central, inspector y consola.

## 2026-11-01 — Chat limpio + consumo visible por sesión

- Eliminado el placeholder `(sin contenido de texto)`: los mensajes sin texto
  visible no se pintan (el reasoning vive en Actividad). Herramientas como
  filas compactas con estado (✓/…), sin volcar resultados al chat.
- Consumo real por mensaje (tokens in/out + coste, cuando el servidor los
  trae) y totales de la sesión en la barra de estado. Sin métricas inventadas.
- Saldo de cuenta: el API (`/api/experimental/usage/limits`) devuelve `null`
  en este servidor — no se muestra nada inventado; documentado aquí.

## 2026-11-01 — Conexión robusta + modelos por sesión + instancia única

- Fix crítico: resolución del exe real tras shim npm; `where` en 4 grafías +
  6 ubicaciones + verificación `--version`; errores visibles en UI.
- Guardia anti-doble-arranque + KillOnDrop (sin huérfanos en rutas de error);
  locks anti-pánico; plugin single-instance (foco en vez de duplicar).
- Modelos: insignia visible + selector por proveedor con coste; switch
  verificado con round-trip (58 modelos). Sin API keys.
- `cargo test` 12/12, `npm run build` OK, vitest 9/9.

- Causa: el shim `npm\opencode` sin extensión no es ejecutable (ENOENT) y
  `where` falla en algunas consolas; el fallo además era silencioso.
- Fix: resolución del `.exe` real del shim npm + prueba de 4 grafías `where`
  + 6 ubicaciones + verificación `--version` por candidato; `tried` visible
  en UI; errores de inicio/detección visibles en Inicio.
- Verificado: `cargo test` 12/12, ruta exacta de la app probada (spawn directo
  del exe + auth + kill limpio), `npm run build` OK.

## 2026-11-01 — FASES 3–8 (implementadas y probadas a nivel posible)

- FASE 3: terminal PTY nativa (ConPTY/xterm), actividad en vivo con taxonomía
  real de eventos, watcher `notify`, diff LCS, toolchain real; vitest 9/9.
- FASE 4: estado Studio/MCP vía API, Rojo serve/build/tree, jerarquía Rojo
  (etiquetada como no-en-vivo); live de Studio declarado pendiente.
- FASE 5: Monaco (lua) + stylua/selene con diagnósticos clicables + puente al
  Asistente; sin autocompletado fingido.
- FASE 6: galería sobre `references/` + índice derivado + favoritos + licencias;
  análisis IA declarado dependiente del modelo.
- FASE 7: centro de pruebas (lint real + historial); TestEZ/multi/cobertura
  pendientes explícitos.
- FASE 8: comparador de capturas; viewport 3D descartado con motivos; release
  interna (MSI/NSIS); iconos/CSP/icons pendientes.
- Rust `cargo test`: 11/11 (stylus/selene/rojo/watcher reales; PTY con
  watchdog: omitido con nota sin estación de ventana).
- Hallazgo: ConPTY no responde en sesiones no interactivas (sandbox);
  terminal real verificable solo en sesión interactiva (checklist manual).

## 2026-11-01 — FASE 1 (puerta superada) + FASE 2 (implementada y probada)

- FASE 1: instalador (MSI 2.94 MiB + NSIS 2.12 MiB), humo del .exe (15 s vivo,
  kill limpio), aceptación OpenCode 1–8 TODO OK (ver docs/TESTING.md).
  Contratos corregidos contra la realidad: auth Basic con password de `serve`,
  unwrap `{data}`, `Model.Ref={id,providerID}`, mensajes con `content[]`.
- FASE 2: 21 comandos Tauri (proyectos, fs blindado, Rojo); `cargo test` 5/5;
  frontend Proyectos+Explorador+sesiones por directorio (`npm run build` OK).
- Pendiente manual: clics reales en la UI; permiso aprobar/rechazar en vivo;
  arranque de Rojo Studio plugin / `serve`.

## 2026-11-01 — FASE 0 + FASE 1 (fundación en curso)

- FASE 0: auditoría (46 skills, toolchain, docs, CoinGame intacto), contratos
  reales OpenCode v2.2.4 (138 rutas), prerrequisitos Tauri verificados.
- Scaffold Tauri 2 + React 19 + TS + Vite 8 (`create-tauri-app@4.7.5`).
- Deps justificadas: zustand, tailwindcss (+vite). 0 vulnerabilidades.
- Backend Rust: `opencode_detect/start/stop/status`, `settings_get/set`,
  logs `forge:log`, kill del hijo al cerrar. Solo gestiona su proceso.
- Frontend: `lib/opencode.ts` (contratos reales), stores `app`/`sessions`,
  layout §4 (sidebar/topbar/central/derecho/inferior), Asistente funcional
  (sesiones, streaming, historial, permisos aprobar/rechazar).
- `npm run build` y `cargo check` OK. `tauri build` en curso.
