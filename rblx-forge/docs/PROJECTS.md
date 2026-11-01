# Proyectos (FASE 2)

## Modelo

Carpeta con `forge.project.json` (`name`, `template`, `created_at`, `app`).
Solo esas carpetas pueden eliminarse desde la app (salvaguarda). Recientes y
favoritos en app-data (`recents.json`, máx. 20, se podan las inexistentes).

## Plantillas reales (generan exactamente estos archivos)

- `vacio`: `forge.project.json`, `default.project.json` (DataModel mínimo),
  `README.md`.
- `base-rojo`: lo anterior + `stylua.toml`, `selene.toml`,
  `src/shared/Config.luau`, `src/server/Main.server.luau`,
  `src/client/Main.client.luau`, `tests/Example.spec.luau` (humo TestEZ),
  `README.md`. `init_git` opcional (requiere git en PATH).

## Explorador y seguridad

Todo acceso pasa por `resolve_in_root`: canonicaliza, rechaza absolutos y
prefijos de unidad, resuelve `..`/symlinks y exige que el destino viva en el
proyecto. Tope: archivos >2 MB no se abren; búsqueda literal en
`.luau/.lua/.json/.md/.toml` (máx. 2000 archivos, 100 resultados, omite
`.git/target/node_modules/dist/Packages/.vscode`).

## Rojo

`rojo_detect`/`rojo_validate`: exige `default.project.json` parseable con
`name`+`tree`, lista `$path` ausentes en disco. Binario por orden:
ajuste `toolchain.rojo` → PATH. Sin servidor Rojo aún (FASE 4).

## Sesiones por proyecto

Al abrir un proyecto, la UI filtra/crea sesiones con su `directory`
(`setCwd`); cambiar de proyecto cambia el contexto visible. El servidor no
impone el directorio: la garantía es de UI + disciplina (documentado, no
fingido aislamiento de servidor).
