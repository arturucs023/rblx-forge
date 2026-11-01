---
name: roblox-testez
description: TestEZ en serio (specs, mocks, runner en Studio/CLI, qué testear). Úsala cuando añadas tests unitarios o de sistema en Roblox Luau.
---

# TestEZ en Serio

## Objetivo
Instalar una práctica de tests que atrape regresiones: specs organizadas, mocks de servicios (`DataStoreService`, `MemoryStoreService`, `CollectionService`), runner en Studio y CLI compartido, y criterio claro de qué testear por sistema.

## Alcance y límites
Diferenciación: `roblox-testing` (instalada) es el paraguas QA (estrategia general); esta skill es la práctica dedicada de TestEZ (estructura, mocks, comandos). `luau-types` cubre tipos; aquí solo se exige que lo testeado tenga contrato verificable. Multijugador y UI tienen skills propias.

Qué NO hace:

- NO cubre pruebas con 2+ clientes (ver `roblox-multiplayer-testing`).
- NO cubre recorridos visuales por pantalla (ver `roblox-ui-testing`).
- NO sustituye CI (ver `roblox-ci-cd`); le entrega el comando que el CI ejecuta.

## Casos de uso
1. Testear un `ModuleScript` puro (loot, pity, máquina de estados).
2. Testear componente con ciclo añadir/quitar sin fugas.
3. Mockear `DataStoreService`/`MemoryStoreService` que fallan o throttean.
4. Correr la suite en Studio antes del push y en CLI en CI.
5. Fijar regresión: test que reproduce el bug antes del fix.

## Proceso paso a paso
1. Estructura: `specs/<Sistema>_<aspecto>.spec.lua` espejando `src/`. Un spec por comportamiento, nombre que dice qué verifica.
2. Usa `describe/it/expect` canónicos de TestEZ; cada `it` verifica UNA cosa con nombre en presente ("retorna Epic al llegar a pity 50").
3. Aísla con mocks: sustituye servicios por dobles inyectados (tablas con la misma interfaz). Nunca pegues a datos reales desde tests.
4. Fija semilla de RNG en tests de probabilidad; las aserciones de distribución usan conteos, no un roll individual.
5. Añade lifecycle hooks (`beforeEach/afterEach`) que limpien conexiones, tablas y Tags para que los specs no interfieran.
6. Crea UN script runner de tests (`run-testez.sh` o equivalente) que use el mismo comando en local y en CI. Documenta cómo correr 1 spec y toda la suite.
7. Ejecuta en Studio (`TestService`) durante desarrollo para iterar rápido; valida en CLI/headless para CI. Ambos deben dar el mismo resultado.
8. Mide qué testear por sistema con la matriz: puros (100% ramas), componentes (ciclo + fugas), datos (reintento + degradación), UI-lógica (estados, no píxeles).
9. Ante bug: escribe primero el test que falla, luego el fix, y deja el test como regresión. Sin test, el fix no se mergea.

## Conocimientos técnicos
- TestEZ corre bajo `TestService`; los specs son `ModuleScript` que retornan función `describe`. El runner los descubre por convención de nombres.
- Mocks: pasa dependencias por parámetro (constructor/`Init`) para poder inyectar dobles. El código no testeable suele ser código acoplado a globales.
- `CollectionService` en tests: usa Tag temporal único por spec (ej. `Test_Spin_<id>`) y límpialo en `afterEach` para no contaminar Studio.
- Servicios de datos: mock con modos (ok / falla N veces / throttling) para verificar reintentos de `roblox-error-handling`.
- `BindableEvent` en tests mismo contexto: sirve para verificar que el sistema emite lo esperado sin red.
- Cobertura útil > cobertura total: exige ramas de guardas, pity, reintentos y `onRemoved`; no persigas 100% de líneas cosméticas.
- Tiempo: cada spec debe correr en ms; si un test necesita `task.wait` largos, es test de integración, sepáralo y márcalo.

Ejemplo ilustrativo (spec de pity):

```luau
-- specs/Loot_pity.spec.lua (ilustrativo)
return function()
	local Loot = require(game.ReplicatedStorage.src.LootConfig)

	describe("pity", function()
		it("garantiza Epic al llegar al limite", function()
			local state = { sinceEpic = 49 }
			-- applyPity expuesto para test; ilustrativo
			local got = Loot.applyPity(state, "Common")
			expect(got).to.equal("Epic")
			expect(state.sinceEpic).to.equal(0)
		end)
	end)
end
```

Ejemplo ilustrativo (mock de datastore con fallos):

```luau
-- Ilustrativo: doble que falla 2 veces
local function flakyStore(failures: number)
	local calls = 0
	return {
		get = function(_key: string)
			calls += 1
			if calls <= failures then error("throttled") end
			return { coins = 10 }
		end,
		calls = function() return calls end,
	}
end
```

Ejemplo ilustrativo (runner único):

```bash
# run-testez.sh (ilustrativo)
set -e
rojo build default.project.json -o build/test.rbxlx
run-in-roblox --place build/test.rbxlx --run TestService # adapta a tu runner CLI
```

## Buenas prácticas
- Un `it`, una aserción conceptual. Nombres que leídos en lista cuentan la especificación.
- Tests deterministas: semilla fija, sin red, sin tiempo real salvo marcado.
- Limpieza obsesiva en `afterEach`: conexiones, Tags, tablas globales de test.
- Fija el bug con test primero; documenta el ID del bug en el spec si ayuda.
- Suite rápida (<2 min). Lo lento va a nightly, no al PR.

## Errores frecuentes
1. Pegar a `DataStoreService` real desde tests: datos corruptos y tests flaky. Siempre mock.
2. RNG sin semilla: test que pasa 9/10 veces. Fija semilla y aserta distribución, no un caso.
3. Specs que comparten estado global: orden-dependientes. `beforeEach` crea, `afterEach` destruye.
4. Tags de test que quedan en el place: contaminan siguientes runs. Limpia en `afterEach`.
5. Solo tests "felices": el pity, el reintento y el `onRemoved` sin cubrir. Testea bordes y fallos.
6. Runner distinto en local y CI: "aquí pasa". Un único script compartido.
7. Tests lentos con `task.wait(5)` en el path del PR: todos evitan correrlos. Sepáralos como integración.

## Criterios de calidad y terminado
- [ ] Estructura `specs/` espeja `src/`; cada sistema crítico tiene spec.
- [ ] Mocks para todo borde externo; cero llamadas reales en la suite del PR.
- [ ] `beforeEach`/`afterEach` limpian estado; la suite pasa en cualquier orden y 3 veces seguidas.
- [ ] Mismo comando local = CI, documentado en README.
- [ ] Regresiones fijadas con test que fallaba antes del fix (evidencia en el PR).
- [ ] Tiempo de suite del PR <2 min o desglose nightly justificado.

## Herramientas
- TestEZ bajo `TestService` como runner base.
- `ModuleScript` + `require` con inyección para mocks.
- `CollectionService` / `BindableEvent` como puntos de prueba intra-contexto.
- Git + CI para puerta (ver `roblox-ci-cd`, `roblox-code-review`).

## Limitaciones
- No cubre multicliente ni UI visual; deriva a `roblox-multiplayer-testing` y `roblox-ui-testing`.
- El runner CLI exacto depende del stack del equipo; adapta el script y verifica.
- Si dudas de APIs de TestEZ o del runner, anota `(verificar en create.roblox.com/docs)`.
