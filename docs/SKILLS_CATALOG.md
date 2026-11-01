# Catálogo de skills (148 = 61 instaladas + 87 propias)

Orquestador: `roblox-project-architect` (propia, con sección de enrutamiento
por disciplinas) decide cuáles invocar. Hub general: `roblox`. Referencia
rápida de API: `roblox-api`.

## Instaladas — nonlooped/roblox-suite (16, MIT)

`roblox` (hub) · `roblox-core` (servicios/tipos/RunContext) ·
`roblox-networking` (remotes, autoridad, anti-exploit) ·
`roblox-datastores` (saves, UpdateAsync, cuotas) ·
`roblox-user-interfaces` (contenedores, responsive) ·
`roblox-npcs` (PathfindingService, patrulla/persecución) ·
`roblox-animation` (Animator, IK, TweenService) ·
`roblox-vfx` (emisores, beams, trails) · `roblox-audio` (grafo moderno, legacy) ·
`roblox-testing` (consola, profilers, TestEZ) ·
`roblox-gamepasses` (passes, ProcessReceipt, suscripciones) ·
`roblox-teleport` (TeleportAsync, reserved servers) ·
`roblox-open-cloud` (REST, keys/OAuth, Secrets) ·
`roblox-rojo` (Rojo 7, syncback) · `roblox-mcp` (MCP oficial + Script Sync) ·
`roblox-physics` (assemblies, constraints, ownership).

## Instaladas — luumenlabs/luau-skills (6, MIT)

`luau-core` (lenguaje) · `luau-types` (strict, genéricos) ·
`luau-performance` (micro-opts) · `roblox-api` (búsqueda referencial) ·
`roblox-oauth` (OAuth 2.0 + PKCE, apps externas) ·
`roblox-cloud` (Open Cloud REST, scopes, webhooks).
Excluidas a propósito: `roblox-core`, `roblox-networking` (colisión de ID),
`roblox-data` (duplica a `roblox-datastores`).

## Instaladas — el4cteo/roblox-skills (12, MIT, 59★)

`roblox-world-building` (partes, iluminación, Terrain API, destrucción) ·
`roblox-game-systems` (recetas: moneda, XP, rondas, combate, tiendas, pets) ·
`roblox-ui` (Scale-only, constraints, StyleSheets, gamepad/touch) ·
`roblox-security` (checklist anti-exploit general) ·
`roblox-performance` (diagnóstico: profilers, memoria, streaming, Parallel Luau) ·
`roblox-analytics-liveops` (AnalyticsService, experimentos, eventos) ·
`roblox-architecture` (estructura cliente/servidor, CollectionService) ·
`roblox-text-chat` (TextChatService, filtrado obligatorio, privacidad) ·
`roblox-input` (Input Action System, teclado/mando/táctil/VR, cámaras custom) ·
`roblox-teleport-matchmaking` (lobbies, parties, colas, matchmaking) ·
`roblox-monetization` (mecánicas: ProcessReceipt idempotente, passes, subs, ads) ·
`roblox-tooling` (Rojo, Rokit, Wally, selene/stylua, CI; ⚠️ Gen High Risk: contiene shell).

## Instaladas — ashexplained/roblox-skills (22, MIT, 44★, push 2026-07 — ver "riesgos")

