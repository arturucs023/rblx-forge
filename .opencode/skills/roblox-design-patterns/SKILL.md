---
name: roblox-design-patterns
description: Patrones de diseño Luau (Service/Controller, Observer, Factory, Singleton, Pool). Úsala cuando organices módulos, eventos o creación de objetos en Roblox.
---

# Patrones de Diseño en Roblox Luau

## Objetivo
Estandarizar la organización del código Luau con patrones probados (Service/Controller, Observer/event-bus, Factory, Singleton, Object pool) para que los sistemas sean extensibles, testeables y sin acoplamiento innecesario.

## Alcance y límites
Diferenciación: `luau-core`, `luau-types`, `luau-performance` y `roblox-core` cubren fundamentos del lenguaje y modelo cliente-servidor; esta skill cubre ingeniería (cuándo aplicar cada patrón y cuándo NO). `roblox-networking` y `roblox-datastores` cubren réplica y persistencia; aquí solo se decide cómo estructurar el código que las usa.

Qué NO hace:

- NO diseña réplica ni persistencia (eso lo cubren `roblox-networking` y `roblox-datastores`).
- NO refactoriza código existente (eso lo cubre `roblox-code-maintenance-refactor` instalada); aquí se diseña estructura nueva o se evalúa un patrón puntual.
- NO sustituye la revisión previa a merge (eso lo cubre `roblox-code-review` de esta serie).

## Casos de uso
1. Separar lógica de servidor (Service) de presentación/cliente (Controller).
2. Desacoplar emisores y oyentes con un event-bus basado en `BindableEvent`.
3. Centralizar creación de entidades (enemigos, items, proyectiles) con Factory.
4. Compartir un único acceso a un recurso (config, RNG con semilla) con Singleton disciplinado.
5. Reutilizar instancias costosas (proyectiles, efectos) con Object pool.

## Proceso paso a paso
1. Lista los sistemas y sus dependencias en una tabla (sistema → depende de → emite hacia). Si hay ciclos, marca el corte.
2. Asigna un patrón por necesidad concreta, no por defecto:
   - ¿Lógica con estado global y API pública? → Service (`ModuleScript` + `require`).
   - ¿N eventos → M oyentes sin acoplar? → Observer/event-bus con `BindableEvent`.
   - ¿Creación con variantes y validación? → Factory.
   - ¿Un único punto de verdad? → Singleton (uno por necesidad, documentado).
   - ¿Crear/destruir es costoso o genera GC? → Object pool.
3. Define la interfaz pública del módulo primero (funciones, eventos, errores). Escríbela en el encabezado del `ModuleScript`.
4. Implementa con dependencias inyectadas (pasa servicios/tablas por constructor o `Init`), nunca con globales implícitos.
5. Añade teardown explícito: toda conexión o instancia creada por el patrón debe tener función de limpieza (`Destroy`/`Cleanup`).
6. Escribe un test de contrato por patrón (ver `roblox-testez`): crear → usar → destruir sin fugas.
7. Revisa con la checklist: ¿puedo sustituir una implementación sin tocar a los consumidores? Si no, simplifica.

## Conocimientos técnicos
- Service/Controller: el Service vive en servidor, expone funciones puras de dominio; el Controller (cliente) solo presenta y pide. La comunicación entre ellos va por la capa de red (ver `roblox-networking`), no por `require` cruzado cliente-servidor.
- Observer con `BindableEvent`/`BindableFunction`: útil dentro del mismo contexto (servidor-servidor o cliente-cliente). No lo uses para cruzar la frontera cliente-servidor.
- `CollectionService`, `Tags` y `Attributes`: sirven para descubrir entidades a las que aplicar componentes o factories sin acoplar jerarquías.
- `ModuleScript` + `require`: base de todos los patrones. Cada patrón es un `ModuleScript` con API mínima y estado encapsulado.
- Singleton con cautela: un Singleton oculta dependencias y dificulta tests. Úsalo solo para recursos genuinamente únicos (config inmutable, semilla central).

Ejemplo ilustrativo (event-bus mínimo, mismo contexto):

