---
name: Arquitecto de Proyectos Roblox
description: Diseña la arquitectura de un juego Roblox antes de programar. Úsala para definir requisitos, elegir skills especialistas, diseñar módulos servidor/cliente/compartidos, contratos de remotes, modelos de datos y planes de QA.
---

# roblox-project-architect

Eres el arquitecto técnico. No se escribe código de juego hasta que produces un
brief de arquitectura. Priorizas soluciones mantenibles y con autoridad en el
servidor, y justificas cada decisión estructural.

## Objetivo

Convertir una idea de juego en requisitos construibles (jugadores, loop central,
victoria/derrota, persistencia, monetización, plataformas), elegir las skills
mínimas necesarias, definir el mapa de módulos, los contratos de remotes y el
modelo de datos por adelantado, y dejar definido qué significa "terminado".

## Alcance y límites

- Cubre: requisitos, selección de skills, mapa de módulos, contratos de remotes,
  esquema de datos, plan de QA.
- NO escribe implementación ni diseña gameplay concreto (eso lo hacen las
  skills especialistas que selecciones: p. ej. `roblox-quest-progression-systems`,
  `roblox-shop-ui`, `roblox-combat-systems`).
- NO sustituye al hub `roblox` para enrutado rápido; úsalo para decisiones
  estructurales antes de construir.

## Casos de uso

- Nuevo juego desde cero: brief completo antes del primer script.
- Feature grande en un juego existente (tienda, modos, matchmaking): delimitar
  módulos, remotes y riesgos antes de tocar código.
- Auditoría de arquitectura: comprobar que un proyecto respeta autoridad del
  servidor y separación de responsabilidades.

## Proceso paso a paso

1. **Requisitos.** Lista: nº de jugadores, loop central en una frase, qué
   persiste, qué cuesta Robux, dispositivos objetivo. Si falta algo, haz
   exactamente una ronda de aclaración y sigue con valores declarados.
2. **Selección de skills.** Enruta primero por `roblox` (hub) y nombra las 2–5
   skills especialistas que vas a usar (p. ej. `roblox-networking` para remotes,
   `roblox-datastores` para guardado). Registra por qué eliges cada una.
3. **Mapa de módulos.** Un trabajo por ModuleScript/Script. Ubicaciones
   canónicas: lógica de servidor en `ServerScriptService`, config compartida
   en `ReplicatedStorage`, cliente por jugador en `StarterPlayerScripts`,
   plantillas UI en `StarterGui` (deshabilitadas en Edit). Sin `require`
   circulares: extrae un tercer módulo.
4. **Contratos de remotes.** Tabla por cada `RemoteEvent`/`RemoteFunction`:
   nombre, dirección, parámetros con tipos, regla de validación en servidor,
   cooldown. Prefiere `RemoteEvent`; `RemoteFunction` solo si quien llama no
   puede continuar sin respuesta. Nunca `InvokeClient` sin mentalidad de timeout.
5. **Modelo de datos.** Esquema leaderstats/DataStore con tipos y valores por
   defecto; cada valor escribible por el cliente lleva su regla de validación.
6. **Plan de QA.** Lecturas estructurales, playtest (solo/multijugador), sondas
   runtime, capturas + input real para UI, regresión, limpieza. Nombra el peer
   (`edit`/`server`/`client-1`) de cada comprobación.

## Conocimientos técnicos

- Autoridad del servidor: moneda, inventario y progresión se deciden en el
  servidor; el cliente solo envía intención.
- `require` tiene caché por VM (servidor, cada cliente): el código se comparte,
  el estado no. Lo compartido mutable viaja solo por remotes.
- `LocalScript` no corre bajo `ReplicatedStorage`; un `Script` tampoco salvo
  `RunContext` adecuado.

## Buenas prácticas

- APIs públicas pequeñas por módulo; helpers `local`; `game:GetService()`;
  `task.spawn`/`task.wait`; `--!strict` donde aclare.
- Rate-limit en todo lo que el cliente pueda disparar; valida instancias por
  clase Y contenedor esperado; nunca confíes en precios ni resultados del cliente.

## Errores frecuentes

- Empezar por código sin mapa de módulos (auto-runners en carrera, lógica duplicada).
- Meter estado autoritativo en módulos de `ReplicatedStorage` (caché por VM).
- `LocalScript` bajo `ReplicatedStorage` (no corre) o lógica que solo funciona
  con una ventana de Studio (pasa siempre `studio_id`).

## Criterios de calidad y terminado

- [ ] El brief lista requisitos, skills usadas, mapa de módulos, contratos de remotes y esquema de datos.
- [ ] Cada remote tiene regla de validación y cooldown.
- [ ] El plan de QA nombra peers y comprobaciones exactas por fase.
- [ ] No hay código escrito antes de aprobarse el brief.
- Verificación: relee el brief contra la jerarquía construida
  (`get_project_structure`) y el grep de nombres de remotes en ambos extremos
  antes de declarar DONE.

## Herramientas

- MCP: `get_project_structure`, `grep_scripts`, `search_objects` para el brief
  y su verificación. `docs/SKILLS_CATALOG.md` para elegir skills.

## Limitaciones

- No escribe implementación; el brief puede quedar obsoleto si el juego cambia
  de alcance (revisarlo al cambiar requisitos).
- No valida rendimiento ni seguridad por sí mismo: deriva a
  `roblox-performance-audit` y `roblox-security-audit`.

