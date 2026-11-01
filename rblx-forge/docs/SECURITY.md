# Seguridad (aplica a todo Forge)

1. **Mínimo privilegio**: el backend solo expone comandos allowlistados
   (21 proyecto/fs/Rojo + OpenCode + PTY + settings). Sin shell genérico.
2. **Rutas**: todo acceso a disco pasa por `resolve_in_root` (canonicaliza,
   rechaza absolutos/prefijos, resuelve `..`/symlinks, exige contención).
   Probado con `../fuera` y `C:/Windows` (tests en verde).
3. **Procesos**: OpenCode, Rojo y PTY son hijos gestionados (kill al cerrar,
   `taskkill /T` en pruebas). Nunca se toca el background service global ni
   procesos ajenos (verificación por puerto+pid+start time antes de matar).
4. **Sin secretos**: password de `serve` solo en memoria (nunca en settings ni
   disco); sin API keys de proveedores en la app; logs sin secretos (salidas
   truncadas a 300–800 chars).
5. **Destructivo con confirmación**: borrado de proyectos (doble: checkbox +
   `forge.project.json` obligatorio), borrado de archivos (confirm), `git init`
   opt-in.
6. **Permisos OpenCode**: aprobar/rechazar explícitos en UI; sin auto-aprobación.
7. **Dependencias**: `npm audit` conocido — dompurify crítico transitivo de
   monaco (sin `audit fix --force` para no romper monaco 0.57; la app no
   renderiza HTML no confiable). Reevaluar con cada upgrade.
8. **Red**: solo loopback (127.0.0.1 + EventSource/fetch al servidor local);
   CSP pendiente de endurecer antes del instalador público (ver RELEASE.md).
