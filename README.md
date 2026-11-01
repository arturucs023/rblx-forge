# RBLX Forge — Entorno profesional de desarrollo Roblox con OpenCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-148-blue)](docs/SKILLS_CATALOG.md)
[![OpenCode](https://img.shields.io/badge/AI-OpenCode%20only-green)](rblx-forge/)

Entorno de código abierto para crear videojuegos de Roblox de forma profesional:
**148 skills especializadas**, app de escritorio propia (**RBLX Forge**), toolchain
verificada y biblioteca de referencias visuales. Todo con un único motor de IA:
[OpenCode](https://opencode.ai). Sin APIs de OpenAI, Anthropic ni Gemini. Sin
keys en el repo.

> English: open-source professional environment for Roblox game development —
> 148 specialized AI skills, a Tauri desktop app, verified toolchain and a
> visual reference library, all powered exclusively by OpenCode.

## Contenido

- [Qué incluye](#qué-incluye)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Biblioteca de skills](#biblioteca-de-skills-148)
- [RBLX Forge (app de escritorio)](#rblx-forge-app-de-escritorio)
- [MCP de Roblox Studio](#mcp-de-roblox-studio)
- [Toolchain](#toolchain)
- [Biblioteca visual](#biblioteca-visual)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Calidad y verificación](#calidad-y-verificación)
- [Estado y roadmap](#estado-y-roadmap)
- [Contribuir](#contribuir)
- [Licencia y terceros](#licencia-y-terceros)

## Qué incluye

| Pieza | Descripción |
|---|---|
| Biblioteca de skills | 148 skills: 61 instaladas de 5 colecciones + 87 propias organizadas en 12 disciplinas |
| RBLX Forge | App de escritorio (Tauri 2 + React + Rust): proyectos, editor Luau, terminal, asistente OpenCode con streaming y permisos, biblioteca visual, testing |
| Skill Evaluation Engine | Registro de 148 skills, análisis estático, perfil técnico, 30 benchmarks con runner OpenCode real aislado, scoring honesto, regresión y comparador (ver `rblx-forge/docs/EVALUATION.md`) |
| Toolchain vendoreada | Rojo, StyLua, Selene, Wally + TestEZ, todo dentro del repo |
| Referencias visuales | 16 imágenes verificadas con licencia y atribución |
| Docs | Arquitectura, catálogo, guía de estilo, dirección de arte, MCP, toolchain, testing, seguridad, workflow |

## Requisitos

- Windows 11 (principal), [Roblox Studio](https://create.roblox.com/) actualizado
- [Node.js 22+](https://nodejs.org/) (para `npx`) y [OpenCode](https://opencode.ai) instalado
- Rust 1.96+ y WebView2 solo para compilar la app desde fuente (el instalador no los necesita)

## Inicio rápido

```powershell
git clone https://github.com/arturucs023/rblx-forge.git
cd rblx-forge

# 1. Ver las skills instaladas a nivel proyecto
npx skills list

# 2. Toolchain (binarios ya incluidos, sin instalación global)
tools/bin/rojo/rojo.exe --version
tools/bin/wally/wally.exe install

# 3. Conectar OpenCode con Roblox Studio (una vez, en Studio):
#    Assistant → ⋯ → Manage MCP Servers → activar "Enable Studio as MCP server"
opencode mcp list        # debe mostrar Roblox_Studio + roblox-studio conectados

# 4. App de escritorio (modo desarrollo)
cd rblx-forge
npm install
npm run tauri dev
# Instalador: npm run tauri build  (genera .msi y setup .exe)
```

Flujo recomendado por juego: PRD → arquitectura → dirección artística →
construcción → QA → 3 auditorías → release → LiveOps. Ver
[`docs/PROJECT_WORKFLOW.md`](docs/PROJECT_WORKFLOW.md).

## Biblioteca de skills (148)

61 instaladas (alcance proyecto, gestionadas con `npx skills`) + 87 propias
(en `.opencode/skills/`, con precedencia y formato unificado).

| Origen | Skills | Notas |
|---|---|---|
| `nonlooped/roblox-suite` | 16 | Arquitectura, networking, DataStores, UI, NPCs, física, testing, MCP, Rojo… |
| `luumenlabs/luau-skills` | 6 | Luau, tipos, rendimiento, APIs, OAuth, Open Cloud |
| `el4cteo/roblox-skills` | 12 | Mundos, UI, sistemas, seguridad, rendimiento, chat, input, matchmaking, monetización, tooling… |
| `ashexplained/roblox-skills` | 22 | Level design, combate, economía, quests, géneros, social, policy, publishing, a11y, to-issues… |
| `gamedev-skills/awesome-gamedev-agent-skills` | 5 | proc-gen, personajes, workflow Studio, diálogos, cámaras |
| Propias (12 disciplinas) | 79+8 | UI (16) · arte/entornos (10) · construcción (5) · personajes/animación (11) · gameplay (10) · géneros (6) · audio (5) · multijugador (5) · economía (1) · programación (5) · tooling (2) · testing (3) + 8 de arquitectura/auditoría/dirección |

Catálogo completo con descripciones y solapamientos: [`docs/SKILLS_CATALOG.md`](docs/SKILLS_CATALOG.md).
Verificación automática: `node scripts/verify-skills.js` (IDs únicos, SKILL.md
válido, sin binarios). Generador del catálogo: `node scripts/gen-catalog.js`.

> Nota de honestidad: las skills de terceros se auditaron una por una. Las de
> `ashexplained` son finas (50-65 líneas, con referencias cruzadas a skills que
> no existen en su repo); las propias las complementan donde hacía falta. Los
> avisos de los scanners (p. ej. `roblox-tooling`) son heurísticos; no hay
> binarios en las skills. Detalles en el catálogo.

## RBLX Forge (app de escritorio)

`rblx-forge/` — Tauri 2 + React 19 + TypeScript + Rust. Identidad oscura propia,
sin cuentas ni claves (los modelos y credenciales viven en OpenCode):

- **Proyectos**: crear/abrir/importar Rojo, explorador con protección anti
  path-traversal, sesiones OpenCode aisladas por directorio.
- **Asistente IA**: sesiones, streaming real (SSE), historial, aprobar/rechazar
  permisos, **selector de modelo por sesión con coste visible** y consumo de
  tokens por mensaje y sesión.
- **Editor Luau**: Monaco, StyLua/Selene reales con diagnósticos clicables,
  diff contra disco, envío de contexto al Asistente.
- **Terminal** PTY nativa, **actividad en vivo** (herramientas, archivos, tokens,
  costes), watcher de archivos con refresco.
- **Studio/MCP**: estado de Studio y servidores MCP, Rojo serve/build/tree,
  jerarquía del proyecto Rojo (no finge lectura en vivo de Studio).
- **Biblioteca y testing**: galería de las 16 referencias, centro de pruebas
  (lint real + historial), comparador de capturas.

Ver [`rblx-forge/README.md`](rblx-forge/README.md) y
[`rblx-forge/docs/`](rblx-forge/docs/).

## MCP de Roblox Studio

- `Roblox_Studio`: MCP oficial integrado en Studio (config a nivel proyecto).
- `roblox-studio` (Chrrxs, 48 herramientas): playtests, runtime, profilers.
- Matriz de capacidades probada contra un place real (leer/crear/editar
  scripts y objetos, ejecutar Luau, logs, capturas). Detalles y pasos manuales:
  [`docs/MCP_INTEGRATION.md`](docs/MCP_INTEGRATION.md).

## Toolchain

Todo en `tools/bin/` (Windows x64, verificado con `--version`): Rojo 7.7.1 ·
StyLua 2.6.0 · Selene 0.32.0 · Wally 0.3.2 + TestEZ 0.4.1 vía `wally install`
(en `Packages/`). Sin instaladores globales. Decisiones (Aftman archivado,
Mantle sin mantener, Rokit no instalado para no tocar el sistema):
[`docs/TOOLCHAIN.md`](docs/TOOLCHAIN.md).

## Biblioteca visual

16 fotografías en `references/` (arquitectura, edificios, interiores,
iluminación, terreno, vegetación, materiales, props, vehículos), todas abiertas
con cabecera JPEG verificada, índice con fuente/autor/licencia en
[`docs/REFERENCE_LIBRARY.md`](docs/REFERENCE_LIBRARY.md). Las licencias exigen
atribución donde se indica; revísala antes de publicar un juego con ellas.

## Estructura del repositorio

```text
.agents/skills/        61 skills instaladas (npx skills, alcance proyecto)
.opencode/skills/     87 skills propias (precedencia OpenCode)
docs/                 11 documentos (arquitectura, catálogo, MCP, toolchain…)
rblx-forge/           App Tauri (src/, src-tauri/, scripts/, docs/)
tools/bin/            Rojo, StyLua, Selene, Wally (ejecutables Windows)
references/           16 imágenes con licencia
scripts/              verify-skills.js, gen-catalog.js
Packages/             TestEZ (vía Wally)
default.project.json, wally.toml, selene.toml, stylua.toml, skills-lock.json
```

## Calidad y verificación

- `node scripts/verify-skills.js` → 0 duplicados, 0 SKILL.md ausentes, 0 binarios.
- Rust: `cargo test` 12–13/12–13 según módulo (`--manifest-path rblx-forge/src-tauri/Cargo.toml`).
- Frontend: `npm run build` (tsc + vite) y `npm run test` (vitest) en `rblx-forge/`.
- El Asistente muestra errores exactos con botón de copiar en vez de pantallas en negro.
- `CoinGame` y la configuración global de OpenCode no se tocan en ninguna prueba.

## Estado y roadmap

- ✅ Biblioteca de 148 skills verificada · ✅ Toolchain vendoreado ·
  ✅ App con instalador MSI/NSIS · ✅ MCP verificado contra Studio ·
  ✅ Aceptación OpenCode 1–8 (detección, conexión con auth, sesión, streaming,
  historial, permisos, cierre sin huérfanos).
- Pendiente (declarado, no simulado): TestEZ con runner en Studio, multijugador
  con Studio abierto, MSI en máquina limpia, iconos/CSP finales. Ver
  [`rblx-forge/docs/ROADMAP.md`](rblx-forge/docs/ROADMAP.md) y
  [`CHANGELOG.md`](CHANGELOG.md).

## Contribuir

1. Abre un issue describiendo la skill, herramienta o mejora (qué cubre y qué
   no, para evitar duplicados: consulta primero `docs/SKILLS_CATALOG.md`).
2. Las skills propias siguen la plantilla de
   `.opencode/skills/roblox-project-architect/SKILL.md`: frontmatter con
   `name`/`description` accionable, proceso numerado, criterios verificables,
   diferenciación explícita y cero APIs inventadas.
3. Ejecuta `node scripts/verify-skills.js` antes de cada PR.
4. No incluyas binarios, credenciales ni datos personales. Respeta las
   licencias de terceros (ver `LICENSE`).

## Licencia y terceros

- Código propio y skills originales: [MIT](LICENSE).
- Skills de terceros conservan su licencia original: nonlooped, luumenlabs,
  el4cteo y ashexplained son MIT; gamedev-skills es Apache-2.0; TestEZ es
  Apache-2.0. Ver avisos completos en [LICENSE](LICENSE).
- Herramientas de `tools/bin` bajo MPL-2.0 (ver cada proyecto).
- Proyecto comunitario sin afiliación con Roblox Corporation. "Roblox" y sus
  logos son marcas de Roblox Corporation; este proyecto no está respaldado por ella.
