# Decisiones técnicas (con justificación)

1. **Tauri 2 + React + TS + Vite** (stack preferente aceptado sin cambios):
   WebView2 presente, MSVC presente, `create-tauri-app@4.7.5` genera base que
   compila. Sin razón demostrada para cambiar.
2. **Zustand** para estado: stores por módulo (`app`, `sessions`), cero
   boilerplate, suficiente para FASE 1; reevaluar solo si el grafo de estado
   lo exige.
3. **Tailwind CSS v4** (`@tailwindcss/vite`): sistema visual propio oscuro vía
   tokens (`forge-*`); sin componentes de terceros que impongan identidad.
4. **Rust posee el ciclo de vida**: `opencode serve --hostname 127.0.0.1 --port`
   como hijo, health `GET /api/info`, kill al cerrar. Nunca se toca el
   background service global (solo existe el handle del hijo).
5. **Frontend→OpenCode directo (loopback) para chat/SSE**: el servidor ya expone
   HTTP+SSE con contratos versionados; pasar el stream por Rust añadiría
   latencia sin seguridad extra (mismo origen de confianza: 127.0.0.1).
6. **Sin carpeta `.opencode` propia en rblx-forge**: las skills se resuelven
   desde el directorio del proyecto padre; duplicarlas rompería la regla 4.
7. **Sin API keys en la app**: ni en config ni en código; proveedores en OpenCode.
8. **Sin `rokit`/`aftman` en la app**: toolchain vendoreado existente en
   `../tools/bin`; la app lo invocará por ruta en FASE 4/5/7.
9. **Paneles colapsables FASE 1; redimensionado por arrastre pendiente**: se
   implementó mostrar/ocultar; el divisor arrastrable llega antes de FASE 8.
10. **CSP `null` (default del scaffold)**: aceptado temporalmente para SSE a
    loopback; endurecer con `connect-src 127.0.0.1:` antes del instalador.
11. **Viewport**: comparador de capturas aportadas, nunca escena inventada.
    Embebido de Studio y render propio descartados con motivos (VIEWPORT.md).
12. **Rechazo a simular**: TestEZ sin runner, multijugador sin Studio, análisis
    visual sin modelo con visión y jerarquía en vivo sin protocolo se declaran
    pendientes con checklist manual, no con UI ficticia.
