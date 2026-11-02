# RBLX Forge — Arquitectura (FASE 0–8)

Fecha: 2026-11-01. Stack: Tauri 2 + React 19 + TS + Vite + Zustand + Tailwind
+ Monaco + xterm.js; Rust (ureq, portable-pty, notify, base64, log, serde).
OpenCode v2.2.4 (`docs-openapi-2.2.4.json`, 138 rutas). Prerrequisitos de la
máquina: Rust 1.96 MSVC, link.exe (VS BuildTools 18), WebView2 156, Node 22.

## Módulos por fase

- F1: shell, navegación, estado, logs, ciclo OpenCode, Asistente.
- F2: proyectos, explorador FS blindado, sesiones por directorio, Rojo detect.
- F3: terminal PTY (`terminal.rs` + xterm), actividad en vivo (`activity.ts`,
  taxonomía real de eventos), watcher (`notify` → `forge:fs-changed`),
  diff (`diff.ts`), toolchain (`toolchain_status`).
- F4: estado Studio/MCP, `rojo serve/build/tree`, jerarquía Rojo (no live).
- F5: Monaco + `tool_run` (stylua/selene) + `diagnostics.ts` + puente Asistente.
- F6: galería sobre `references/` + índice derivado + favoritos.
- F7: `project_lint` + centro con historial; TestEZ/multi solo declarados.
- F8: comparador de capturas, release interna, pulido base (chunk warning
  documentado; code-splitting pendiente).

## Principio rector

ForgeGUI = interfaz + proyectos + UX. OpenCode = inteligencia + agentes +
herramientas + ejecución. Roblox Studio MCP = mundo real. Rojo = sincronización.
Ninguna IA fuera de OpenCode salvo el modo Imágenes: Cloudflare Workers AI
(FLUX.1 schnell) o Google Gemini (Nano Banana) con claves aportadas por el
usuario en Configuración, usadas solo contra sus APIs y jamás registradas en
logs. Ninguna otra API key de proveedores en la app.

## Capas y procesos

```text
WebView (React+TS) ──invoke──▶ Tauri core (Rust)
       │                              │  spawn/health-check/kill
       │                              ▼
       │                     opencode serve 127.0.0.1:<puerto>
       │                              │  HTTP + SSE (contratos OpenAPI reales)
       └──── fetch/SSE directo ───────┘  (solo loopback, capability fijada)
```

- **Rust** posee: ciclo de vida del servidor (`serve --hostname 127.0.0.1
  --port <efímero>` + `GET /api/info` como health-check + kill al salir),
  configuración persistente, operaciones fs allowlistadas, logs estructurados
  (`tracing`), reachable check del binario `opencode`.
- **Frontend** posee: navegación, estado (Zustand por módulo), chat/SSE,
  visores. SSE vía `EventSource`/fetch directo a loopback — estándar y visible
  en `webview` capabilities.
- **Nada destructivo sin autorización**: los permisos de OpenCode se aprueban o
  rechazan en la UI (`.../permission` + `.../reply`); la app nunca auto-aprueba.

## Datos

- Proyecto RBLX = carpeta con `forge.project.json` (nombre, directorio de
  trabajo, sesión OpenCode activa, ajustes MCP/Rojo). Sesiones OpenCode por
  proyecto (`POST /api/session` con `location` = directorio).
- Skills: sin duplicar ni mover; OpenCode las resuelve desde el directorio del
  proyecto (las skills instaladas en el workspace; ver recuento en Inicio).
- Logs de actividad: apéndice JSON por proyecto (`activity.log`), sin secretos.

## Riesgos FASE 0 (con mitigación)

1. `opencode serve` en puerto ocupado → puerto efímero + reintento; un solo
   servidor gestionado por la app (no tocar el background service del usuario).
2. Servidor OpenCode caído a mitad de sesión → health-check periódico +
   reconexión SSE con `cursor`/relectura de mensajes; estado visible.
3. Msbuild/link en CI ajena → irrelevante v1 (target: este Windows 11).
4. Sesiones huérfanas → `DELETE /api/session/{id}` al cerrar + kill del proceso
   `serve` al salir de la app; el background service global no se toca.
