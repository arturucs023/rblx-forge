---
name: roblox-error-handling
description: Errores y logging en Luau (pcall/xpcall, asserts, categorías, telemetría). Úsala cuando llamadas a datos fallen en silencio o necesites degradación elegante.
---

# Manejo de Errores y Logging en Roblox

## Objetivo
Que ningún fallo rompa al jugador en silencio ni tumbe el servidor: errores categorizados, `pcall`/`xpcall` con reintentos donde toca, asserts que fallan alto en desarrollo y degradación elegante en producción con telemetría accionable.

## Alcance y límites
Diferenciación: `luau-core` y `roblox-core` cubren sintaxis y ubicación del código; esta skill cubre ingeniería de fallos (categorías, reintentos, logging, degradación). `roblox-datastores` cubre el diseño de datos; aquí se cubre qué hacer cuando esos datos fallan. `roblox-code-review` exige el `pcall`; aquí se define cómo escribirlo.

Qué NO hace:

- NO diseña esquemas de datos ni migraciones (ver `roblox-datastores`).
- NO sustituye tests de fallo (ver `roblox-testez` para inyectar errores).
- NO envía datos a servicios externos de analítica; solo a `DataStoreService`/analítica interna del juego.

## Casos de uso
1. `DataStoreService`/`OrderedDataStore` con throttling o caída: reintentar + degradar a caché.
2. `MemoryStoreService`/`MessagingService` no disponibles: funcionar en modo degradado.
3. Validación de entrada de cliente o de atributos con mensajes útiles.
4. Logging con categorías para depurar en vivo sin spam.
5. Fallo de subsistema no crítico (cosméticos, rarezas) sin bloquear gameplay.

## Proceso paso a paso
1. Clasifica cada error en 3 cubos: Transitorio (reintentar: throttling, red), Permanente (no reintentar: dato corrupto, permiso), Programación (assert: invariante rota).
2. Envuelve todo borde externo (`DataStoreService`, `OrderedDataStore`, `MemoryStoreService`, `MessagingService`) en `pcall`/`xpcall` con reintento acotado (3 intentos, backoff 1s/2s/4s) y jitter si hay contención.
3. Escribe asserts útiles en entradas internas: `assert(cond, "contexto: qué se esperaba, qué llegó, Tag/atributo implicado")`. Falla alto en desarrollo.
4. Implementa degradación por subsistema: define modo degradado (caché en memoria, valores por defecto, funcionalidad desactivada con aviso) y el criterio para entrar/salir.
5. Centraliza logging en un `ModuleScript Logger` con niveles (DEBUG/INFO/WARN/ERROR) y categorías (Data, Net, Economy, UI). Nada de `print` suelto en producción.
6. Añade contexto a cada log: jugador, sistema, operación, intento, latencia. Un log sin contexto no se puede accionar.
7. Telemetría mínima: cuenta errores por categoría en memoria y vuelca agregado a `DataStoreService` u hoja interna (muestreo si hay volumen). Nunca datos personales.
8. Testea los 3 cubos: mock que falla 2 veces y luego ok (transitorio), fallo permanente (degrada), invariante rota (assert dispara en test).
9. Revisa en `roblox-code-review`: todo borde con `pcall`, ningún `pcall` que trague el error sin log.

## Conocimientos técnicos
- `pcall(f, ...)` retorna `(ok, resultado|mensaje)`; `xpcall(f, handler)` permite enriquecer el traceback. Usa `xpcall` con `debug.traceback` (verificar firma exacta en create.roblox.com/docs) en puntos críticos.
- Reintento solo para transitorios. Reintentar un permanente (llave inválida, dato corrupto) multiplica el daño y el throttling.
- Backoff exponencial + límite: evita reintentar en bucle caliente; cede con `task.wait`.
- `assert` para programador, `warn`+degradación para jugador. Nunca muestres stack traces al jugador; muestra mensaje accionable ("tu inventario se cargó en modo temporal").
- Categorías: permiten silenciar por sistema (ej. `LogLevel.Economy = WARN`) sin recompilar.
- `MessagingService`/`MemoryStoreService` pueden no estar disponibles en Studio o con throttling: el código debe arrancar igual en modo local.
- Costo: loguear cada frame o cada evento masivo satura Output y oculta lo importante; muestrea o agrega.

