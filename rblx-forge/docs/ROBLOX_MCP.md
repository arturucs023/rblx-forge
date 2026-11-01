# Integración Roblox Studio MCP (FASE 4A–D)

## Estado real por capacidad

| Capacidad | Vía | Estado |
|---|---|---|
| Estado de Studio (instalado/versión/en ejecución) | `toolchain_status` (registro + `tasklist`, solo lectura) | PROBADO |
| Servidores MCP del proyecto | `GET /api/mcp?location=` (real; muestra `name`+`status`) | PROBADO (2/2 connected en workspace) |
| Última comunicación | Timestamp de cliente en cada consulta | IMPLEMENTADO |
| Jerarquía de Studio en vivo | — | PENDIENTE: requiere protocolo Studio↔Forge inexistente |
| Inspector/propiedades en vivo | — | PENDIENTE (mismo motivo) |
| Operaciones en vivo (crear/editar/leer/scripts/logs) | — | PENDIENTE (mismo motivo) |
| Capturas en vivo | — | PENDIENTE (mismo motivo) |

## Decisión documentada

Forge NO reimplementa un cliente MCP contra `StudioMCP.exe` (protocolo de
apareamiento Studio↔plugin no público; reimplementarlo sería frágil y
contrario a "priorizar herramientas oficiales"). La vía oficial es el agente
OpenCode con sus MCP (`roblox-studio` Chrrxs + `Roblox_Studio` integrado),
operables desde el Asistente. Forge aporta: estado, jerarquía del proyecto
Rojo (ver `ROJO_INTEGRATION.md`) y panel de verificación manual.

## Panel Studio (Configuración del proyecto)

Muestra MCPs reportados por OpenCode para el directorio activo con su estado
y hora de comprobación. Si el servidor no reporta un MCP esperado, se indica
("no reportado en esta ubicación", con pista: abrir sesión del proyecto) en
lugar de simularlo. Verificación con place abierto: manual, con checklist.
