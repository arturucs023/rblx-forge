---
name: roblox-exterior-architecture
description: Diseña edificios exteriores legibles y escalados al avatar. Úsala cuando necesites fachadas, entradas, tejados, ritmo de vanos o masas de edificios.
---

# Arquitectura exterior en Roblox

## Objetivo

Producir edificios exteriores que se lean bien a distancia, se recorran bien de cerca y estén escalados al avatar, con masas claras, fachadas con ritmo y entradas localizables en menos de 10 segundos.

## Alcance y límites

Hace: masas y proporciones de edificios, composición de fachada (vanos, ritmo, cornisas, zócalos), entradas y transiciones interior/exterior, tejados y remates, escalado respecto al avatar, repetición modular de fachadas.

NO hace:

- Interiores (zonas, mobiliario, circulación interna) → `roblox-interior-design`.
- Trazado urbano (calles, distritos, zonificación) → `roblox-city-settlements`.
- Terreno y biomas bajo el edificio → `roblox-terrain-sculpting`.
- Vegetación perimetral → `roblox-vegetation-landscaping`.
- Paleta de materiales y variantes → `roblox-materials-surfaces`.
- Iluminación diurna/nocturna → `roblox-lighting-day-night`.
- Decoración fina y señalética → `roblox-props-decoration`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo exterior arquitectónico). `roblox-visual-design` y `robloflox-art-direction` —corrección: `roblox-visual-design` y `roblox-art-direction`— dirigen (deciden estilo y aprueban); esta skill ejecuta (construye el edificio).

## Casos de uso

1. Bloque de viviendas que se repite 6 veces en una manzana sin parecer clonado.
2. Tienda con entrada que el jugador encuentra sin ayuda a 40 studs de distancia.
3. Torre que funciona como landmark y no rompe la escala del barrio.
4. Nave industrial reconvertida en zona jugable con ritmo de fachada claro.
5. Reforma de fachada existente que se ve plana o desproporcionada.

## Proceso paso a paso

1. **Fija programa y huella.** Anota: uso (vivienda/tienda/cívico), nº de plantas, huella en studs (ej. punto de partida: 24×16, no verdad). Bloquea la huella con Parts simples antes de detallar.
2. **Define la masa en 3 volúmenes máximo.** Base (zócalo, 1 planta), cuerpo (repetición), remate (cornisa/tejado). Verifica: silueta legible en captura a 150 studs con niebla desactivada.
3. **Escala al avatar.** Puerta punto de partida: 4 studs ancho × 7 studs alto. Ventana punto de partida: alféizar a 3 studs del forjado. Comprueba con un avatar R15 al lado: el dintel queda a ~1,5× la altura del avatar.
4. **Compón la fachada con ritmo A-B-A.** Alterna vano/macizo con un módulo fijo (punto de partida: módulo de 4 studs). Regla verificable: ningún paño macizo supera 3 módulos sin una junta, cornisa o cambio de plano.
5. **Marca la entrada.** Retranquea 2 studs, añade marquesina o pórtico, cambia material del marco y duplica la iluminación respecto al resto de fachada. Test: a 40 studs y de noche, la entrada es el punto más brillante.
6. **Resuelve el tejado según clima del juego.** Plano con pretil (urbano), inclinado a dos aguas (rural), diente de sierra (industrial). El alero vuela 1–2 studs; verifica que no atraviesa la cámara en calles de menos de 12 studs.
7. **Añade profundidad por capas.** Capa 1: plano base. Capa 2: recercos/jambas con 0,25–0,5 studs de relieve. Capa 3: balcones/cornisas puntuales. Límite: máximo 3 capas; más capas = ruido y overdraw.
8. **Modulariza.** Convierte un tramo de fachada (punto de partida: 12 studs) en Model reutilizable con pivote en esquina. Nombra: `FAC_A_Ventana`, `FAC_B_Ciega`, `FAC_Entrada`. Reutiliza, no reconstruyas.
9. **Integra con suelo y calle.** Zócalo de 1–2 studs con material resistente, acera perimetral de 4 studs mínimo, rampa donde haya escalón mayor de 1 stud.
10. **Pasa QA de arquitectura.** Checklist en § Criterios; corrige y documenta variantes (color/material) en una carpeta `Variantes`.

## Conocimientos técnicos