`roblox-world-level-design` (flujo, landmarks, onboarding) ·
`roblox-combat-systems` (melee/ranged, validación de daño) ·
`roblox-economy-balancing` (sources/sinks, inflación, progresión) ·
`roblox-release-operations` (gates, notas, rollback) ·
`roblox-to-prd` (concepto→PRD construible) ·
`roblox-asset-pipeline` (Creator Store audit-gated, presupuestos) ·
`roblox-mobile-playtest` (device simulator, safe areas, táctil) ·
`roblox-security-economy` (moneda, trade, anti-dupe, receipts) ·
`roblox-creator-store-security-audit` (auditoría de modelos de terceros) ·
`roblox-liveops-roadmap` (cadencia, temporadas, re-engagement) ·
`roblox-quest-progression-systems` (misiones, logros, claims idempotentes) ·
`roblox-genre-patterns` (sim/tycoon/obby/RPG/pets/TD/horror…) ·
`roblox-social-systems` (parties, clanes, trade, regalos) ·
`roblox-policy-compliance` (Community Standards, gacha-odds, IP, pre-publish) ·
`roblox-publishing-discovery` (icono, thumbnail, copy, CTR) ·
`roblox-localization-accessibility` (i18n, contraste, texto escalable) ·
`roblox-to-issues` (PRD→slices verticales jugables; compañero de to-prd) ·
`roblox-game-ux` (diseño UX, first-action 10–30 s, contrato de diseño) ·
`roblox-code-maintenance-refactor` (deuda técnica, límites de módulo) ·
`roblox-admin-tools-observability` (admin, bans, audit logs, diagnósticos) ·
`roblox-animation-audio-feedback` (game-feel, juice, impacto/recuperación) ·
`roblox-game-ideas` (ideación y scoring de conceptos).

## Instaladas — gamedev-skills (5, Apache-2.0, 6318★)

`procedural-gen` (RNG con semilla, Perlin/simplex, dungeons, loot tables; agnóstica) ·
`roblox-characters` (ciclo de vida respawn-safe, rigs R6/R15, tools) ·
`roblox-studio-workflow` (editar places vivos sin romperlos, verificar en Studio) ·
`dialogue-systems` (diálogos ramificados Ink/Yarn; agnóstica, combina con quests) ·
`camera-systems` (follow, órbita 3P, first-person, shake; agnóstica).

## Propias — `.opencode/skills/` (87: 8 originales + 79 nuevas, precedencia mayor, sin colisiones)

Originales (núcleo transversal): `roblox-project-architect` (brief antes de código + enrutamiento por disciplinas) ·
`roblox-security-audit` (procedimiento de auditoría con severidades) ·
`roblox-performance-audit` (baseline→fix→re-medición) ·
`roblox-visual-design` (crítica + propuesta con capturas) ·
`roblox-reference-research` (vetting de referencias, honestidad visual) ·
`roblox-art-direction` (paleta/luz/materiales/tipo, gates) ·
`roblox-environment-art` (ejecución: Terrain, Lighting, staging) ·
`roblox-visual-quality-audit` (gates por screenshot 0–2 por dimensión).

`roblox-project-architect` (brief antes de código) ·
`roblox-security-audit` (procedimiento de auditoría con severidades) ·
`roblox-performance-audit` (baseline→fix→re-medición) ·
`roblox-visual-design` (crítica + propuesta con capturas) ·
`roblox-reference-research` (vetting de referencias, honestidad visual) ·
`roblox-art-direction` (paleta/luz/materiales/tipo, gates) ·
`roblox-environment-art` (ejecución: Terrain, Lighting, staging) ·
`roblox-visual-quality-audit` (gates por screenshot 0–2 por dimensión).

Nuevas especializadas (79), con proceso paso a paso, criterios verificables y
diferenciación explícita frente a las instaladas. Generadas desde sus
descripciones reales (ver `scripts/gen-catalog.js`):

### UI/UX (16)

