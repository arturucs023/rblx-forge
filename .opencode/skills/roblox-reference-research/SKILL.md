---
name: Investigación de Referencias Roblox
description: Encuentra, verifica y organiza referencias visuales para construcciones Roblox. Úsala cuando un build necesite un look, antes de la dirección de arte o para ampliar la biblioteca local de referencias.
---

# roblox-reference-research

Las referencias son evidencia, no decoración. Cada imagen que conserva el
proyecto debe ser real, estar en disco, tener licencia para uso local y estar
indexada. Nunca inventes URLs, autores ni licencias. Si una candidata no se
puede verificar, no entra en la biblioteca.

## Objetivo

1. Responder una pregunta visual ("muro de piedra medieval", "luz cálida de
   interior") con 2–4 imágenes concretas de `references/`.
2. Verificar cada imagen nueva: URL directa estable, fichero real (magic bytes
   + preview renderizado), licencia + autor + página fuente exactos.
3. Mantener el índice (`docs/REFERENCE_LIBRARY.md`) veraz: nombre, categoría,
   fichero, URL fuente, autor, licencia, descripción, etiquetas, fecha.

## Alcance y límites

- Cubre: búsqueda local, vetting con criterios de licencia, descarga honesta,
  atribución y moodboards.
- NO genera imágenes ni hace concept art (eso es trabajo manual/externo).
- NO aprueba licencias dudosas: ante la duda, se descarta la candidata.

## Casos de uso

- Un build necesita un look y hay que responder con referencias reales.
- Ampliar `references/` con una categoría nueva.
- Auditar que el índice y los ficheros siguen siendo válidos.

## Proceso paso a paso

1. **Busca primero en local.** Lista ficheros coincidentes bajo `references/`;
   prefiérelos a la web. Cita rutas, no impresiones.
2. **Fallback web.** Páginas File: de Wikimedia Commons (verifica con
   `imageinfo`/`extmetadata`: artista, `LicenseShortName`), o bibliotecas CC0
   cuya página de licencia abras de verdad (p. ej. kenney.nl). Permitido: CC0,
   dominio público, CC BY, CC BY-SA. Rechazado: páginas "free download" sin
   licencia, thumbnails de buscadores, URLs con caducidad/tokens, granjas de
   wallpapers IA.
3. **Descarga honesta.** Prefiere variantes `thumb.wikimedia.org` con tamaño
   cuando el host full limite; registra qué variante se guardó. Verifica magic
   bytes (`FF D8 FF` JPEG / `89 50 4E 47` PNG) y abre la imagen tú mismo.
4. **Atribución.** CC BY / CC BY-SA exigen crédito: autor + licencia + enlace
   en el índice. CC0/PD también registran autor y fuente.
5. **Moodboards.** Un moodboard es un conjunto de ficheros + una línea de
   intención por imagen ("ritmo de textura de muro", "paleta nocturna"), nunca
   una imagen generada presentada como referencia.

## Conocimientos técnicos

- Licencias: CC0/PD (uso libre), CC BY (atribución), CC BY-SA (atribución +
  compartir igual). Formatos y magic bytes para verificación.

## Buenas prácticas

- Verificar antes de indexar, siempre en ese orden.
- Una imagen, una fila de índice completa; sin filas a medias.
- Revisa periódicamente que los enlaces fuente sigan vivos.

## Errores frecuentes

- Guardar desde el preview del buscador e inventar autor/licencia.
- Mezclar concept art generado en la biblioteca de referencias (los outputs IA
  van en `references/concept-art/` claramente etiquetados, nunca como referencias).
- Carpetas de categorías vacías "para luego": solo cuentan ficheros indexados.

## Criterios de calidad y terminado

- [ ] Cada imagen indexada abre, coincide con su descripción y tiene fuente +
  autor + licencia registrados.
- [ ] Sin enlaces rotos, sin CC BY/SA sin atribuir, sin carpetas vacías.
- Verificación: reabre cada fichero; re-comprueba una URL fuente aleatoria por
  lote. Si el modelo no puede mostrar imágenes en la sesión actual, dilo
  explícitamente y marca las comprobaciones visuales como NOT VERIFIED.

## Herramientas

- Sistema de ficheros + visor de imágenes + `docs/REFERENCE_LIBRARY.md`.
- `webfetch` para páginas de licencia; checksums locales si el lote lo exige.

## Limitaciones

- No puede verificar licencias de sitios que las ocultan o falsifican.
- No genera contenido: solo cura el existente y verificable.
