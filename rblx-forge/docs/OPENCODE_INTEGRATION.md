# RBLX Forge — Integración OpenCode (contratos reales v2.2.4)

Fuente: `GET /openapi.json` del servidor local + `opencode serve --help`.
Nada aquí es inventado; ante una versión distinta, re-extraer el spec.

## Autenticación (descubierta 2026-11-01, verificada por inspección de tráfico)

`opencode serve` imprime `server password <pw>` y exige
`Authorization: Basic base64("opencode:"+password)` en cada petición
(incluido SSE). Sin ella: `401 UnauthorizedError`. El password es aleatorio por
arranque y vive solo en memoria: el backend lo captura de la salida del hijo y
lo entrega al frontend en `ServerStatus.password` (nunca a disco; `settings_*`
jamás lo guardan). El SSE usa fetch+lector manual porque `EventSource` no
admite cabeceras. El spec OpenAPI no documenta este esquema: consta aquí como
contrato observado v2.2.4.

## Detección del binario (bug real corregido 2026-11-01)

- El shim `npm\opencode` (sin extensión) es un script de shell: CreateProcess
  falla con ENOENT. El shim `opencode.cmd` delega en
  `node_modules/@opencode/cli/bin/opencode.exe` (ejecutable real, 259 MB).
- `where opencode` es poco fiable en algunas consolas (vacío aun con el shim
  en PATH). La app prueba `where` en 4 grafías + 6 ubicaciones conocidas y
  verifica cada candidato ejecutando `--version` (los `.cmd` vía
  `cmd /d /s /c`; preferencia al `.exe` resuelto del shim para un kill limpio).
- `DetectResult.tried` lista las rutas probadas y la UI las muestra si falla,
  junto al error (antes el fallo era silencioso).

## Modelos por sesión (verificado 2026-11-01)

- `GET /api/model` → 58 modelos con `id/modelID/providerID/name/cost[]`
  (coste USD por 1M tokens; `0/0` = gratis). `GET /api/model/default`.
- `GET /api/session/{id}` incluye `model` solo tras cambio explícito; si falta,
  rige el defecto del servidor (la UI lo indica).
- `POST /api/session/{id}/model {model:{id,providerID}}` → verificado con
  round-trip (GET posterior refleja el cambio). Sin variant = default.
- La app NO filtra por plan: muestra todos los que expone OpenCode agrupados
  por proveedor con su coste; el plan (ZEN/GO) y la facturación los gestiona
  OpenCode. Sin API keys en Forge.

## Detección y ciclo de vida

1. Localizar binario (`PATH` + ruta configurable) y `opencode --version`.
2. Spawn gestionado: `opencode serve --hostname 127.0.0.1 --port <P>` (proceso
   hijo de la app). Health: `GET /api/info` → `{version, pid, urls}`.
3. Parada: cerrar sesiones propias (`DELETE /api/session/{id}`) y terminar el
   proceso hijo. El background service del usuario jamás se detiene desde aquí.

## Sesiones y mensajes (UX mínima viable)

| Necesidad | Contrato real |
|---|---|
| Crear sesión (por proyecto) | `POST /api/session` `{title?, location?}` |
| Listar / reanudar | `GET /api/session?directory=&project=` |
| Enviar mensaje | `POST /api/session/{id}/prompt` `{text}` (text requerido) |
| Streaming | `GET /api/event` (SSE; filtrar `?types=`) |
| Historial | `GET /api/session/{id}/message?limit&order&cursor` |
| Cancelar | `POST /api/session/{id}/interrupt` |
| Cerrar | `DELETE /api/session/{id}` |
| Permisos | `GET .../permission` → `POST .../permission/{req}/reply` `{decision}` |
| Terminal | `POST /api/pty` `{command,args,cwd}` + `GET /api/pty/{id}`; `DELETE` al cerrar |
| Modelos/proveedores | `GET /api/model`, `GET /api/provider` (solo lectura; credenciales en OpenCode) |
| Salud/config | `GET /api/info`, `GET /api/config` |

## Actividad observable

Los eventos SSE exponen partes de mensaje (texto, uso de herramientas, diffs de
archivos, comandos). La UI los traduce a: archivos leídos/modificados, comandos
ejecutados, herramientas invocadas, resultados y errores. Las aprobaciones se
resuelven con `decision` = allow/deny según `Permission.Reply` del spec.

## Prohibiciones

- Sin `OPENAI_API_KEY` ni equivalentes en la app o su config.
- Sin endpoints fuera del spec versionado (`docs-openapi-2.2.4.json`).
- Sin auto-aprobación global silenciosa; sin comandos arbitrarios sin permiso.

## Formas reales observadas (v2.2.4, verificadas con tráfico)

- Casi todo va envuelto en `{data: …}` (`/api/info` no). El cliente desempaqueta.
- `POST /prompt` devuelve el mensaje usuario `{type:'user', text}`; el turno
  del asistente llega async: `{type:'assistant', content:[{type:'text'|'reasoning'|'tool', text?}]}` y cierre `{type:'idle', outcome:'succeeded'}`.
- `Model.Ref = {id, providerID, variant?}` (p. ej. `{id:'mimo-v2.6-flash-free', providerID:'opencode'}`).
- SSE: frames `data: {...}` separados por línea vacía; tipos observados:
  `server.connected`, `project.updated`, `mcp.status.changed`,
  `integration/provider/model/agent/command.updated`.