- `roblox-welcome-onboarding` — Pantallas de bienvenida, onboarding y tutorial inicial. Úsala cuando crees la primera sesión, tutoriales interactivos, pantallas de descubrimiento o flujo de skip.
- `roblox-main-menu` — Menús principales con jugar, modos, noticias y teaser de temporada. Úsala cuando crees la pantalla de título, selector de modos, panel de eventos o transiciones de entrada/salida.
- `roblox-pause-menu` — Pausa con reanudar, ajustes rápidos y salir con confirmación. Úsala cuando crees la pausa en partida, el panel ESC, opciones rápidas o el flujo de abandono seguro.
- `roblox-hud` — HUD de salud, recursos, objetivos y elementos contextuales. Úsala cuando crees la interfaz en partida, barras de vida, objetivos, minimapa o priorización de información sin tapar el juego.
- `roblox-inventory-ui` — Grids de inventario, categorías, equipar y tooltips. Úsala cuando crees mochila, equipamiento, drag/click para equipar o sincronización visible con guardado.
- `roblox-shop-ui` — Grids de productos, precios, preview y compra con confirmación. Úsala cuando crees tiendas, escaparates, pases, estados owned/sin fondos o confirmaciones de compra.
- `roblox-settings-ui` — Panel de gráficos, audio, controles rebind y accesibilidad. Úsala cuando crees opciones, reasignación de teclas, sliders de volumen, presets o persistencia local de ajustes.
- `roblox-character-selector` — Cards de clases, stats comparadas y preview 3D. Úsala cuando crees selección de personaje/clase, desbloqueos por nivel o pago, o confirmación antes de jugar.
- `roblox-lobby-ui` — Selector de mapas/modos, salas, filtros y matchmaking visible. Úsala cuando crees lobby, lista de servidores, crear/unirse a sala, party o estados de cola.
- `roblox-quest-journal-ui` — Lista de misiones, detalle, tracking y recompensas. Úsala cuando crees quest log, seguimiento de objetivos, barras de progreso o entrega de recompensas.
- `roblox-notifications-ui` — Cola de avisos, toasts y modales sin spam. Úsala cuando crees notificaciones, confirmaciones, errores globales o banners que no interrumpan el juego.
- `roblox-leaderboard-ui` — Tablas de clasificación, tabs global/amigos y paginación. Úsala cuando crees rankings, estadísticas de jugador, top semanal o anti-spoof visual.
- `roblox-dialogue-ui` — NPC con ProximityPrompt, respuestas, typewriter y chat. Úsala cuando crees conversaciones, elecciones, tiendas de NPC o narrativa integrada con TextChatService.
- `roblox-mobile-touch-ui` — Controles touch, thumb zones, safe-area y orientación. Úsala cuando adaptes HUD, botones, joystick o menús a móvil y tablet sin tapar el juego.
- `roblox-pets-ui` — Colección, equipar, hatch, fusión y showcase de pets. Úsala cuando necesites inventario de mascotas, huevos con reveal, fusión shiny o boosts visibles.
- `roblox-vehicle-ui` — Garaje, spawn, HUD de conducción y daños. Úsala cuando crees selección de vehículos, customización, velocímetro, combustible o estados de daño.

### Arte y entornos (10)

- `roblox-exterior-architecture` — Diseña edificios exteriores legibles y escalados al avatar. Úsala cuando necesites fachadas, entradas, tejados, ritmo de vanos o masas de edificios.
- `roblox-interior-design` — Diseña interiores jugables y confortables con zonas claras y circulación fluida. Úsala cuando necesites distribuir habitaciones, amueblar, iluminar interiores o marcar salidas.
- `roblox-city-settlements` — Planifica ciudades, pueblos y asentamientos con distritos y calles legibles. Úsala cuando necesites zonificar, trazar calles, colocar plazas/landmarks o diseñar distritos industriales y futuristas.
- `roblox-terrain-sculpting` — Esculpe terreno creíble con biomas, ríos y montañas por chunks. Úsala cuando necesites Terrain, transiciones de bioma, mapas extensos o relieve jugable.
- `roblox-vegetation-landscaping` — Distribuye vegetación natural con densidad controlada y colisiones baratas. Úsala cuando necesites bosques, parques, jardines o paisajismo con rendimiento mobile.
- `roblox-materials-surfaces` — Define paletas de materiales coherentes con desgaste creíble. Úsala cuando necesites elegir materiales, crear variantes, mezclar textura y color o envejecer superficies.
- `roblox-lighting-day-night` — Configura ciclos día/noche legibles con sol, luna, sombras e interiores nocturnos. Úsala cuando necesites ClockTime, transiciones, sombras o legibilidad nocturna.
- `roblox-lighting-atmosphere` — Crea atmósfera y clima con niebla, lluvia, god-rays y post-efectos moderados. Úsala cuando necesites Atmosphere, tormentas, transiciones de clima o mood ambiental.
- `roblox-props-decoration` — Coloca props, decoración y señalética que guían sin saturar. Úsala cuando necesites amueblar escenas, crear letreros/flechas/landmarks de guía o vestir calles e interiores.
- `roblox-ambient-effects` — Añade efectos ambientales sutiles (polvo, luciérnagas, hojas, lluvia local) con storytelling. Úsala cuando necesites ambiente vivo con presupuesto mobile estricto.