- Escala avatar: R15 ≈ 5 studs de alto. Puertas, barandillas (punto de partida: 3 studs) y peldaños (punto de partida: huella 2, contrahuella 0,6) derivan de ahí. Son puntos de partida, no verdad.
- Profundidad con Parts: pilastras y cornisas como Parts finas separadas del muro dan sombra real barata sin Decal/Texture.
- MeshPart y SpecialMesh: reserva MeshPart para remates repetidos (cornisas, capiteles); SpecialMesh solo para prototipado rápido, no para fachada final masiva.
- Decal/Texture: solo para despieces sutiles (ladrillo, paneles) a densidad baja; si el patrón se repite visiblemente a 10 studs, aumenta el tamaño del tile o cambia a geometría.
- MaterialService y MaterialVariant: un MaterialVariant por acabado de fachada (ladrillo, revoco, panel). No crees un variant por edificio.
- Colisiones: muros y cornisas bajas con colisión; ornamentos por encima de 8 studs sin colisión (CanCollide off) para ahorrar física.
- Cámara: en calles estrechas (<12 studs) evita voladizos a menos de 9 studs de altura; la cámara los atravesará.

## Buenas prácticas

- Trabaja de lejos a cerca: silueta → masa → ritmo → detalle. Nunca detalles sin masa bloqueada.
- Repite con variación: 3 tramos base combinados dan 6+ fachadas distintas rotando orden y color.
- Contraste controlado: marco de vanos un tono más oscuro o un material distinto, nunca más de 2 materiales por fachada más el zócalo.
- Entrada siempre en esquina visible o eje de simetría; jamás en paño ciego lateral.
- Documenta el módulo (ej. "módulo 4, altura planta 8") en el nombre del Model para que otro constructor lo reutilice.

## Errores frecuentes

1. **Ventanas a escala de casa de muñecas.** Vanos de 2×2 en muros de 12 studs: el edificio parece maqueta. Corrección: vano mínimo punto de partida 3×4 por planta de 8 studs.
2. **Fachada plana con textura.** Solo Decal de ladrillo sin relieve: de noche se ve cartón. Corrección: añade jambas con 0,5 studs de relieve.
3. **Seis materiales en un edificio.** Ruido visual y draw calls. Corrección: reduce a 2+zócalo.
4. **Entrada invisible.** Misma puerta que el resto sin marquesina ni luz. Corrección: retranqueo + cambio de material + PointLight cálido.
5. **Tejado que atraviesa la cámara.** Aleros grandes en calle estrecha. Corrección: reduce vuelo o sube alero por encima de 9 studs.
6. **Clones obvios.** Misma fachada 6 veces seguidas. Corrección: alterna 3 tramos y varía zócalo/cornisa.
7. **Escala monumental accidental.** Plantas de 14 studs en vivienda: el avatar parece hormiga. Corrección: planta vivienda punto de partida 7–9 studs.

## Criterios de calidad y terminado

- [ ] Silueta legible a 150 studs (captura sin niebla).
- [ ] Entrada localizable en ≤10 s a 40 studs de día y de noche.
- [ ] Ningún paño macizo >3 módulos sin articulación.
- [ ] Avatar de prueba junto a puerta: proporción creíble (foto de referencia guardada).
- [ ] ≤3 materiales de fachada + zócalo; MaterialVariant nombrados.
- [ ] Tramo modular guardado como Model reutilizable con pivote correcto.
- [ ] Sin voladizos que bloqueen cámara en calles <12 studs (recorrido grabado).
- [ ] Zócalo, acera y acceso sin escalones >1 stud sin rampa.

## Herramientas

- Parts y Models para bloqueo y modularidad; MeshPart para remates repetidos.
- MaterialService / MaterialVariant para acabados de fachada.
- Decal / Texture solo para despiece sutil (verificar densidad en create.roblox.com/docs si dudas del tiling).
- PointLight / SpotLight para marcar entradas (detalles nocturnos con `roblox-lighting-day-night`).

## Limitaciones

- No cubre cálculo estructural real ni normativa: las proporciones son visuales y jugables.
- No genera interiores ni distribuye parcelas urbanas (ver skills enlazadas).
- Si dudas de una propiedad de Lighting/Atmosphere al integrar el edificio, escribe "(verificar en create.roblox.com/docs)" en la nota y no la afirmes.
- Distingue referencia visual (foto/boceto de inspiración) de asset importable: no afirmes que un modelo o textura existe sin crearlo o localizarlo en el proyecto.
