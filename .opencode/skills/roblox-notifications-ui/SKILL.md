---
name: Notificaciones y Popups Roblox
description: Cola de avisos, toasts y modales sin spam. Úsala cuando crees notificaciones, confirmaciones, errores globales o banners que no interrumpan el juego.
---

# Notificaciones y Popups Roblox

## Objetivo

Informar sin interrumpir: cada mensaje llega por el canal correcto (toast, banner o modal), con la prioridad correcta, en colas que no se pisan y con una política anti-spam que protege la partida. Lo crítico interrumpe; lo demás espera o se agrupa.

## Alcance y límites

Cubre: sistema de colas por prioridad, toasts, banners, modales, centro de avisos opcional, política anti-spam y accesibilidad de mensajes.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- HUD persistente: lo cubre `roblox-hud` (las notificaciones lo usan, no lo sustituyen).
- Pausa o ajustes: `roblox-pause-menu`, `roblox-settings-ui`.
- Chat entre jugadores: `roblox-text-chat` (aquí solo avisos del sistema).

## Casos de uso

- Toast "¡+200 oro!" que se apila y desaparece en 3 s.
- Banner "Evento en 2:00 en el Volcán" que no bloquea el juego.
- Modal "¿Vender espada legendaria?" con Confirmar/Cancelar.
- Error global "Sin conexión. Reintentando…" persistente hasta recuperar.
- 5 pickups seguidos que se agrupan en "¡+5 objetos!" en vez de 5 toasts.

## Proceso paso a paso

1. **Clasifica cada mensaje.** Crítico (error, pérdida, confirmación destructiva) → modal. Importante (evento, misión completada) → banner/toast persistente. Informativo (pickup, guardado) → toast fugaz. Si todo es modal, todo se ignora.
2. **Define la matriz de canales.** Toast abajo-derecha (PC) / arriba-centro (móvil), banner arriba-centro compacto, modal centrado con overlay. Un mensaje = un canal; documenta las excepciones.
3. **Construye el contenedor.** `ScreenGui` en `PlayerGui` → `Frame` toast-stack (`UIListLayout` vertical, anclado esquina, a `Scale`) + `Frame` banner-slot (1 visible) + `Frame` modal-slot (1 visible con overlay). `DisplayOrder` por encima del HUD, por debajo del menú del sistema.
4. **Implementa la cola con prioridad.** Cola FIFO con 3 niveles; máximo 3 toasts visibles, resto en espera; duración 2.5-4 s por severidad; los críticos saltan a modal y pausan la cola. Agrupa repetidos en ventana de 2 s ("¡+200 oro! x3").
5. **Diseña cada tipo.** Toast = `Frame` + `ImageLabel` icono + `TextLabel` 1-2 líneas + barra de vida opcional; banner = versión ancha con acción ("Ver evento"); modal = título + cuerpo 2-3 líneas + botones Confirmar/Cancelar + cerrar X. Todos con `UICorner`, `UIPadding`, `UIStroke` por severidad.
6. **Anti-spam obligatorio.** Cooldown por tipo, agrupación de repetidos, límite por minuto, modo "No molestar" en combate/jefe (solo críticos) y botón Silenciar avisos no críticos en ajustes. Registra descartes para ajustar.
7. **Accesibilidad.** Duración mínima 4 s si tiene acción, botón de 44+ px, contraste AA, sin depender solo del color (icono + texto), y versión persistente en centro de avisos para lo importante que expiró.
8. **Anima con moderación.** Entrada desliz + fundido 0.2 s vía `TweenService`, salida fundido; modal con escala 0.96→1. Sin sonidos fuertes por defecto; un tick suave opcional configurable.
9. **Verifica bajo fuego.** Dispara 20 avisos en 5 s, simula error de red, abre modal sobre toast, rota el móvil. Nada debe tapar el HUD crítico ni bloquear el juego salvo el modal intencionado.

## Conocimientos técnicos

- Stack de toasts (clases estables):

  ```luau
  -- Ejemplo ilustrativo: encolar un toast
  local stack = script.Parent:WaitForChild("ToastStack") :: Frame

  local function pushToast(text: string)
    local toast = Instance.new("Frame")
    toast.Name = "Toast"
    toast.Size = UDim2.fromScale(0.9, 0.12)
    toast.Parent = stack
    local label = Instance.new("TextLabel")
    label.Text = text
    label.Size = UDim2.fromScale(1, 1)
    label.Parent = toast
    -- Expiración y agrupación se gestionan en el controlador de cola.
  end
  ```