### Construcción (5)

- `roblox-modular-building` — Construcción modular con grid, kits reutilizables y pivots. Úsala cuando necesites piezas intercambiables, variaciones sin romper el set o escalar un nivel con pocos assets.
- `roblox-vehicle-construction` — Construcción de vehículos (chasis, cabinas, ruedas/hélices/cascos, colliders y asientos). Úsala cuando necesites coches, barcos, naves o monturas modeladas de forma jugable y estable.
- `roblox-props-creation` — Creación de props con presupuesto de instancias, colliders simples y LOD manual. Úsala cuando necesites mobiliario, decoración o sets temáticos que rindan bien y se lean a distancia.
- `roblox-meshparts-geometry` — MeshParts y geometría (mesh vs parts, CSG con moderación, colisiones caja vs precisas, escalado). Úsala cuando decidas entre piezas clásicas o mallas y necesites formas complejas sin romper rendimiento ni colisiones.
- `roblox-model-organization` — Organización de modelos y jerarquías (naming, carpetas, tags/atributos, versionado, Rojo). Úsala cuando necesites jerarquías limpias, importar sin duplicar y dejar el proyecto listo para sincronizar.

### Personajes y animación (11)

- `roblox-character-design` — Diseño visual de personajes y avatares (silueta, proporciones, rol/equipo). Úsala cuando crees un héroe, enemigo, NPC jugable o sistema de customización.
- `roblox-rigging` — Rigs R6/R15/custom con Motor6D, jerarquías y validación. Úsala cuando tu modelo no se anima, se deforma raro o necesitas un rig propio.
- `roblox-locomotion-animation` — Locomoción creíble (idle/walk/run/jump/fall, blends y foot sliding). Úsala cuando el personaje patina, las transiciones son bruscas o corre sin peso.
- `roblox-combat-animation` — Animaciones de combate con anticipación, impacto y recuperación. Úsala cuando los golpes se sienten flojos o no sincronizan con el daño.
- `roblox-expressive-animation` — Emotes, expresiones faciales y gestos de interacción. Úsala cuando los personajes se sienten robóticos en social, tiendas o cinemáticas.
- `roblox-animation-systems` — Máquinas de estados, capas, prioridades y replicación de animación. Úsala cuando montes el sistema que decide qué clip se reproduce y cómo se ve en otros clientes.
- `roblox-character-controller` — Controladores de personaje (aceleración, salto, coyote-time, agua/escalada). Úsala cuando el movimiento se siente flotante, el salto no responde o el input no escala a mando/táctil.
- `roblox-parkour-traversal` — Parkour y traversal (vault, climb, wallrun, slide, stamina). Úsala cuando añadas trepar, deslizarte o correr por paredes con validación anti-vuelo.
- `roblox-land-vehicles` — Vehículos terrestres arcade (chasis, suspensión, asientos, ownership). Úsala cuando montes karts, coches o motos que se conducen bien y no se desarman en red.
- `roblox-air-vehicles` — Vehículos aéreos arcade (sustentación, controles, límites de mapa). Úsala cuando montes aviones, helicópteros o jetpacks sin regalar vuelo libre.
- `roblox-water-vehicles` — Vehículos acuáticos (flotación, oleaje, atraque, agua Terrain vs parts). Úsala cuando montes barcas, motos de agua o barcos con puertos.

### Gameplay (10)

