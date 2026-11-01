# Terminal integrada (FASE 3A)

## Implementación

Backend: `src-tauri/src/terminal.rs` — PTY nativa vía `portable-pty`
(ConPTY en Windows). Comandos: `pty_create {cwd, rows?, cols?}`,
`pty_write {id, data}`, `pty_resize`, `pty_close`, `pty_list`, `pty_scrollback`.
Salida por eventos `forge:pty-output {id, data}`, fin con `forge:pty-exit`.
Frontend: `Terminal.tsx` (xterm.js + FitAddon), una sesión por montaje,
cierre limpio al desmontar/cerrar pestaña.

Shell por defecto: PowerShell (`-NoLogo`), cwd = proyecto activo
(o workspace si no hay proyecto). Solo se ejecuta lo que el usuario escribe:
ningún comando automático.

## Verificación

- Test Rust `pty_nativo_ejecuta_powershell`: mecanismo real con EOF.
- Límite conocido: ConPTY exige estación de ventana interactiva. En sesiones
  no interactivas (como este sandbox) el test se omite con nota tras 25 s
  (`FORGE_REQUIRE_PTY=1` lo convierte en fallo para CI con GUI).
- UI manual pendiente: abrir Terminal, escribir `echo hola`, redimensionar,
  cerrar (checklist en informe final).

## No implementado

PTY de OpenCode (`/api/pty`) no se usa: la terminal de Forge es del proyecto,
no del agente. Multiplexado con scrollback persistente entre pestañas: solo
últimos 200 KB por sesión en memoria.
