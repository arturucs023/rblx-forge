---
name: roblox-code-review
description: Code review previo a merge en Roblox Luau (autoridad, pcall, leaks, tipos, naming). Úsala cuando pidas o des review antes de mergear.
---

# Code Review en Roblox Luau

## Objetivo
Convertir cada revisión en un filtro fiable antes del merge: detectar fallos de autoridad, errores sin `pcall`, fugas de conexiones, tipos débiles y naming confuso, con un formato de pedir y dar review que desbloquea en vez de bloquear.

## Alcance y límites
Diferenciación: `roblox-code-maintenance-refactor` (instalada) reestructura código ya mergeado; esta skill revisa ANTES de mergear para decidir si entra. `luau-types` y `luau-performance` cubren tipos y rendimiento en profundidad; aquí se verifican como checklist. `roblox-testing` (instalada) es paraguas QA; aquí se exige la evidencia mínima de tests por cambio.

Qué NO hace:

- NO refactoriza por ti; deja comentarios accionables y el autor corrige.
- NO sustituye tests (ver `roblox-testez`, `roblox-multiplayer-testing`, `roblox-ui-testing`).
- NO define CI (ver `roblox-ci-cd`); pero bloquea merge si el CI está rojo.

## Casos de uso
1. Revisar un PR con cambio de autoridad (quién decide daño, moneda, inventario).
2. Revisar `ModuleScript` nuevo con eventos y conexiones.
3. Pedir review: describir qué cambia, riesgos y cómo testearlo.
4. Revisar cambio de `DataStoreService`/`MemoryStoreService` con reintentos y `pcall`.
5. Revisar UI con nuevos recorridos (derivar detalle a `roblox-ui-testing`).

## Proceso paso a paso
1. El autor abre el PR con plantilla: qué cambia, por qué, riesgos, cómo testear (comandos/pasos), capturas si hay UI.
2. El revisor hace una primera pasada de seguridad/autoridad: ¿el cliente decide algo que debe decidir el servidor? Si sí, Request Changes inmediato.
3. Segunda pasada con checklist Roblox (sección Conocimientos): `pcall`, leaks, tipos, naming, límites. Marca cada hallazgo con severidad: Bloqueante / Sugerencia / Nit.
4. Verifica evidencia: CI verde, tests nuevos o justificación, y playtest manual descrito. Sin evidencia, no apruebes.
5. Comenta accionable: cita línea/archivo, explica el riesgo concreto, proponeFix o ejemplo. Nada de "esto está mal".
6. El autor responde a cada hilo (fix o réplica razonada). No resuelvas hilos ajenos.
7. Re-review solo de lo cambiado. Aprueba cuando no queden Bloqueantes y el CI esté verde.
8. Tras el merge, anota 1 aprendizaje en el PR si hubo bug de patrón repetido (autoridad, leak, `pcall`).

## Conocimientos técnicos
Checklist Roblox obligatoria:

- Autoridad: el servidor valida toda entrada de cliente (montos, posiciones, cooldowns). Ninguna recompensa se otorga solo en cliente.
- `pcall`/`xpcall`: toda llamada a `DataStoreService`, `OrderedDataStore`, `MemoryStoreService`, `MessagingService` va envuelta con reintento + backoff. Sin `pcall` desnudo es Bloqueante.
- Leaks: cada `Connect` tiene `Disconnect` apareado (`Destroy`, `onRemoved`, fin de ronda). Busca conexiones en bucles y en `onAdded` sin limpieza.
- Tipos: modos estrictos donde aporte, anotaciones en APIs públicas, sin `any` silencioso en firmas nuevas (ver `luau-types` para detalle).
- Naming: `Service`/`Factory`/`Component` por rol; eventos con verbo; estados como situación. Prohíbe `Manager2`, `HelperFinal`, `Util`.
- Límites: valida rangos (NaN, negativos, strings gigantes) en bordes; falla con asserts útiles.
- `CollectionService`/`Attributes`: revisa Tags y tipos de atributos con `typeof`; no asumas tipos.
- Compatibilidad Rojo/Git: nada de archivos generados ni rutas absolutas (ver `roblox-git-workflows`).

Ejemplo ilustrativo (comentario accionable bueno vs malo):

```text
-- Malo: "esto puede fallar"
-- Bueno (Bloqueante): "DataStore sin pcall en CoinService.lua:42. Si falla,
-- el jugador pierde la compra sin error visible. Envuelve en pcall con
-- reintento x3 + backoff y registra en el log (ver roblox-error-handling)."
```

Ejemplo ilustrativo (plantilla de PR mínima):

```text
## Qué cambia
## Riesgo (autoridad/datos/rendimiento)
## Cómo testear (pasos + casos borde)
## Evidencia (CI/tests/capturas)
```

## Buenas prácticas
- Revisa poco y a menudo: PRs pequeños (<400 líneas) se revisan mejor y más rápido.
- Separa Bloqueante de gusto: lo bloqueante impide merge; el gusto es sugerencia.
- Un hilo, un tema. No mezcles naming con autoridad en el mismo comentario.
- Elogia lo específico cuando un patrón esté bien aplicado; fija el estándar.
- Timebox: primera respuesta en <24h laborables; si no puedes, pide otro revisor.

## Errores frecuentes
1. Aprobar con CI rojo "porque en local funciona": rompe `main`. Regla: rojo = no merge.
2. Review solo de estilo (comas, espacios) ignorando autoridad: el exploit pasa. Autoridad primero, estilo después (o déjalo a StyLua en `roblox-ci-cd`).
3. Comentarios vagos ("revisa esto", "no me gusta"): bloquean sin desbloquear. Incluye línea + riesgo + propuesta.
4. Resolver hilos ajenos y mergear: el autor no aprendió y el bug vuelve. El autor cierra sus hilos.
5. PRs gigantes imposibles de revisar: se aprueban a ciegas. Divide por sistema o por capas.
6. Ignorar leaks porque "es solo una conexión": N jugadores × M rondas = caída. Exige `Disconnect` visible.
7. Pedir review sin pasos de test: el revisor adivina. Sin "cómo testear", devuelve el PR.

## Criterios de calidad y terminado
- [ ] Autoridad verificada: ningún poder del cliente sin validación de servidor.
- [ ] Todo acceso a datos/mensajería con `pcall` + reintento (o justificación escrita).
- [ ] Cero conexiones sin `Disconnect` apareado identificable.
- [ ] Cero Bloqueantes abiertos + CI verde + evidencia de test/playtest citada.
- [ ] Cada hilo tiene respuesta (fix o réplica) y re-review de lo cambiado.
- [ ] PR con plantilla completa; merge con squash o estrategia del repo (ver `roblox-git-workflows`).

## Herramientas
- Git (diff, blame) + convención de ramas (ver `roblox-git-workflows`).
- CI con selene/StyLua/tests (ver `roblox-ci-cd`) como puerta de merge.
- `TestService` + TestEZ para evidencia por cambio (ver `roblox-testez`).
- `ScriptProfiler` / MicroProfiler si el PR toca hot paths.

## Limitaciones
- Esta skill no ejecuta CI ni mergea por ti; define el estándar de revisión.
- No profundiza en tipos ni profiling; deriva a `luau-types`, `luau-performance`.
- Si dudas de una API citada en el diff, marca `(verificar en create.roblox.com/docs)` en el hilo.
