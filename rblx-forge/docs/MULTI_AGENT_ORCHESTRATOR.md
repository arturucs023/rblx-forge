# Multi-Agent Orchestrator — documentación técnica

Capa de planificación, coordinación y supervisión sobre OpenCode (único motor
IA). ETAPA: implementado + testeado; E2E real parcial (cuota gratuita agotada
el día de la prueba — ver Limitaciones).

## Arquitectura

```
Tauri backend (src-tauri/src/orch.rs, 40 comandos, tablas orch_* en eval.db)
  perfiles | runs | tareas + DAG | ejecuciones | mensajes | aprobaciones |
  artefactos | auditoría | dashboard | export
        ↕ comandos Tauri + eventos forge:orch-*/agent-*/task-*/review-*/approval-*
Frontend (src/stores/orch.ts + src/components/Orchestrator/*, 7 vistas)
  cola (máx 2, defecto 1), timeouts, reintentos, scope-guard, revisiones,
  aprobaciones, persistencia de runs en SQLite
OpenCode (único motor): sesiones independientes por ejecución, skills[] por
tarea, polling 500 ms existente, interrupt, fork (reintentos), agents nativos
opcionales, revisión en sesión separada
```

Sin segundo sistema de skills (solo IDs del registro), sin duplicar sesiones
(se reutiliza el cliente y su polling), sin segundo servidor, sin nuevas
dependencias.

## Capacidades nativas usadas (verificadas contra OpenAPI 2.2.4 + servidor)

- `GET /api/agent` — 7 agentes (build/general/explore/plan primaries+subagent,
  3 ocultos). Perfiles pueden fijar `native_agent` (validado al guardar).
- `POST /session/{id}/fork` — reintentos con contexto (el coordinador bifurca
  la sesión fallida en vez de empezar de cero).
- `POST /session/{id}/agent` y `model` — disponibles; el runner crea la sesión
  ya con `agent`+`model` efectivos (herencia tarea > agente > run).
- `POST /session/{id}/background` — no se usa: nuestra cola + polling ya cubre
  la concurrencia con cancelación real; documentado para no fingir uso.
- Sesiones independientes por tarea (no subagents dentro de una sesión):
  decisión consciente — son observables (permisos, progreso, coste),
  cancelables y persisten; los subagents nativos no exponen ese control.

## Asignación de skills (sin duplicar contenido)

`orch_suggest_skills(texto)` cruza el texto con el registro real de eval.db y
los veredictos del Evaluation Engine: +grupo relevante, +mención explícita,
PASSED=3 / WARNINGS=2 / NEEDS=1 / NOT_EVALUATED=1 (no se excluyen) /
FAILED|BLOCKED=−100 (deprioritadas, nunca ocultas). Los perfiles semilla traen
2–5 IDs reales verificados en disco (el E2E lo comprueba: 36 IDs). En el
prompt solo viajan extractos de lectura (≤4 KB/skill); los IDs van en
`skills[]` con el fallback ya existente si el servidor los rechaza.

## Planificador (DAG determinista, testeado)

Tareas con `depends_on`; validación (`orch_validate_plan`): ciclos (con ruta),
dependencias desconocidas/auto-dependencias, duplicados por nombre, agentes o
skills inexistentes, conflictos de escritura (mismo archivo en dos tareas no
terminales), criterios ausentes (aviso). `orch_ready_tasks` calcula el frente
ejecutable. Máquina de estados estricta (8 estados, transiciones cerradas);
reintentos limitados por `max_retries` (FAILED→READY consume intento).

## Ejecución real (store orch.ts)

1. Plan aprobado por el usuario (submit → approve; sin aprobación no arranca).
2. Por tarea lista: perfil + modelo resuelto + gate de Studio (perfiles con
   ACCESS_STUDIO exigen aprobación `studio_op` antes de arrancar).
3. Sesión OpenCode en ámbito proyecto o tmpdir aislado; prompt con rol,
   límites, skills, contexto SOLO de dependencias completadas (no todo el
   historial) y guardarraíl anti-prompt-injection.
4. Guardia de permisos: se deniega fuera del ámbito (auditoría); lo riesgoso
   (`delete_file`, `destructive_command`, sobreescritura protegida…)
   crea approval `risky_op` + WAITING_APPROVAL (la decisión del usuario se
   traslada al permiso real de OpenCode).
5. Timeout por tarea y global; cancelación interrumpe la sesión; pausa deja de
   lanzar (lo en marcha termina).
6. Artefactos con hash SHA-256; checks deterministas (archivos esperados,
   heurística Lua, selene del toolchain cuando hay proyecto).
7. Revisión independiente: otro perfil (QA/seguridad) en sesión separada con
   veredicto JSON estricto; APPROVE→COMPLETED; REJECT→fork+reintento (si quedan)
   o BLOCKED+approval de reintento manual; inconcluyente→WAITING_APPROVAL.
8. Informe final generado (sin puntuaciones inventadas).

## Comunicación y permisos

Mensajes tipados (10 tipos) coordinador↔agentes con archivos referenciados;
el coordinador distribuye solo contexto de dependencias. Permisos: 7 del
modelo (READ/WRITE/EXECUTE/RUN_TESTS/ACCESS_STUDIO/MODIFY_CONFIG/INSTALL),
globales por run + por agente (los perfiles integrados traen los mínimos).
Auditoría de todo: sesiones creadas, denegaciones, revisiones, aprobaciones.

## Persistencia (eval.db, 10 tablas)

agent_profiles, orch_runs, orch_tasks, task_dependencies, agent_executions,
agent_messages, approval_requests, execution_artifacts, agent_audit_log
(+ índices). Migración idempotente junto a la de eval. Sobrevive al reinicio.

## Eventos (mismo bus, sin polling extra)

forge:orchestrator-created/updated/started/paused/completed/failed,
forge:agent-started/progress/completed/failed,
forge:task-created/updated/completed/blocked,
forge:review-requested/completed, forge:approval-required (+ espejo
forge:orch-event). La UI se suscribe; el runner usa el polling de mensajes
ya existente (500 ms).

## Recursos

max_parallel 1–2, task_timeout (1–60 min), global_timeout, max_retries 0–5.
Tokens/coste solo si el servidor los expone por mensaje; si no, null visible
como «no disponible». Sin presupuestos inventados.

## Limitaciones declaradas

- E2E verificado (**TODO OK**, ver `docs/TESTING.md`): usa el modelo default
  del servidor (`/api/model/default`); los gratuitos `mimo/glm/deepseek-free`
  no respondían ese día. Pasar el modelo explícito sí funciona (probado).
- El prompt de cada tarea DEBE incluir la ruta absoluta del ámbito: sin ella
  el modelo puede escribir fuera (observado: write a `Temp/src/...`).
- La revisión JSON depende de que el juez devuelva JSON válido; si no,
  WAITING_APPROVAL manual (nunca se inventa un APPROVE).
- `background` nativo no utilizado (decisión documentada arriba).
- Sin ejecutor TestEZ en Studio: la QA genera specs y valida estático.
- Studio game-modify siempre exige aprobación humana explícita.
- **Aplicar a Roblox** (`orch_apply_to_project`): solo runs completadas con
  tmpdir conservado (uno compartido por run desde esta versión; ya no se borra
  al completar). Copia con garantías: sin path traversal, `default.project.json`
  nunca se pisa (solo se crea si el juego no tiene), conflictos sin `force` no
  tocan nada, topes anti-abuso. Todo auditado.
