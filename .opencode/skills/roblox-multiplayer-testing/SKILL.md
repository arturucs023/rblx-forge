---
name: roblox-multiplayer-testing
description: Pruebas multijugador con 2+ clientes (réplica, races, red pobre). Úsala cuando valides autoridad, concurrencia o device matrix antes de release.
---

# Pruebas Multijugador

## Objetivo
Validar el juego con 2+ clientes reales antes del release: autoridad del servidor, réplica mínima, condiciones de carrera y comportamiento en red pobre y dispositivos distintos, con escenarios reproducibles y criterios de pasa/falla.

## Alcance y límites
Diferenciación: `roblox-testing` (instalada) define QA general y `roblox-testez` cubre unitarias con mocks; esta skill es práctica dedicada multicliente (2+ clientes, races, red). `roblox-networking` diseña la réplica; aquí se verifica. `roblox-ui-testing` verifica pantallas; aquí se verifica concurrencia.

Qué NO hace:

- NO diseña el protocolo de red (ver `roblox-networking`).
- NO sustituye unitarias (ver `roblox-testez`).
- NO automatiza device farm externa; define la matriz mínima ejecutable desde Studio/dispositivos disponibles.

## Casos de uso
1. Dos jugadores recogen el mismo pickup a la vez: solo uno lo obtiene.
2. Compra simultánea con fondos justos: sin duplicar moneda ni items.
3. Jugador que se une tarde recibe estado consistente (ronda, inventario).
4. Red pobre (latencia/pérdida simulada): sin teleports ni ventajas.
5. Join/leave masivo en intermission sin romper la ronda.

## Proceso paso a paso
1. Define escenarios con oracle: estado inicial, acciones por cliente con tiempos, resultado esperado exacto (quién obtiene qué, qué ve cada uno).
2. Levanta sesión con 1 servidor + 2-4 clientes (playtest local multi o dispositivos). Asigna roles: A actúa, B compite/observa, C entra tarde.
3. Ejecuta races deliberadas: misma acción en el mismo tick (pickup, compra, voto). Repite 10 veces; el resultado debe ser determinista en ganador único.
4. Verifica autoridad: intenta trampa desde cliente (montos, posiciones) y confirma rechazo + log. Ningún cliente decide economía o daño.
5. Prueba join tardío y rejoin: entra a mitad de ronda, sal y vuelve; compara su estado contra el oracle (inventario, pity, ronda).
6. Simula red pobre (throttling/latencia donde la herramienta lo permita) y repite 2 escenarios críticos; registra desyncs visibles y tiempo de convergencia.
7. Corre device matrix mínima: PC + móvil (o calidades baja/alta). Verifica FPS jugable, UI legible y mismos resultados de escenarios.
8. Registra evidencia por escenario: pasa/falla, logs de servidor relevantes, captura si hay divergencia visible.
9. Convierte cada fallo en regresión: primero repro en `roblox-testez` si es unitarizable; si es race pura, deja escenario escrito + fix + re-run 10x.

## Conocimientos técnicos
- Autoridad: el servidor es la única fuente de verdad en economía, inventario y daño. El cliente predice/presenta; el servidor confirma o corrige.
- Races típicas: doble pickup, doble compra, doble canje de pity/duplicado. La solución es operación atómica en servidor (comprobar + descontar + otorgar sin hueco).
- `MemoryStoreService` para locks/contadores cross-servidor cuando el diseño lo use; verifica expiración y liberación en tests.
- `MessagingService` para eventos cross-servidor: verifica entrega degradada (puede perderse) y que el juego sigue consistente.
- `DataStoreService`/`OrderedDataStore` bajo concurrencia: usa update transaccional donde aplique (ver `roblox-datastores`) y `pcall` + reintento (ver `roblox-error-handling`).
- Ventanas de join: el servidor debe enviar snapshot completo al entrar tarde, no solo deltas. Verifica snapshot en cada escenario tardío.
- Observabilidad: log de transiciones y de decisiones de autoridad con marcas temporales para ordenar eventos en disputa.

Ejemplo ilustrativo (oracle de doble pickup):

```text
Escenario PICKUP-RACE (ilustrativo)
Inicial: pickup P activo, A y B con 0.
Acción: A y B recogen en el mismo tick (x10 repeticiones).
Esperado: exactamente 1 ganador por repetición, perdedor recibe
"ya recogido", P desaparece para ambos, log de servidor cita ganador.
Falla si: ambos obtienen, ninguno obtiene, o P sigue visible tras otorgar.
```

Ejemplo ilustrativo (checklist de autoridad):

```luau
-- Ilustrativo: qué verificar en cada acción de cliente
-- 1. Servidor valida rango/tipo (assert + typeof)
-- 2. Servidor comprueba fondos/estado ANTES de otorgar
-- 3. Otorgar + descontar en una sola sección atómica
-- 4. Log con jugador, acción, resultado
```

## Buenas prácticas
- Escenarios cortos y repetibles (10x) mejor que "jugar 20 min a ver si sale".
- Un oracle escrito antes de ejecutar; sin oracle no hay falla objetiva.
- Roles fijos por cliente para reproducir; rota roles para cubrir sesgos.
- Evidencia mínima por escenario: resultado, logs, versión/build testeado.
- Automatiza lo repetible (scripts de acciones simultáneas) y deja manual lo exploratorio.

## Errores frecuentes
1. Probar solo con 1 cliente: las races no aparecen hasta producción. Mínimo 2 + join tardío.
2. Confiar en orden de llegada de red como corrección: el orden no es garantía. Atomicidad en servidor.
3. Estado solo con deltas sin snapshot: el que entra tarde ve un mundo roto. Snapshot completo al join.
4. Ignorar red pobre "porque en LAN va bien": el jugador real sufre. Simula degradación en 2 escenarios.
5. Logs solo en cliente para disputas: imposible ordenar eventos. Log autoritativo en servidor.
6. Device matrix sin móvil/baja calidad: el 60% del público descubre el bug. Incluye gama baja.
7. Race que "casi nunca sale" sin fix: en producción sale siempre. 10/10 determinista o no se mergea.

## Criterios de calidad y terminado
- [ ] Escenarios race (pickup, compra, canje) 10/10 con ganador único y estado consistente.
- [ ] Intentos de trampa desde cliente rechazados + logueados (evidencia adjunta).
- [ ] Join tardío y rejoin convergen al snapshot correcto (inventario, ronda, pity).
- [ ] 2 escenarios críticos repetidos en red pobre sin desync permanente.
- [ ] Device matrix mínima (PC + móvil/baja) con FPS y resultados verificados.
- [ ] Cada fallo tiene regresión (test o escenario escrito) y re-run verde.

## Herramientas
- Playtest multi de Studio / dispositivos para 2+ clientes.
- `TestService` + TestEZ para lo unitarizable (ver `roblox-testez`).
- `MemoryStoreService` / `MessagingService` / `DataStoreService` como superficies a estresar.
- MicroProfiler / ScriptProfiler si la concurrencia degrada rendimiento.

## Limitaciones
- No garantiza cobertura de miles de jugadores; es validación pre-release, no test de carga masiva.
- No diseña red ni datos; deriva a `roblox-networking` y `roblox-datastores`.
- Si dudas de límites o firmas, anota `(verificar en create.roblox.com/docs)`.