```luau
-- ModuleScript: EventBus (ilustrativo)
local EventBus = {}
EventBus.__index = EventBus

function EventBus.new()
	local self = setmetatable({}, EventBus)
	self._events = {} :: { [string]: BindableEvent }
	return self
end

function EventBus:topic(name: string): BindableEvent
	if not self._events[name] then
		self._events[name] = Instance.new("BindableEvent")
	end
	return self._events[name]
end

function EventBus:publish(name: string, payload: any)
	self:topic(name):Fire(payload)
end

function EventBus:destroy()
	for _, e in self._events do
		e:Destroy()
	end
	table.clear(self._events)
end

return EventBus
```

Ejemplo ilustrativo (Factory con validación):

```luau
-- ModuleScript: EnemyFactory (ilustrativo)
local EnemyFactory = {}
local CONFIGS = { Goblin = { Health = 50 }, Golem = { Health = 200 } }

function EnemyFactory.create(kind: string)
	local cfg = CONFIGS[kind]
	assert(cfg, "kind desconocido: " .. tostring(kind))
	return { Kind = kind, Health = cfg.Health }
end

return EnemyFactory
```

## Buenas prácticas
- Un patrón por problema. Si necesitas explicar el patrón más que el problema, es sobreingeniería.
- APIs pequeñas: 3-5 funciones públicas por módulo. Lo demás es local.
- Nombra por rol (`InventoryService`, `EnemyFactory`, `ProjectilePool`), no por patrón (`Manager`, `Handler`, `Util`).
- Inyecta `CollectionService`, `DataStoreService` o `MemoryStoreService` como parámetros donde sea posible para poder mockearlos en tests.
- Documenta cuándo NO usar el patrón al lado de su definición.

## Errores frecuentes
1. Singleton para todo: convierte estado global en "arquitectura". Síntoma: tests que interfieren entre sí. Corrección: pasa dependencias por parámetro.
2. Event-bus como red: usar `BindableEvent` para comunicar cliente↔servidor. No funciona entre contextos; usa la capa de red validada.
3. Factory que construye instancias de `Instance` sin padre ni limpieza: fuga de memoria. Toda Factory de instancias debe devolver también su política de `Destroy`.
4. Pool sin límite ni reset: el pool crece infinito o entrega objetos "sucios". Define capacidad máxima y función `reset`.
5. Observer sin desconexión: conexiones acumuladas que disparan callbacks muertos. Guarda cada conexión y desconéctala en `Destroy`.
6. Service que hace `require` circular con otro Service: el juego no carga. Rompe el ciclo con eventos o un tercer módulo de datos.

## Criterios de calidad y terminado
- [ ] Cada sistema tiene patrón asignado y justificado en una línea (problema → patrón → por qué no otro).
- [ ] Ningún `require` circular; el grafo de dependencias es acíclico y verificable.
- [ ] Todo módulo con conexiones o instancias expone `Destroy`/`Cleanup` y se llama en tests.
- [ ] Cada patrón tiene al menos un test de contrato (crear/usar/destruir) que pasa.
- [ ] No hay globales implícitos (`_G`, `shared`) salvo justificación escrita.
- [ ] Un lector nuevo entiende dónde poner lógica nueva sin preguntar (verificable en revisión).

## Herramientas
- `ModuleScript` + `require` para composición.
- `BindableEvent` / `BindableFunction` para Observer intra-contexto.
- `CollectionService` / `Tags` / `Attributes` para descubrimiento desacoplado.
- `TestService` + TestEZ (ver `roblox-testez`) para tests de contrato.
- Git + Rojo para versionar la estructura (ver `roblox-git-workflows`).

## Limitaciones
- No cubre réplica, persistencia ni profiling; deriva a `roblox-networking`, `roblox-datastores` y `roblox-performance` / MicroProfiler / ScriptProfiler.
- Si dudas de una clase o firma, escribe `(verificar en create.roblox.com/docs)` y no la uses en producción sin confirmar.
- Los ejemplos son ilustrativos y no sustituyen tests del sistema real.
