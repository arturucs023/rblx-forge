---
name: roblox-rarity-collectibles
description: Tiers de rareza, odds transparentes, pity y duplicados para coleccionables. Úsala cuando diseñes gacha, sobres, drops o showcases conformes a políticas.
---

# Rarezas y Coleccionables

## Objetivo
Diseñar sistemas de rareza y colección rentables y conformes a políticas: tiers legibles, probabilidades transparentes, pity verificable, gestión de duplicados y showcase social, sin loot opaco ni presión abusiva.

## Alcance y límites
Diferenciación: `roblox-core` y `roblox-datastores` cubren persistencia de inventario; esta skill cubre ingeniería de rareza (odds, pity, duplicados, showcase). `luau-core`/`luau-types` cubren implementación base; aquí se cubre diseño + conformidad.

Qué NO hace:

- NO implementa tiendas ni precios (eso es economía general, fuera de esta skill).
- NO persiste inventario por ti; define qué guardar y deriva el cómo a `roblox-datastores`.
- NO da asesoría legal; ante duda de política, bloquea el diseño y verifica.

## Casos de uso
1. Sobres/cajas con tiers Común→Legendario y odds públicas.
2. Drops de enemigos con pity para rachas malas.
3. Sistema de duplicados → polvo/fragmentos canjeables.
4. Álbum/colección completables con showcase.
5. Eventos temporales con items exclusivos y comunicación clara.

## Proceso paso a paso
1. Define tiers (máx. 5-6) con nombre, color, peso y utilidad real. Si un tier no cambia gameplay ni colección, fusiónalo.
2. Publica odds en el juego antes de la compra/apertura (porcentaje por tier, no solo "raro"). Sin odds visibles no se lanza.
3. Implementa pity explícito: a N aperturas sin tier X, garantía. Documenta N y resetea al obtenerlo. Testea el límite.
4. Diseña duplicados desde el día 1: conversión (3 comunes → 1 raro, polvo → tienda) con tabla pública. Nada de duplicado inútil.
5. Separa pagado de ganado donde la política lo exija; registra fuente por item para auditoría.
6. Construye showcase: álbum, vitrina, inspeccionar colección ajena. La colección es social, no solo inventario.
7. Añade protecciones: confirmación en aperturas pagadas, límites por sesión, historial de aperturas visible.
8. Valida conformidad: revisa políticas vigentes de loot/pagos aleatorios (anota `(verificar en create.roblox.com/docs)` y en políticas de la plataforma) y guarda la revisión con fecha.
9. Testea distribución: simulación de 10k aperturas compara observado vs teórico por tier; pity dispara en el N exacto.

## Conocimientos técnicos
- Tabla de loot como datos (`ModuleScript` de config): `{ Tier, Peso, Items[] }`. El código de sorteo solo lee la tabla; diseñadores ajustan sin tocar lógica.
- Sorteo por peso acumulado con RNG centralizado; semilla fija en tests para reproducibilidad.
- Pity como contador por jugador y pool (`aberturasSinX`). Persiste con el inventario (ver `roblox-datastores`); si se pierde el pity, se pierde confianza.
- Duplicados: al obtener item ya poseído, aplica conversión automática + log visible ("Duplicado → +50 polvo").
- `Attributes` para mostrar rareza en el mundo (`Rarity`, `Tier`) sin acoplar UI a jerarquías.
- `OrderedDataStore` para rankings de colección si hay leaderboards; `DataStoreService` para inventario + pity (con `pcall` + reintento, ver `roblox-error-handling`).
- Transparencia: las odds mostradas deben ser las del código. Genera la UI desde la misma tabla de config, no de textos duplicados.

Ejemplo ilustrativo (tabla de loot + sorteo):

```luau
-- ModuleScript: LootConfig (ilustrativo)
local LootConfig = {
	Tiers = {
		{ Id = "Common", Weight = 70 },
		{ Id = "Rare", Weight = 22 },
		{ Id = "Epic", Weight = 7 },
		{ Id = "Legendary", Weight = 1 },
	},
	PityAt = 50, -- garantía de Epic+ cada 50
}

function LootConfig.roll(rng: Random): string
	local total = 0
	for _, t in LootConfig.Tiers do total += t.Weight end
	local r = rng:NextNumber(0, total)
	local acc = 0
	for _, t in LootConfig.Tiers do
		acc += t.Weight
		if r <= acc then return t.Id end
	end
	return "Common"
end

return LootConfig
```

Ejemplo ilustrativo (pity):

```luau
-- Ilustrativo: contador por jugador
local function applyPity(playerState, rolled: string): string
	playerState.sinceEpic += 1
	if playerState.sinceEpic >= 50 and (rolled == "Common" or rolled == "Rare") then
		playerState.sinceEpic = 0
		return "Epic" -- garantía mínima documentada
	end
	if rolled == "Epic" or rolled == "Legendary" then
		playerState.sinceEpic = 0
	end
	return rolled
end
```

## Buenas prácticas
- Menos tiers, más claros. 4 tiers legibles > 8 confusos.
- Odds con 1 decimal y visibles antes del pago. Nada de "probabilidad aumentada" sin números.
- Pity documentado en el juego, no solo en un doc interno.
- Todo item pagado-aleatorio tiene alternativa ganable o canje por duplicados.
- Historial de aperturas consultable por el jugador.

## Errores frecuentes
1. Odds en texto UI distintas a las del código: fraude aunque sea accidental. Genera UI desde la misma config.
2. Pity que se resetea mal (o no persiste): el jugador con mala racha nunca recibe garantía. Testea persistencia del contador.
3. Duplicado sin valor: el jugador paga por nada. Conversión pública desde el lanzamiento.
4. Tier nuevo que invalida colección previa sin aviso: quema confianza. Comunica y compensa.
5. RNG por apertura con semillas correlacionadas (misma semilla por frame): rachas artificiales. Centraliza RNG.
6. Evento "exclusivo" que vuelve sin avisar: acusa engaño. Define y comunica si es exclusivo o rotativo.
7. Sin límites ni confirmaciones en aperturas pagadas: compras accidentales y reembolsos. Confirma + limita por sesión.

## Criterios de calidad y terminado
- [ ] Tabla de loot única que alimenta código y UI (cero duplicación de odds).
- [ ] Odds visibles pre-apertura y pity documentado con N exacto.
- [ ] Simulación 10k aperturas: desviación por tier dentro del margen definido + pity verificado.
- [ ] Duplicados con conversión pública y log visible al jugador.
- [ ] Revisión de conformidad fechada con enlaces a políticas verificadas.
- [ ] Inventario + pity persisten y sobreviven a rejoin (derivar implementación a `roblox-datastores`).

## Herramientas
- `ModuleScript` de config + `require` como única fuente de odds.
- `DataStoreService` / `OrderedDataStore` para inventario, pity y rankings.
- `Attributes` para rareza visible en mundo.
- `TestService` + TestEZ para simulación de distribución (ver `roblox-testez`).

## Limitaciones
- No sustituye revisión legal ni de políticas; ante cambio de plataforma, re-verifica.
- No diseña economía de precios ni monetización general.
- Si dudas de límites de pago o de divulgación exigida, anota `(verificar en create.roblox.com/docs)` y bloquea lanzamiento.