- `roblox-abilities-cooldowns` — Habilidades con cooldown, cargas y ultis (dash, esquiva, AoE). Úsala cuando necesites diseñar, balancear o validar habilidades con UI de cooldown y anti-spam de servidor.
- `roblox-resource-gathering` — Nodos recolectables con respawn, herramientas y validación de proximidad. Úsala cuando necesites minas, árboles, pesca o loot con anti-farmer y anti-teleport.
- `roblox-crafting` — Recetas, estaciones, colas y crafteo atómico validado en servidor. Úsala cuando necesites forja, cocina, workbench o crafteo con materiales y tiempos.
- `roblox-building-placement` — Colocación con grid, fantasma, validez y guardado de plots. Úsala cuando necesites construir bases, tycoons, decorar casas o muros.
- `roblox-pets-systems` — Mascotas con hatch, equipar, fusión y economía de pets. Úsala cuando necesites huevos, shinies, inventario de pets y boosts balanceados.
- `roblox-vehicle-systems` — Vehículos como gameplay con garaje, combustible, daño y robo validado. Úsala cuando necesites coches, barcos o monturas con propiedad y persistencia.
- `roblox-minigames` — Rondas cortas con salas, matchmaking, puntuación y rotación. Úsala cuando necesites party games, micro-juegos o lobbies rotativos.
- `roblox-dynamic-events` — Eventos temporales con jefes, clima de gameplay y anuncios. Úsala cuando necesites invasiones, drops, jefes de mundo o modificadores rotativos.
- `roblox-checkpoints` — Checkpoints con guardado de progreso, respawn y anti-skip. Úsala cuando necesites obbies, torres, carreras o niveles con etapas verificadas.
- `roblox-interaction-systems` — Interacciones con raycast, prompts, hold y feedback. Úsala cuando necesites puertas, loot, NPC diálogo, recolección o botones con UX clara.

### Géneros (6)

- `roblox-simulator` — Simuladores click/área con rebirths, pets+shiny y control de inflación. Úsala cuando necesites diseñar progresión, huevos, zonas y monetización de simulator.
- `roblox-tycoon` — Tycoons con droppers, conveyors, rebirths y plots guardados. Úsala cuando necesites diseñar producción, upgrades, PvP opcional y guardado de base.
- `roblox-obby` — Obbies con dificultad por etapas, checkpoints y control de rage-quit. Úsala cuando necesites torres, rage games justos, skips y tiempos verificados.
- `roblox-horror` — Horror con tensión, sustos justos, oscuridad legible y audio. Úsala cuando necesites ritmo de miedo, monstruo, linternas y anti-cheat de luz.
- `roblox-tower-defense` — Tower defense con oleadas, pathing, economía de torres y coop. Úsala cuando necesites mapas con camino, sinergias, bosses y balance de oleadas.
- `roblox-rpg` — RPG/aventura con clases, stats, mundo, jefes y party. Úsala cuando necesites diseñar progresión, quests de zona, dungeons y combate de grupo.

### Audio (5)

- `roblox-ambient-soundscapes` — Diseña ambientes sonoros por capas y zonas con transiciones suaves. Úsala cuando necesites ambience de bosque, ciudad, cueva, lluvia, día/noche o mezclas que cambian por zona.
- `roblox-dynamic-music` — Diseña música adaptativa por capas según el estado del juego. Úsala cuando necesites música que cambie entre exploración, tensión y combate con loops sin cortes.
- `roblox-sfx-design` — Diseña SFX de UI, interacción y personajes con variación anti-repetición. Úsala cuando necesites clics, pasos, saltos, impactos, pickups o feedback sonoro de acciones.
- `roblox-vehicle-audio` — Diseña audio de vehículos con motor por RPM, superficies y bocinas. Úsala cuando necesites coches, motos, barcos o naves con sonido creíble dentro y fuera.
- `roblox-audio-mixing` — Mezcla, prioriza y optimiza todo el audio del juego. Úsala cuando necesites niveles por familia, ducking, compresión para móvil o presupuestos de assets y voces.

### Multijugador (5)

