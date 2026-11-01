---
name: roblox-git-workflows
description: Git para proyectos Rojo (ramas, .gitignore, conflictos, releases). Úsala cuando organices ramas, ignores o releases de un juego Roblox.
---

# Git para Proyectos Rojo

## Objetivo
Mantener un repo Rojo limpio y colaborativo: ramas predecibles, `.gitignore` correcto, conflictos de `project.json` resolubles y releases trazables, sin binarios ni archivos generados en el historial.

## Alcance y límites
Diferenciación: `roblox-tooling` y `roblox-rojo` (instaladas) describen las herramientas; esta skill cubre flujos de equipo (ramas, ignores, conflictos, releases). `roblox-ci-cd` cubre qué corre en GitHub Actions; aquí se cubre cómo se organiza el repo que alimenta ese pipeline.

Qué NO hace:

- NO define el pipeline CI (ver `roblox-ci-cd`).
- NO revisa código (ver `roblox-code-review`).
- NO guarda places binarios como práctica; todo es texto sincronizable.

## Casos de uso
1. Crear repo Rojo desde cero con ignoring correcto.
2. Colaborar con ramas cortas y PRs revisables.
3. Resolver conflicto en `default.project.json` tras mover archivos.
4. Limpiar un repo que subió `build/`, `.rbxlx` o credenciales.
5. Marcar releases `v*` que disparan publicación.

## Proceso paso a paso
1. Inicializa con layout Rojo estándar (`src/`, `default.project.json`, README con comando de sync/build). Todo el juego sale de texto versionado.
2. Aplica `.gitignore` de Roblox: `build/`, `*.rbxlx`, `*.rbxl`, `_Index/`, `sourcemap.json`, `.DS_Store`, logs locales, y cualquier archivo con llaves.
3. Adopta modelo de ramas: `main` protegida, `feature/<tema>` corta (<3 días), `release/vX` solo para estabilizar. Nada de commits directos a `main`.
4. Commits pequeños y con mensaje `tipo(área): qué` (ej. `feat(combat): valida daño en servidor`). Un commit = un cambio revisable.
5. Sincroniza antes de ramificar (`git pull --ff-only`) y haz rebase de tu rama sobre `main` si divergió; resuelve conflictos de `project.json` regenerando/ordenando, no a mano a ciegas.
6. Ante conflicto en `project.json`: abre ambas versiones, identifica nodos movidos/renombrados, reconstruye con `rojo build` local y confirma que compila antes de marcar resuelto.
7. Marca releases con tags anotados (`v1.2.0` + notas: cambios, migraciones de datos, rollback). El tag es lo que publica `roblox-ci-cd`.
8. Si entró un binario o secreto: elimínalo del historial con la herramienta del equipo, rota el secreto y añade el ignore faltante. No basta con borrarlo en un commit nuevo.
9. Protege `main`: required checks (ver `roblox-ci-cd`), mínimo 1 aprobación (ver `roblox-code-review`), sin force-push.

## Conocimientos técnicos
- Rojo + Git: el `project.json` mapea rutas a jerarquía; mover un archivo sin actualizar el mapa rompe el build. El build local es la prueba de un merge.
- `.gitignore` típico de Roblox: ignora artefactos (`build/`, `*.rbxlx`), índices generados y secretos. El código fuente y configs sí se versionan.
- Tags anotados (`git tag -a v1.2.0 -m "..."`) + `git push --tags` disparan `release.yml`. Respeta semver: MAJOR rompe, MINOR añade, PATCH corrige.
- `git status` limpio antes de sync/build: evita publicar cambios no commiteados por accidente.
- LFS solo si es imprescindible para assets grandes; por defecto, todo texto. Los binarios en Git pudren el historial.
- `sourcemap.json` es generado: se ignora, no se revisa.

Ejemplo ilustrativo (.gitignore mínimo):

```gitignore
# Build y artefactos (ilustrativo)
build/
*.rbxlx
*.rbxl
sourcemap.json
_Index/
*.log
.DS_Store
.env
```

Ejemplo ilustrativo (flujo de rama):

```text
git checkout -b feature/pity-garantizado
# ... cambios pequeños + commits ...
git pull --ff-only origin main
git rebase origin/main
rojo build default.project.json -o build/game.rbxlx
git push -u origin feature/pity-garantizado
```

Ejemplo ilustrativo (tag de release):

```text
git tag -a v1.3.0 -m "Pity garantizado; migracion de inventario v2"
git push --tags
```

## Buenas prácticas
- Ramas cortas y PRs <400 líneas; lo grande se divide.
- `main` siempre verde y jugable (build + tests pasan).
- Mensajes que explican el porqué, no solo el qué.
- Revisa tu propio diff antes de pedir review (detecta binarios y secretos).
- Documenta en README: requisitos, `rojo` versión, comandos de sync/build/test.

## Errores frecuentes
1. Subir `.rbxlx`/binarios: historial gigante. Ignóralos y genera en CI.
2. Commits directos a `main` o force-push: rompe al equipo. Protege la rama.
3. Resolver `project.json` borrando nodos "para que compile": mapa incompleto que publica sin sistemas. Reconstruye y verifica build.
4. `.gitignore` que ignora `src/` o configs reales: el juego no se reconstruye desde cero. Prueba clonar + build en limpio.
5. Secreto commiteado y "arreglado" borrándolo después: sigue en historial. Rota + limpia historial.
6. Tags movidos a mano (`-f`) tras publicar: staging ≠ producción. Nuevo tag, nunca mover.
7. Ramas eternas (>1 semana): conflictos monstruo. Integra cada 1-2 días vía rebase o divide.

## Criterios de calidad y terminado
- [ ] Clon limpio + `rojo build` funciona sin archivos extra (verificable por un compañero).
- [ ] Cero binarios/secretos en historial reciente; `.gitignore` cubre artefactos.
- [ ] `main` protegida con checks requeridos y aprobación mínima.
- [ ] Releases con tags anotados + notas (cambios, migración, rollback).
- [ ] Conflictos de `project.json` resueltos con build local verde antes del push.
- [ ] README con comandos reproducibles (sync/build/test).

## Herramientas
- Git (ramas, tags, rebase) + GitHub (protección, PRs).
- Rojo CLI para validar builds tras merges.
- CI (`roblox-ci-cd`) como red de seguridad del repo.
- `TestService` + TestEZ para validar que el merge no rompió nada (ver `roblox-testez`).

## Limitaciones
- No cubre CI ni revisión; deriva a `roblox-ci-cd` y `roblox-code-review`.
- Comandos exactos de limpieza de historial dependen de la herramienta elegida; verifica antes de reescribir historial compartido.
- Si dudas de una opción de Rojo o Git, anota `(verificar en create.roblox.com/docs)` o en la ayuda de la herramienta.
