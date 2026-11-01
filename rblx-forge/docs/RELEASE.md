# Release y distribución (FASE 8G)

## Artefactos (generados con `npm run tauri build`)

- `target/release/rblx-forge.exe` — binario portable (requiere WebView2).
- `bundle/msi/rblx-forge_0.1.0_x64_en-US.msi` (2.94 MiB).
- `bundle/nsis/rblx-forge_0.1.0_x64-setup.exe` (2.12 MiB).

## Estado

Versión 0.1.0 interna. **Sin publicar ni distribuir** (orden explícita del
proyecto). Instalador verificado por construcción + humo del exe (15 s vivo,
cierre limpio); instalación vía MSI/NSIS en máquina limpia: pendiente.

## Antes de cualquier distribución pública

1. Endurecer CSP (`connect-src 127.0.0.1:`, `img-src asset: data: blob:`).
2. Resolver `npm audit` (dompurify/monaco) o documentar aceptación formal.
3. Iconos/metadatos propios (actualmente iconos del scaffold).
4. Actualización controlada: definir canal (sin auto-update integrado aún).
5. `RELEASE.md` por versión: cambios, hashes, requisitos (WebView2, Windows 11).

## Recuperación

Desinstalación estándar de Windows. Datos de usuario en `%APPDATA%/com.rblxforge.forge`
(recientes, settings, historial de tests): se conservan tras desinstalar salvo
borrado manual. Sin migración de esquema aún (v0.1.0).