- `roblox-state-replication` — Diseña sincronización de estado multijugador con interpolación y anti-desync. Úsala cuando necesites decidir qué se replica, con qué frecuencia y cómo evitar teletransportes y divergencias.
- `roblox-private-servers` — Diseña servidores privados/VIP con acceso, configuración y moderación. Úsala cuando necesites servidores solo para amigos, reglas personalizadas, persistencia por servidor o moderación delegada.
- `roblox-disconnect-recovery` — Diseña reconexión y recuperación de estado tras caídas. Úsala cuando necesites reconnect a la partida, guardar estado a salvo o rejoin sin perder progreso.
- `roblox-coop-systems` — Diseña juego cooperativo con revivir, reparto de botín y objetivos. Úsala cuando necesites down-but-not-out, botín compartido, dificultad escalada o sync de objetivos de equipo.
- `roblox-competitive-systems` — Diseña juego competitivo justo con ranked simple y finales limpios. Úsala cuando necesites matchmaking equilibrado, ELO sencillo, anti-smurf básico o desempates.

### Economía (1)

- `roblox-rarity-collectibles` — Tiers de rareza, odds transparentes, pity y duplicados para coleccionables. Úsala cuando diseñes gacha, sobres, drops o showcases conformes a políticas.

### Programación (5)

- `roblox-design-patterns` — Patrones de diseño Luau (Service/Controller, Observer, Factory, Singleton, Pool). Úsala cuando organices módulos, eventos o creación de objetos en Roblox.
- `roblox-state-machines` — Máquinas de estado para IA, UI y gameplay en Luau (estados, transiciones, guardas). Úsala cuando un if/cadena de flags se vuelve inmanejable.
- `roblox-component-systems` — Componentes reutilizables con CollectionService, Tags y Attributes. Úsala cuando varios objetos comparten comportamiento sin herencia.
- `roblox-code-review` — Code review previo a merge en Roblox Luau (autoridad, pcall, leaks, tipos, naming). Úsala cuando pidas o des review antes de mergear.
- `roblox-error-handling` — Errores y logging en Luau (pcall/xpcall, asserts, categorías, telemetría). Úsala cuando llamadas a datos fallen en silencio o necesites degradación elegante.

### Tooling (2)

- `roblox-ci-cd` — CI/CD con GitHub Actions para Roblox (selene, StyLua, tests, build Rojo, publish). Úsala cuando automatices checks, builds o publicaciones del juego.
- `roblox-git-workflows` — Git para proyectos Rojo (ramas, .gitignore, conflictos, releases). Úsala cuando organices ramas, ignores o releases de un juego Roblox.

### Testing (3)

- `roblox-testez` — TestEZ en serio (specs, mocks, runner en Studio/CLI, qué testear). Úsala cuando añadas tests unitarios o de sistema en Roblox Luau.
- `roblox-multiplayer-testing` — Pruebas multijugador con 2+ clientes (réplica, races, red pobre). Úsala cuando valides autoridad, concurrencia o device matrix antes de release.
- `roblox-ui-testing` — Pruebas de UI por pantalla (recorridos, estados, resoluciones, legibilidad). Úsala cuando valides menús, HUD o flujos antes de cada release.

## Riesgos conocidos

- `ashexplained`: sin push desde 2026-07 (más rancia del set). Contenido válido
  hoy; re-verificar contra docs oficiales si cambian APIs que cita.
- Instalador marcó `roblox-gamepasses` (Snyk med), `roblox-testing` (Gen critical),
  `roblox-security-economy` + `roblox-creator-store-security-audit` (Snyk med),
  `roblox-text-chat` (Snyk med), `roblox-cloud` (Snyk med),
  `roblox-admin-tools-observability` (Snyk med) y `roblox-tooling`
  (Gen High — contiene comandos shell de toolchain, esperado en una skill de
  tooling; revisar antes de ejecutar): scanners heurísticos sobre
  Markdown/Luau; cero binarios en el proyecto.
- Referencias cruzadas entre repos (`roblox-to-issues`→`roblox-to-prd` OK;
  menciones a `roblox-datastore-persistence` se resuelven con el instalado
  `roblox-datastores`): si una skill cita un ID ausente, el agente usa el
  equivalente instalado.
