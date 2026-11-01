# Registro de cambios — entorno Roblox + OpenCode

Formato: `YYYY-MM-DD — fase — cambio (estado: probado/configurado/pendiente)`.

## Publicación en GitHub (rblx-forge, repo público MIT)
- README reescrito, LICENSE MIT neutral, .gitignore, sanitización de rutas
  personales (defaults neutros configurables), identidad de commit neutral.

## 2026-11-01 — RBLX Forge FASES 3–8 (ver informe final)
- Terminal PTY, actividad en vivo, watcher, diff, toolchain: implementados y
  probados (`cargo test` 11/11, vitest 9/9). ConPTY sin estación de ventana en
  sandbox: omitido con nota + checklist manual.
- Studio/MCP: estado real vía API; jerarquía/props en vivo pendientes (sin
  protocolo). Rojo serve/build/tree reales y probados.
- Editor Monaco + StyLua/Selene + diagnósticos; sin autocompletado fingido.
- Biblioteca 16 refs reales; testing con lint real; viewport = comparador
  honesto (3D descartado con motivos). Instalador pendiente de rebuild final.
- CoinGame y entorno original intactos.
- Instalador MSI+NSIS generado; humo del .exe OK (15 s vivo, kill limpio).
- Aceptación OpenCode 1–8: TODO OK contra servidor de prueba (detección,
  conexión con auth Basic real, sesión, streaming SSE con 37 eventos, respuesta
  "OK", historial, interrupt, cierre sin huérfanos). Script en
  `rblx-forge/scripts/acceptance-opencode.js`.
- Contratos corregidos contra tráfico real: auth Basic, `{data}`, Model.Ref,
  mensajes `content[]`. Sin API keys en la app.
- FASE 2: 21 comandos (proyectos/fs/Rojo), `cargo test` 5/5, frontend compilado.
- Pendiente manual: clics en UI, permiso en vivo, plugin Rojo.
- CoinGame y entorno original intactos.

## 2026-11-01 — Biblioteca de especialistas: 69 → 148 skills (61 instaladas + 87 propias)
- Auditoría completa de las 69 existentes (tabla capacidades/disciplina/profundidad;
  detectados duplicados parciales, skills finas y refs rotas entre repos).
- 79 skills propias nuevas en 12 disciplinas (UI 16, arte 10, construcción 5,
  personajes 11, gameplay 10, géneros 6, audio 5, multijugador 5, economía 1,
  programación 5, tooling 2, testing 3), cada una con proceso, criterios
  verificables y diferenciación declarada.
- 8 propias originales normalizadas al mismo formato (estructura + español).
- Router (`roblox-project-architect`) actualizado con enrutamiento por disciplina
  y ejemplos. Catálogo y scripts de verificación (`verify-skills.js`,
  `gen-catalog.js`). 0 duplicados de ID, 0 binarios.

## 2026-11-01 — Ampliación a 69 skills (61 instaladas + 8 propias) [histórico]
- 23 nuevas verificadas por ID sin colisiones: el4cteo (text-chat, input,
  teleport-matchmaking, monetization, tooling), luumenlabs (oauth, cloud),
  ashexplained ×12 (quests, géneros, social, policy, publishing, a11y,
  to-issues, game-ux, refactor, admin-tools, game-feel, game-ideas),
  gamedev-skills (roblox-characters, roblox-studio-workflow, dialogue-systems,
  camera-systems). Rechazadas 13 por duplicar instaladas (ver informe).
- 61/61 presentes en `npx skills list`; carga runtime verificada en OpenCode.
- Avisos de scanners (heurísticos, sin binarios): tooling (Gen High),
  text-chat/cloud/admin-tools (Snyk med). Referencias cruzadas entre repos
  documentadas en SKILLS_CATALOG.
