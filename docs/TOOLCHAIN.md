# Toolchain

Todo en `tools/bin/` (Windows x64, verificado `--version` el 2026-11-01).
Nada instalado globalmente; `aftman` del usuario (0.3.0) no se usa.

| Herramienta | Versión | Origen | Licencia | Uso |
|---|---|---|---|---|
| Rojo | 7.7.1 | `rojo-rbx/rojo` | MPL-2.0 | `rojo serve/build`, sync disco↔Studio |
| StyLua | 2.6.0 | `JohnnyMorganz/StyLua` | MPL-2.0 | formato (`stylua.toml`: tabs, 120 col) |
| Selene | 0.32.0 | `Kampfkarren/selene` | MPL-2.0 | lint (`selene.toml`: `std = "roblox"`) |
| Wally | 0.3.2 | `UpliftGames/wally` | MPL-2.0 | dependencias Luau (`wally.toml`) |
| TestEZ | 0.4.1 (índice) | `Roblox/testez` vía wally-index | Apache-2.0 | tests BDD en `Packages/` |

## Decisiones (investigación 2026-11-01, releases verificados vía GitHub API)

- **Rokit sí, Aftman no**: Aftman está archivado (v0.3.0, 2024-05); Rokit es el
  sucesor oficial. No se instaló Rokit porque auto-instalación escribe fuera del
  proyecto; los binarios vendoreados cumplen la misma función sin estado global.
- **Mantle no**: `blake-mealby/mantle` declara "no longer maintained". Sin IaC.
- **Wally 0.3.2**: última release 2023-06, índice activo (instalación probada OK).
  Sucesores (`pesde`) vigilados, no adoptados.
- **TestEZ**: consumido como paquete Wally (vía recomendada). Ejecutarlo requiere
  Studio/CI → configurado, no ejecutado (ver `docs/TESTING_GUIDE.md`).

## Comandos

```powershell
tools/bin/rojo/rojo.exe serve          # live sync (requiere plugin Rojo en Studio: paso manual)
tools/bin/rojo/rojo.exe build -o game.rbxlx
tools/bin/stylua/stylua.exe --check src/
tools/bin/selene/selene.exe src/
tools/bin/wally/wally.exe install
```
