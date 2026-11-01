---
name: roblox-ci-cd
description: CI/CD con GitHub Actions para Roblox (selene, StyLua, tests, build Rojo, publish). Úsala cuando automatices checks, builds o publicaciones del juego.
---

# CI/CD para Roblox con GitHub Actions

## Objetivo
Automatizar calidad y publicación: cada push corre lint (selene), formato (StyLua) y tests; cada tag construye con Rojo y publica a Roblox vía Open Cloud con llaves, con versiones trazables y rollback conocido.

## Alcance y límites
Diferenciación: `roblox-tooling`, `roblox-rojo` y `roblox-mcp` (instaladas) describen herramientas; esta skill cubre flujos de equipo (pipeline, secretos, versiones, gates). `roblox-git-workflows` cubre ramas y conflictos; aquí se cubre qué corre en cada evento de GitHub.

Qué NO hace:

- NO gestiona ramas ni resuelve conflictos (ver `roblox-git-workflows`).
- NO escribe los tests; exige que existan (ver `roblox-testez`).
- NO expone llaves ni publica desde la máquina local como práctica habitual.

## Casos de uso
1. PR con checks automáticos de lint + formato + tests.
2. Build de `project.json` con Rojo en cada merge a `main`.
3. Publicación a un place de staging en cada tag `v*`.
4. Promoción staging → producción con aprobación manual.
5. Versionado trazable (tag ↔ commit ↔ artefacto publicado).

## Proceso paso a paso
1. Fija el pipeline mínimo: `lint (selene)` → `format-check (StyLua)` → `tests` → `build (Rojo)`. Si un paso falla, los siguientes no corren.
2. Crea workflows separados: `ci.yml` (en push/PR), `release.yml` (en tag `v*`, con `workflow_dispatch` para re-lanzar).
3. Pinea versiones de acciones y herramientas (selene, StyLua, Rojo CLI) con SHA o versión exacta; documenta cómo actualizarlas.
4. Guarda secretos en GitHub Secrets/Environments: llave Open Cloud, IDs de universo/place. Nunca en el repo ni en logs (enmascara salidas).
5. Implementa publish solo desde `release.yml` y solo con artefacto construido en el mismo run (no re-construyas entre jobs sin compartir artefacto).
6. Añade gates: `main` protegida (checks requeridos), publish a producción requiere aprobación de environment.
7. Publica primero a staging, verifica (smoke test o checklist de `roblox-ui-testing`), luego promueve a producción con el mismo artefacto.
8. Etiqueta cada publicación con versión visible en el juego (atributo o pantalla de créditos leída desde el tag) para trazar bugs a builds.
9. Define rollback: republicar el artefacto anterior (guarda N artefactos) + pasos escritos. Practícalo una vez antes de necesitarlo.

## Conocimientos técnicos
- Jobs típicos: checkout → setup herramientas → selene → `stylua --check` → tests → `rojo build` → upload-artifact → publish Open Cloud.
- Selene y StyLua son puertas rápidas: fallan el PR antes de revisión humana (ver `roblox-code-review`).
- Rojo CLI construye `project.json` → `.rbxlx`; el workflow debe fallar si el build advierte de archivos faltantes.
- Open Cloud publish requiere llave con scopes mínimos y rotación periódica; usa Environments distintos para staging/producción.
- `workflow_dispatch` permite re-publicar un tag sin crear commits falsos.
- Caché de dependencias solo si hay gestor de paquetes; si no, evita caché prematura que oculte fallos.
- Los tests en CI deben ser los mismos que en local (misma semilla/comando) para evitar "en CI falla distinto".

Ejemplo ilustrativo (ci.yml mínimo):

```yaml
# .github/workflows/ci.yml (ilustrativo)
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint (selene)
        run: selene src # versión pineada en el repo
      - name: Format check (StyLua)
        run: stylua --check src
      - name: Build (Rojo)
        run: rojo build default.project.json -o game.rbxlx
```

Ejemplo ilustrativo (puerta de tests):

```yaml
# fragmento ilustrativo
      - name: Tests
        run: ./run-testez.sh # mismo script que en local (ver roblox-testez)
```

Ejemplo ilustrativo (versión visible):

```luau
-- Ilustrativo: leer versión en juego
local buildTag = "v0.0.0+local" -- CI la sustituye por el tag en release
print("Build: " .. buildTag)
```

## Buenas prácticas
- Pipeline rápido (<10 min) o se evita. Paraleliza lint/format/tests.
- Un solo camino a producción (release.yml). Nada de publishes manuales sin registrar.
- Secretos mínimos por environment; rotación calendarizada y documentada.
- Artefactos inmutables: lo que se prueba en staging es lo que sale a producción.
- Notifica el resultado al PR (checks nativos bastan; no añadas bots sin valor).

## Errores frecuentes
1. Llave en el código o en logs: rotación de emergencia. Usa Secrets + enmascarado.
2. Publish manual "rápido" fuera del pipeline: versión sin traza. Todo publish pasa por release.yml.
3. Herramientas sin pineal (`latest`): el pipeline rompe solo. Pinea y actualiza a propósito.
4. Tests distintos en CI y local: falsos rojos/verdes. Un único script de tests compartido.
5. Build que ignora warnings de Rojo (archivos fuera de `project.json`): publica incompleto. Falla ante warnings.
6. Sin rollback practicado: el incidente dura horas. Guarda artefactos y escribe el procedimiento.
7. Gates sin protección de rama: se mergea en rojo. Activa required checks en `main`.

## Criterios de calidad y terminado
- [ ] `ci.yml` corre lint + formato + tests + build en cada PR y bloquea merge en rojo.
- [ ] `release.yml` publica solo desde tags, a staging primero, con aprobación para producción.
- [ ] Cero secretos en repo/logs; scopes mínimos y environments separados verificables.
- [ ] Artefacto de staging === artefacto de producción (mismo hash).
- [ ] Versión del tag visible/trazable desde el juego.
- [ ] Rollback documentado y probado al menos una vez.

## Herramientas
- GitHub Actions + GitHub Secrets/Environments.
- Selene, StyLua, Rojo CLI (versiones pineadas).
- Git + tags para versiones (ver `roblox-git-workflows`).
- TestEZ vía `TestService` para la puerta de tests (ver `roblox-testez`).

## Limitaciones
- No ejecuta Studio con UI en CI de forma fiable; los tests de UI multicliente se hacen fuera (ver `roblox-multiplayer-testing`, `roblox-ui-testing`).
- No cubre estrategia de ramas; deriva a `roblox-git-workflows`.
- Comandos y endpoints exactos de Open Cloud cambian; verifica en `(verificar en create.roblox.com/docs)` antes de producción.