- Fase 0 — Auditoría: 20 skills intactas en `.agents/skills/`, `skills-lock.json`
  consistente (20 entradas con hash), `.opencode/opencode.json` intacto, sin
  duplicidades de ID, sin repo git. (estado: probado)
- Fase 1 — 18 skills nuevas: 7 `el4cteo/roblox-skills` (MIT, 59★) + 10
  `ashexplained/roblox-skills` (MIT, 44★, push 2026-07: la más rancia, vigilada)
  + 1 `procedural-gen` (Apache-2.0). Total 38 instaladas. (estado: probado)
- Fase 2 — Toolchain en `tools/bin/`: rojo 7.7.1, stylua 2.6.0, selene 0.32.0,
  wally 0.3.2 (los 4 `--version` OK) + TestEZ 0.4.1 vía `wally install`.
  Aftman descartado (archivado), Mantle descartado (unmaintained), Rokit no
  instalado (escribiría fuera del proyecto). Configs: `default.project.json`,
  `wally.toml`, `stylua.toml`, `selene.toml`. (estado: probado; TestEZ:
  configurado, no ejecutado)
- Fase 3/4/6 — 8 skills propias en `.opencode/skills/` (precedencia mayor, sin
  colisiones): project-architect, security-audit, performance-audit,
  visual-design, reference-research, art-direction, environment-art,
  visual-quality-audit. Carga runtime verificada en OpenCode (8/8).
  (estado: probado)
- Fase 5 — 16 imágenes 1280px en `references/` (9 categorías), JPEG verificado
  16/16 + muestreo visual OK, licencias CC0/PD/BY/SA con atribución.
  Full-res bloqueó la IP (429); thumbs documentados. (estado: probado)
- Fase 7 — Sin modelos de imagen en este agente (`models type=image`: 0).
  Concept art = flujo manual/externo; `generate_model` del MCP pendiente en
  Studio. (estado: no ejecutable aquí, documentado)
- Fase 10 — 11 docs en `docs/` + `README.md` reescrito. Sin relleno: cada doc
  refleja solo lo instalado/verificado. (estado: probado)
- Fase 11 — 38 skills proyecto (CLI JSON) + 8 propias (carga runtime 8/8 en
  OpenCode) = 46, cero IDs duplicados, 46/46 con `description`, lock con 38
  entradas, `opencode.json` válido, toolchain 4/4 + wally/TestEZ OK, stylua y
  selene ejecutan (selene 0 errores en ejemplo; stylua solo informa diff en
  archivo de terceros, no se toca), 16/16 JPEG válidos. CoinGame intacto
  (esta sesión: solo lecturas). (estado: probado)
- Fase 9 — Matriz MCP (puente Chrrxs, peer Edit): lectura de árbol, creación de
  objetos, modificación de propiedades (rename verificado), escritura y relectura
  de scripts, ejecución Luau de solo lectura, cola de logs, captura de pantalla.
  Sonda temporal `MCPProbe_TMP*` creada y eliminada. (estado: probado)

## 2026-11-01 — Prueba integral del prototipo CoinGame (sesión anterior)
- Playtest solo: recogida real (8→7 monedas, contador 0→1), HUD sincronizado,
  4 peticiones maliciosas rechazadas sin cambios, 0 errores en logs,
  captura inspeccionada, stop + estado idle, plantilla Edit intacta.
  (estado: probado)

## 2026-11-01 — Instalación inicial (sesión anterior)
- 16 skills `nonlooped/roblox-suite` + 4 skills `luumenlabs/luau-skills`
  (alcance proyecto, agente OpenCode). (estado: probado)
- MCP oficial `Roblox_Studio` a nivel proyecto (`cmd.exe /c
  %LOCALAPPDATA%\Roblox\mcp.bat`), estado connected. (estado: conectado)
- `StudioMCP.exe` verificado en `Versions\version-7062aec9dbe74b14\`. (estado: probado)
- `README.md` creado. Configuración global sin modificar. (estado: probado)