- `UIListLayout` con `SortOrder` por llegada y `Padding`; `CanvasGroup` para fundir toasts completos; `UISizeConstraint` para no invadir media pantalla en móvil.
- Cola en un `ModuleScript` local: `push({nivel, texto, duración, acción})`; el render solo pinta. Límite de visibles + purga por tiempo con `TweenService` y limpieza de instancias.
- Modales: un `Frame` overlay a pantalla completa que captura clics + tarjeta centrada; foco por defecto en la acción segura (Cancelar) salvo que el diseño exija lo contrario documentado.
- `TextChatService` no se usa para avisos del sistema salvo que el juego lo exija; los avisos del sistema viven en esta UI, no en el chat.
- Persistencia: el centro de avisos (si existe) guarda los últimos N importantes en memoria de sesión; nada sensible ni permanente sin servidor.

### Identidad visual de esta skill (original, no copiar)

- Dirección "mensajería sobria": toasts grafito (#1C2233 a 92%) con icono de severidad (info cian #38E1FF, éxito verde #3DDC84, aviso ámbar #FFC53D, error rojo #FF5A5A); banners con franja superior de color; modales en tarjeta clara (#F4F6FB) con texto oscuro.
- Tipografía: toast 14 semibold 1-2 líneas, banner 15 con acción subrayada, modal título 20 + cuerpo 14. Sin mayúsculas sostenidas.
- Composición: toasts 320-360 px equivalentes apilados con gap 8, banner centrado de 560 máx., modal 420-480 centrado. `UICorner` 10-12, `UIStroke` 1 px por severidad.
- Espaciado: `UIPadding` 12-14, iconos 24, botones modales 50/50 con gap 10.
- Estados: info/éxito/aviso/error con icono + color + texto (triple canal), loading solo en modal con acción async (botón deshabilitado + spinner), expirado con fundido, agrupado con contador "x3".
- Animación: solo desliz + fundido 0.2 s; modal escala breve. Prohibido parpadear o rebotar toasts.

## Buenas prácticas

- 1 modal a la vez; si llega otro crítico, se encola, no se superpone.
- Todo toast con acción vive ≥4 s o se guarda en el centro de avisos.
- Textos accionables: "Sin conexión. Reintentando… (Reintentar)" no "Error 500".
- Coherencia total de iconos y colores de severidad en todo el juego.
- Respeta "No molestar": en jefe/combate solo críticos + banner mínimo.
- Mide: si un aviso se descarta el 95% sin clic, baja su prioridad o elimínalo.

## Errores frecuentes

- 10 toasts que tapan el HUD y los botones táctiles en el peor momento.
- Modal por cada pickup que bloquea el juego y se gana el odio del jugador.
- Avisos solo por color que daltónicos no distinguen.
- Cola sin límite que acumula 50 toasts y congela el scroll.
- Doble sistema (HUD + notificaciones) que duplica el mismo mensaje.
- Sonido fuerte por cada toast que obliga a silenciar todo el juego.

## Criterios de calidad y terminado

- [ ] 20 avisos en 5 s se agrupan y no tapan lo crítico ni bloquean el juego.
- [ ] 1 solo modal visible, con foco seguro y cierre claro (X + Cancelar + Esc).
- [ ] Severidades distinguibles por icono + texto + color, con contraste AA.
- [ ] Legible en PC, tablet y móvil sin tapar controles táctiles.
- [ ] Política anti-spam documentada (límites, cooldowns, no-molestar) y verificada.
- [ ] Sin errores en consola ni instancias huérfanas tras 10 minutos de avisos.

## Herramientas

- Studio: prueba de estrés de avisos, simulador móvil, `Output` para fugas.
- MCP Studio (si disponible): capturas de stack/banner/modal sobre gameplay real.
- Rojo: textos y umbrales (duraciones, límites) como datos editables.
- Selene: lint del controlador de cola y de la limpieza de toasts.

## Limitaciones

- No sustituye el log técnico ni la telemetría de errores; es UI para el jugador.
- No gestiona chat entre jugadores ni moderación de texto (verificar en create.roblox.com/docs).
- El centro de avisos aquí es de sesión; el historial persistente requiere servidor.
- Demasiados críticos indican un problema de diseño del juego, no de esta UI.
