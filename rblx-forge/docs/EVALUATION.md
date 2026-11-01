# Skill Evaluation Engine — documentación técnica

Motor de evaluación de las 148 skills de RBLX Forge. Implementado, testeado y
verificado (ver `scripts/eval-acceptance.cjs` y tests Rust/vitest).

## Arquitectura

```
Tauri backend (src-tauri/src/eval.rs, SQLite eval.db)
  eval_scan / eval_list_skills / eval_get_skill / eval_analyze
  eval_tech_profile / eval_list|get_benchmarks (30 semillas)
  eval_create_tmpdir / eval_list|read_tmpfiles / eval_cleanup_tmpdir
  eval_save|update|list|get_run / eval_compare_runs / eval_skill_history
  eval_dashboard / eval_prune_runs / eval_export
        ↕ comandos Tauri + eventos forge:* (mismo bus que el resto de la app)
Frontend (src/stores/eval.ts + src/components/Evaluation/*)
  Zustand: registro, benchmarks, cola (concurrencia 1–2), runner, historial
  UI: Resumen · Skills · SkillDetail · Benchmarks · Runs · Comparar · Informes
OpenCode (único motor IA, vía cliente existente + sendPromptFull con skills[])
```

Sin segundo sistema de skills, sin watchers duplicados, sin proveedores externos.

## Qué demuestra cada capa (sin mezclar)

| Capa | Pregunta que responde | Técnica |
|---|---|---|
| Registro | ¿Existe, cambió, se renombró, duplicó, eliminó? | Escaneo de disco (solo lectura) + hash SHA-256 + SQLite |
| Análisis estático (EVAL-A/B/C/D) | ¿Estructura, referencias, calidad, seguridad válidas? | Determinista, reproducible, testeado |
| Perfil técnico (conceptos + EVAL-T) | ¿Menciona / explica / aplica conceptos Roblox? | Evidencia textual; `aplicado` ⇒ NEEDS_VERIFICATION |
| Benchmark funcional | ¿Produce buenos resultados usándose? | OpenCode real en tmpdir aislado + checks de archivos |
| Juicio semántico | ¿Calidad, especialización, completitud? | Sesión OpenCode INDEPENDIENTE, etiquetada, nunca única fuente |
| Scoring | ¿Nota 0–100 honesta? | Pesos 25/25/15/15/10/10; sin criterios ⇒ sin nota |
| Regresión | ¿Empeoró vs su versión anterior? | Snapshots append-only (hash + análisis + runs) |

Ninguna comprobación estática se presenta como prueba funcional: la UI separa
«Checks deterministas [AUTO]» de «Juicio semántico» en cada run.

## Scoring

`tecnica .25 · resultado .25 · especializacion .15 · completitud .15 ·
aplicabilidad .10 · consistencia .10` (`src/lib/eval/scoring.ts`, puro y
testeado). Reglas duras:

- Criterio no evaluado ⇒ NOT_EVALUATED en cobertura, **nunca 0**.
- Sin criterios evaluados ⇒ `score: null`, veredicto NOT_EVALUATED.
- Cualquier CRITICAL (EVAL-*) ⇒ BLOCKED (impide PASSED aunque todo sea 100).
- Checks automáticos fallidos ⇒ FAILED.
- Veredictos: NOT_EVALUATED · PASSED · PASSED_WITH_WARNINGS ·
  NEEDS_IMPROVEMENT · FAILED · BLOCKED.

## Benchmarks (30, semilla en el backend)

UI/UX 6 · gameplay 5 · programación 4 · arte/entorno 4 · personajes 3 ·
multiplayer 3 · economía 2 · audio 1 · tooling/testing 2. Cada uno: objetivo,
contexto, prompt, skills esperadas (IDs del registro), restricciones, criterios
de aceptación, criterios ponderados (auto/semántico) y checks automáticos
(`files_exist`, `min_files`, `min_lines`, `lua_parseable` heurístico).

## Runner (aislamiento real, verificado en eval-acceptance.cjs)

1. Sesión OpenCode en el **workspace** (las skills solo resuelven ahí).
2. Prompt que confina TODA escritura al tmpdir `forge-eval-*` + prohibición
   expresa de tocar el resto.
3. Denegación automática de permisos cuyo recurso quede fuera del tmpdir
   (las aprobaciones dentro del tmpdir las decide el usuario; nada se
   auto-aprueba).
4. Hashes de skills pre/post: si una original cambió ⇒ veredicto BLOCKED.
5. Timeout configurable (defecto 10 min), cancelación (interrumpe la sesión),
   concurrencia 1 (máx 2), cola FIFO, limpieza segura solo de `forge-eval-*`.
6. NUNCA usa CoinGame, proyectos reales ni el servidor global (tests con
   servidor propio en puerto 28982, eliminado tras el test).

Juicio semántico opcional en sesión independiente (juez ≠ generador).

## Almacenamiento (SQLite `eval.db` en app-data, WAL)

Tablas: `skills` (registro + último análisis/score), `benchmarks` (semilla
idempotente), `runs` (transcript recortado a 200 KB, resultados a 100 KB),
`findings` vía JSON en skills, `snapshots` (append-only, nunca se
sobrescriben). `eval_prune_runs` conserva las N más recientes (20–1000):
retención documentada, sin logs infinitos. Sin credenciales (el password de
OpenCode vive solo en memoria, como en el resto de la app).

## Eventos Tauri (mismo bus, sin polling)

`skill_registry_updated · skill_analysis_started/completed ·
benchmark_queued/started/progress/completed/failed/cancelled ·
evaluation_completed · regression_detected` (+ espejo genérico
`forge:eval-event`). La UI se actualiza por suscripción. El registro además
reutiliza `forge:fs-changed` del watcher existente (sin watcher duplicado).

## Seguridad

Skills = contenido no confiable: solo se leen como texto; sus instrucciones
nunca se ejecutan ni configuran el motor. Path traversal bloqueado en
`eval_read_tmpfile`/`eval_cleanup_tmpdir` (contención en tmpdir + extensiones
permitidas + tope 200 KB). Sin descargas, sin installs, sin binarios nuevos
(dependencias añadidas: `rusqlite` bundled, `sha2`, `hex`).

## Limitaciones declaradas (no simuladas)

- `lua_parseable` es heurística de balance (no sustituye a selene).
- `aplicado` en el perfil técnico es evidencia textual, no verificación:
  la corrección real exige contrastar con https://create.roblox.com/docs
  (cada concepto enlaza su página).
- Si el servidor OpenCode rechaza el parámetro `skills[]`, el runner reintenta
  sin él y lo registra (observado en aceptación con IDs no registrados).
- Media de score solo con ≥3 runs puntuadas; en caso contrario la UI muestra
  el estado vacío correspondiente.
- TestEZ/multijugador en Studio siguen pendientes (ver ROADMAP): los
  benchmarks generan código y specs, no los ejecutan en Studio.
