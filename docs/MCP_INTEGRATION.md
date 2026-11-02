# Integración MCP

## Autoconfiguración (comando `mcp_ensure_roblox`)

Si el proyecto no tiene el puente `roblox-studio`, el panel Studio ofrece
**Autoconfigurar MCP**: escribe `.opencode/opencode.json` fusionando solo la
entrada `roblox-studio` (`npx -y @chrrxs/robloxstudio-mcp@latest
--auto-install-plugin`, comando recomendado de las releases) sin tocar el
resto. Si el JSON existe y no parsea, no lo toca (error explícito). Avisa si
no hay `npx` (instalar Node.js LTS). Después: crear una sesión nueva del
proyecto para que OpenCode cargue el MCP y recomprobar aquí.

## Plugin de Studio (manual, obligatorio)

1. Ve a https://github.com/Chrrxs/robloxstudio-mcp/releases y descarga el
   `MCPPlugin.rbxmx` de la última release (o usa `--auto-install-plugin`,
   que lo instala solo la primera vez).
2. En Roblox Studio: pestaña **Plugins → carpeta de plugins** y pega el
   `.rbxmx` ahí.
3. Cierra y reabre Studio **del todo**.
4. En Studio: **Assistant → ⋯ → Manage MCP Servers** → activar servidor (una
   vez por instalación) + indicador verde de cliente conectado.

## Servidores (`opencode mcp list`, 2026-11-01: 3 connected)

| Servidor | Alcance | Comando | Uso |
|---|---|---|---|
| `Roblox_Studio` | proyecto (`.opencode/opencode.json`) | `cmd.exe /c %LOCALAPPDATA%\Roblox\mcp.bat` | MCP oficial integrado en Studio |
| `roblox-studio` | global preexistente | `npx @chrrxs/robloxstudio-mcp` | Puente Chrrxs (48 herramientas: playtests, input real, profilers) |
| `rea` | global preexistente | ingeniería inversa | fuera del alcance Roblox |

## Capacidades probadas (2026-11-01, peer Edit, place real)

| Capacidad | Herramienta | Resultado |
|---|---|---|
| Leer árbol | `get_project_structure` | OK (CoinGame completo) |
| Leer propiedades | `get_instance_properties` | OK (incl. `Enabled=false` UI) |
| Crear objetos | `execute_luau` (Instance.new) | OK (`MCPProbe_TMP`, luego eliminada) |
| Modificar propiedades | `set_properties` | OK (rename reverificado) |
| Editar scripts | `set_script_source` + `get_script_source` | OK (write + readback idénticos) |
| Ejecutar Luau | `execute_luau` solo lectura | OK (`coins=0` en Edit) |
| Consultar errores | `get_runtime_logs` | OK (tail + cursor; 0 errores Coin) |
| Capturas | `capture_screenshot` | OK (1497×830 inspeccionada) |
| Playtest + runtime | `solo_playtest`, `eval_server/client_runtime` | OK en sesión anterior (recogida real, anti-exploit, HUD) |

## Pendiente de intervención manual

1. En Studio: **Assistant → ⋯ → Manage MCP Servers → activar servidor** (una vez
   por instalación de Studio).
2. Indicador verde de cliente conectado en el mismo panel.
3. Plugin Rojo en Studio para `rojo serve` (ver `docs/TOOLCHAIN.md`).

## Reglas

- `studio_id` explícito si hay >1 ventana. Nunca asumir peer.
- `"success": true` no es verificación: cada afirmación exige relectura, valor
  runtime, log o imagen inspeccionada.
- UI de jugador: solo runtime (`PlayerGui`), plantilla Edit deshabilitada.
- Limpieza obligatoria: detener playtests propios, verificar `idle`.
