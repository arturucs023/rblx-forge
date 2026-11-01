# RBLX Forge

Entorno profesional de escritorio para desarrollar videojuegos Roblox con
**OpenCode como único motor de IA**. Sin chatbots propios. Sin API keys de
proveedores en la app.

## Estado: FASES 1–8 implementadas (2026-11-01)

- [x] FASE 0–2 — base, proyectos, Rojo detect.
- [x] FASE 3 — Terminal PTY, actividad en vivo, watcher, diff, toolchain.
- [x] FASE 4 — Estado Studio/MCP, Rojo serve/build/tree, jerarquía Rojo.
- [x] FASE 5 — Editor Monaco + StyLua/Selene + puente al Asistente.
- [x] FASE 6 — Biblioteca visual (16 refs reales, licencias, favoritos).
- [x] FASE 7 — Centro de pruebas (lint real + historial).
- [x] FASE 8 — Comparador de capturas, release interna.
- Pendiente manual: clics E2E, terminal en sesión interactiva (ConPTY),
  permiso en vivo, plugin Rojo + serve extremo a extremo, MSI en máquina limpia.

## Estructura

```text
rblx-forge/
  src/            React+TS (lib/opencode.ts, stores/, components/)
  src-tauri/      Rust (ciclo de vida OpenCode, settings, logs)
  docs/           ARCHITECTURE, OPENCODE_INTEGRATION, + esta fase
  docs-openapi-2.2.4.json   Contratos reales extraídos del servidor local
```

## Desarrollo

```powershell
npm install
npm run tauri dev     # desarrollo
npm run tauri build   # binario + instalador
```

Prerrequisitos verificados: Rust 1.96 MSVC, MSVC link.exe, WebView2 156, Node 22.
Skills Roblox: se resuelven desde el directorio del proyecto (`../.agents`,
`../.opencode/skills`); no se duplican.

## Docs

`docs/ARCHITECTURE.md` · `docs/OPENCODE_INTEGRATION.md` ·
`docs/TECHNICAL_DECISIONS.md` · `docs/TESTING.md` · `docs/USER_GUIDE.md` ·
`CHANGELOG.md`.
