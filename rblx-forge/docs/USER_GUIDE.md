# Guía de usuario (v0.1.0 — FASE 1)

## Primera ejecución

1. Abre RBLX Forge. El módulo Inicio muestra el estado de OpenCode.
2. Pulsa **Detectar** (solo lectura: busca el binario y su versión).
3. Pulsa **Iniciar y conectar**: la app lanza `opencode serve` en 127.0.0.1 con
   puerto libre (empieza en 28894) y verifica `/api/info`. Tu servidor global no
   se toca.
4. Ve al **Asistente IA**: crea una sesión (`+ Nueva`), escribe y envía. La
   respuesta llega en streaming; si OpenCode pide permiso, aprueba o rechaza en
   la banda amarilla.
5. **Detener OpenCode** cierra tus sesiones y el proceso hijo. Al cerrar la app
   ocurre lo mismo automáticamente.

## Lo que ya funciona (verifica cada punto, nada está simulado)

Terminal PTY real · Actividad en vivo del agente (herramientas, archivos,
tokens, coste) · Vigilancia del proyecto con refresco · Diff línea a línea ·
Toolchain con versiones reales · Estado Studio/MCP · Rojo serve/build/tree ·
Editor Monaco con StyLua/Selene y diagnósticos clicables · Biblioteca de 16
referencias con licencias · Centro de pruebas con historial · Comparador de
capturas · Instaladores MSI/NSIS.

## Lo que aún no hace (estados honestos, no simulados)

TestEZ sin runner · multijugador sin Studio · análisis visual por IA (depende
del modelo) · jerarquía/propiedades en vivo de Studio · plugin Rojo +
sincronización extremo a extremo · autocompletado semántico Luau.

## Notas

- Sin cuentas ni claves: los modelos y proveedores se configuran en OpenCode.
- Las skills Roblox del proyecto se usan automáticamente cuando el directorio
  de trabajo de la sesión es el workspace configurado.
