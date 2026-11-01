---
name: roblox-horror
description: Horror con tensión, sustos justos, oscuridad legible y audio. Úsala cuando necesites ritmo de miedo, monstruo, linternas y anti-cheat de luz.
---

# Horror (Tensión, Ritmo y Sustos Justos)

## Objetivo
Crear horror que asusta sin frustrar: ritmo tensión→alivio, sustos anunciados por reglas, oscuridad legible, audio como 50% del miedo y trampas anti-cheat de luz.

## Alcance y límites
Versión profunda de género: bucles, progresión, mecánicas, UX, rendimiento y pitfalls.
Diferenciación declarada: `roblox-genre-patterns` es catálogo de 1 línea; esta skill es la versión profunda de horror. `roblox-game-systems` es recetario fino. NO repite: IA de monstruo/persecución detallada se compone con `roblox-combat-systems` (daño/hit) y pathfinding, quests/objetivos con `roblox-quest-progression-systems`, economía de pases con `roblox-economy-balancing`, social/matchmaking con `roblox-social-systems`.

## Casos de uso
- Survival con monstruo que patrulla y escucha.
- Capítulo story de 20 min con 3 sustos guionizados.
- Asimétrico 4v1 con linternas y escondites.
- Horror coop con objetivos y extracción.
- Casa embrujada con eventos aleatorios.

## Bucle de juego o sistema (diseño)
- Bucle 2 min: explorar a oscuras → pista/sonido → decidir (esconder/correr) → alivio breve.
- Bucle capítulo: 3–4 picos de tensión (70–90 s) + valles de 60 s con luz/objetivo claro.
- Bucle sesión: completar objetivos (3–5), sobrevivir/escapar, badge + unlock.
Ritmo: 60% exploración tensa, 25% persecución, 15% calma; sustos cada 4–7 min, nunca 2 en <90 s; batería de linterna 6 min + 2 pilas por capítulo; si el ritmo cardíaco de testers (diversión) cae por sustos cada <2 min, espaciar 30%.

## Proceso paso a paso
1. Define reglas del monstruo en 3 líneas visibles (ej. "te oye correr, no te ve agachado, teme la luz 3 s").
2. Mapa legible a oscuras: siluetas, borde de luz tenue, salidas con señal; oscuridad = contraste, no negro total.
3. Linterna con `SpotLight`: batería, parpadeo al 15%, pilas con `ProximityPrompt`; anti-subir-brillo: la jugabilidad no depende solo de ver.
4. Audio: capas (ambience, pasos, stinger a 2 s del susto, silencio previo 1.5 s); subtítulos opcionales + modo daltónico de señales.
5. Escondites con `Attributes` (`Escondite=true`): entrar con hold 0.8 s, salir con ruido; monstruo revisa 1–2 cercanos, no todos.
6. Objetivos: 3–5 (llaves/fusibles) con orden parcial libre; HUD mínimo con objetivo actual.
7. Sustos justos: siempre hay counter-play (luz, escondite, sprint con stamina); sin jumpscare sin pista previa.
8. Dificultad: día 1 perdonable (monstruo 10% más lento que sprint), noche 2+ real; revive 1 por jugador casual.

## Conocimientos técnicos
### Qué valida el servidor
- Daño/muerte solo por lógica servidor (distancia monstruo–jugador, línea de vista, estado escondido).
- Objetivos: proximidad ≤12 studs + orden permitido + no duplicado.
- Batería/pilas en servidor; cliente no fija `Bateria=100`.
- Escondido real: valida zona + postura; salir genera ruido audible para IA.
### Persistencia
- Guarda capítulo desbloqueado, badges, mejor tiempo y modo (casual/pesadilla) con `DataStoreService`.
- Nunca guardes posición del monstruo; al rejoin reinicia encuentro, conserva objetivos.
### Errores/desconexiones
- Jugador se cae en persecución: monstruo vuelve a patrulla, no campea su cadáver.
- Si el portador de llave se va, la llave reaparece en punto visible en 20 s.
- Stuck en escondite: botón "salir" + teleport suave a 3 m si colisiona.
### Anti-exploit
- Anti-luz máxima: el monstruo usa audición/proximidad servidor, no lo que el cliente renderiza; subir brillo no evita detección.
- Anti-noclip a sala final: valida llaves en servidor antes de abrir.
- Anti-speed en huida: clamp de velocidad; sprint con stamina servidor.
- Rate-limit de interacciones 8/s.

## Buenas prácticas
- Accesibilidad: advertencia de sustos, modo "menos intenso" (menos stingers, misma historia), brillo mínimo garantizado.
- Menores: sin gore excesivo; cumple políticas de Roblox (verificar en create.roblox.com/docs).
- Performance: 1 monstruo con IA barata (tick 0.2 s), luces limitadas (máx 6 dinámicas cerca), niebla en vez de oscuridad por píxel.
- Usa `CollectionService` para sustos reutilizables y `Attributes` para estado (persecución/calma).
- Playtest con 5 personas: si alguien se pierde >3 min, añade señal.

## Errores frecuentes
1. Negro total → jugadores suben brillo y se pierde el miedo; usa gris azulado + focos.
2. Monstruo injusto (más rápido siempre) → rage; 90–95% de velocidad de sprint + atajos para él.
3. Susto sin pista → sensación de trampa; 2 s de audio previo siempre.
4. Objetivos crípticos sin HUD → abandono; 1 línea de objetivo siempre visible.
5. Luces infinitas sin coste → sin tensión; batería + zonas seguras escasas.

## Criterios de calidad y terminado
- [ ] 5 testers nuevos completan capítulo en 18–30 min sin guía externa.
- [ ] 0 muertes sin counter-play en 20 persecuciones (todas tenían luz/escondite/sprint).
- [ ] Subir brillo al máximo no evita detección en 10 pruebas.
- [ ] Batería dura 5–7 min y hay pilas suficientes sin trivializar.
- [ ] Nadie perdido >3 min en 5 runs.
- [ ] 8 jugadores con 1 monstruo ≥45 FPS en mapa oscuro.

## Herramientas
Servicios/clases: `Players`, `Attributes`, `CollectionService`, `ProximityPrompt`, `DataStoreService`, `PathfindingService` (patrulla/persecución), `RemoteEvent`. Sonido con `SoundService` (verificar en create.roblox.com/docs). Componer con `roblox-combat-systems` para daño.

## Limitaciones
- No implementa IA avanzada con sentidos complejos; base aquí + extensión.
- No cubre narrativa ramificada; componer con sistema de quests/diálogo.
- Contenido sensible debe revisarse contra políticas de la plataforma.

```luau
-- Ilustrativo: ¿jugador detectable? (servidor).
local function detectable(escondido: boolean, corriendo: boolean, luzEncendida: boolean, dist: number): boolean
	if escondido and dist > 6 then return false end
	if corriendo and dist < 40 then return true end
	if luzEncendida and dist < 25 then return true end
	return dist < 8
end
```