Ejemplo ilustrativo (reintento acotado):

```luau
-- ModuleScript: Retry (ilustrativo)
local Retry = {}

function Retry.withBackoff(fn: (...any) -> any, tries: number): (boolean, any)
	tries = tries or 3
	local waitTime = 1
	for attempt = 1, tries do
		local ok, result = pcall(fn)
		if ok then return true, result end
		warn(string.format("[Data] intento %d/%d falló: %s", attempt, tries, tostring(result)))
		if attempt < tries then task.wait(waitTime) end
		waitTime *= 2
	end
	return false, "agotados los reintentos"
end

return Retry
```

Ejemplo ilustrativo (logger con categorías):

```luau
-- ModuleScript: Logger (ilustrativo)
local Logger = { Level = { DEBUG = 1, INFO = 2, WARN = 3, ERROR = 4 }, _min = 2 }

function Logger.log(level: number, category: string, msg: string, ctx: any)
	if level < Logger._min then return end
	warn(string.format("[%s][%s] %s %s", tostring(level), category, msg, ctx and tostring(ctx) or ""))
end

return Logger
```

Ejemplo ilustrativo (assert útil):

```luau
-- Ilustrativo
assert(typeof(speed) == "number", "SpinComponent.onAdded: atributo 'Speed' debe ser number, llegó " .. typeof(speed))
```

## Buenas prácticas
- Un punto de entrada de error por subsistema (no 5 formas de reintentar datos).
- Mensajes para humanos: qué pasó, qué se hizo (reintento/degradado), qué sigue.
- Niveles coherentes: ERROR = hay que mirar hoy; WARN = degradado conocido; INFO = hito; DEBUG = solo desarrollo.
- Muestrea telemetría si el volumen es alto; guarda agregados, no cada evento.
- Documenta el modo degradado en el README del sistema para soporte.

## Errores frecuentes
1. `pcall` que traga el error (`if not ok then end` vacío): fallo silencioso imposible de depurar. Siempre log + categoría.
2. Reintento infinito sin backoff: convierte un throttling en caída. Acota intentos y espera.
3. Reintentar errores permanentes: llave/permiso mal y se reintenta 10 veces. Clasifica antes de reintentar.
4. `assert` en ruta de jugador en producción para algo recuperable: expulsa al jugador por un cosmético. Usa degradación, no assert, en bordes.
5. `print` por todas partes sin niveles: el Output es ruido y nadie mira. Centraliza en Logger.
6. Log sin contexto (solo "falló"): no accionable. Incluye sistema, operación, intento y jugador/sesión anonimizada.
7. Telemetría con datos personales o cada evento individual: riesgo de privacidad y costo. Agrega y muestrea.

## Criterios de calidad y terminado
- [ ] Todos los bordes externos con `pcall`/`xpcall` + reintento acotado + log categorizado.
- [ ] Matriz de degradación escrita: subsistema → modo degradado → criterio de salida.
- [ ] Cero `print` sueltos; todo pasa por Logger con nivel y categoría.
- [ ] Tests de los 3 cubos (transitorio/permanente/programación) en verde.
- [ ] Telemetría agregada verificable (contadores por categoría visibles en prueba).
- [ ] Revisión (`roblox-code-review`) confirma que ningún error se traga en silencio.

## Herramientas
- `pcall` / `xpcall` + `task.wait` para reintentos.
- `ModuleScript` Logger y Retry reutilizables.
- `DataStoreService` / `OrderedDataStore` / `MemoryStoreService` / `MessagingService` como bordes a proteger.
- `TestService` + TestEZ con mocks que fallan (ver `roblox-testez`).

## Limitaciones
- No implementa backends externos ni promete entrega garantizada de telemetría bajo caída total.
- No cubre diseño de datos; deriva a `roblox-datastores`.
- Si dudas de firmas (`debug.traceback`, límites de reintento de un servicio), anota `(verificar en create.roblox.com/docs)`.