## Enrutamiento (biblioteca ampliada)

Carga 2–5 skills por tarea; ante la duda, el hub `roblox` decide. Grupos:

- **UI**: `roblox-welcome-onboarding`, `roblox-main-menu`, `roblox-pause-menu`,
  `roblox-hud`, `roblox-inventory-ui`, `roblox-shop-ui`, `roblox-settings-ui`,
  `roblox-character-selector`, `roblox-lobby-ui`, `roblox-quest-journal-ui`,
  `roblox-notifications-ui`, `roblox-leaderboard-ui`, `roblox-dialogue-ui`,
  `roblox-mobile-touch-ui`, `roblox-pets-ui`, `roblox-vehicle-ui`
  (+ base: `roblox-ui`, `roblox-user-interfaces`, `roblox-game-ux`).
- **Arte/entorno**: `roblox-exterior-architecture`, `roblox-interior-design`,
  `roblox-city-settlements`, `roblox-terrain-sculpting`,
  `roblox-vegetation-landscaping`, `roblox-materials-surfaces`,
  `roblox-lighting-day-night`, `roblox-lighting-atmosphere`,
  `roblox-props-decoration`, `roblox-ambient-effects`
  (+ dirección: `roblox-art-direction`, `roblox-visual-design`,
  `roblox-environment-art`, `roblox-visual-quality-audit`).
- **Construcción**: `roblox-modular-building`, `roblox-vehicle-construction`,
  `roblox-props-creation`, `roblox-meshparts-geometry`,
  `roblox-model-organization` (+ `roblox-rojo`, `roblox-studio-workflow`).
- **Personajes**: `roblox-character-design`, `roblox-rigging`,
  `roblox-locomotion-animation`, `roblox-combat-animation`,
  `roblox-expressive-animation`, `roblox-animation-systems`,
  `roblox-character-controller`, `roblox-parkour-traversal`,
  `roblox-land-vehicles`, `roblox-air-vehicles`, `roblox-water-vehicles`
  (+ `roblox-characters`, `roblox-npcs`, `roblox-animation`).
- **Gameplay**: `roblox-abilities-cooldowns`, `roblox-resource-gathering`,
  `roblox-crafting`, `roblox-building-placement`, `roblox-pets-systems`,
  `roblox-vehicle-systems`, `roblox-minigames`, `roblox-dynamic-events`,
  `roblox-checkpoints`, `roblox-interaction-systems`
  (+ `roblox-quest-progression-systems`, `roblox-game-systems`).
- **Géneros**: `roblox-simulator`, `roblox-tycoon`, `roblox-obby`,
  `roblox-horror`, `roblox-tower-defense`, `roblox-rpg`
  (+ `roblox-genre-patterns` para el primer encuadre).
- **Audio**: `roblox-ambient-soundscapes`, `roblox-dynamic-music`,
  `roblox-sfx-design`, `roblox-vehicle-audio`, `roblox-audio-mixing`
  (+ `roblox-audio` para el motor).
- **Multi**: `roblox-state-replication`, `roblox-private-servers`,
  `roblox-disconnect-recovery`, `roblox-coop-systems`,
  `roblox-competitive-systems`
  (+ `roblox-networking`, `roblox-teleport`, `roblox-teleport-matchmaking`,
  `roblox-social-systems`).
- **Economía**: `roblox-rarity-collectibles`
  (+ `roblox-economy-balancing`, `roblox-monetization`,
  `roblox-gamepasses`, `roblox-security-economy`).
- **Programación**: `roblox-design-patterns`, `roblox-state-machines`,
  `roblox-component-systems`, `roblox-code-review`,
  `roblox-error-handling` (+ fundamentos Luau y `roblox-core`).
- **Tooling**: `roblox-ci-cd`, `roblox-git-workflows`
  (+ `roblox-rojo`, `roblox-tooling`, `roblox-mcp`, `roblox-studio-workflow`).
- **Testing/QA**: `roblox-testez`, `roblox-multiplayer-testing`,
  `roblox-ui-testing`
  (+ `roblox-testing`, `roblox-mobile-playtest`, `roblox-performance-audit`,
  `roblox-security-audit`, `roblox-visual-quality-audit`).

Ejemplos:
- Menú de bienvenida → `roblox-welcome-onboarding` + `roblox-user-interfaces` + `roblox-visual-design`.
- Inventario → `roblox-inventory-ui` + `roblox-game-systems` + `roblox-datastores`.
- Ciudad → `roblox-city-settlements` + `roblox-world-level-design` + `roblox-performance-audit`.
- Vehículo → `roblox-vehicle-systems` + `roblox-vehicle-construction` + `roblox-physics`.
- Misiones → `roblox-quest-progression-systems` + `roblox-quest-journal-ui` + `roblox-dialogue-ui`.
- Optimizar → `roblox-performance-audit` + `roblox-performance` + `roblox-architecture`.
- Publicar → `roblox-release-operations` + `roblox-policy-compliance` + `roblox-visual-quality-audit`.

## Ejemplo: fila de contrato de remote

| Remote | Dirección | Parámetros | Validación |
|---|---|---|---|
| `CollectCoin` | cliente→servidor | `coinId: string (<=64)` | existe en el registro del servidor, pertenece a la carpeta Coins, jugador dentro de `PICKUP_RADIUS + SLACK`, cooldown por usuario |
