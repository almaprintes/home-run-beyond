# Publicación y control de calidad — 22/11/2026

## Entregado

- Código fuente completo de primera alfa, sin dependencias externas.
- PWA instalable con manifest, iconos 192/512, service worker y guardado local.
- Escena WebGL2 procedural con iluminación, fog, escenarios por sectores y objetos instanciados; reserva Canvas 2D si el navegador bloquea WebGL2.
- Controles de un botón, física arcade, tres habilidades, monedas, cosméticos y progresión.
- Workflows GitHub Actions con comprobación JS, tests Node y publicación en GitHub Pages.

## Estado de pruebas

- `npm run check`: OK.
- `npm test`: 13/13 pasando.
- Navegador de pruebas 390×844 y 375×667: menú inicial, lanzamiento, botón de golpeo, distancia, resultado y retorno: OK.
- Errores JavaScript en ciclo completo de prueba: 0.
- Limitación del navegador de pruebas: no admite WebGL2 por políticas del entorno; se comprobó la reserva 2D. **La ruta gráfica WebGL2 aún no puede marcarse validada en un iPhone físico.**
- Audio y vibración: codificados, pero deben probarse en Safari real. No se atribuyen métricas FPS al iPhone.

## Publicación GitHub

Repositorio independiente creado y código inicial subido a https://github.com/almaprintes/home-run-beyond . Los tests de GitHub Actions pasan. La fase de Pages todavía necesita confirmar la publicación correcta; en la primera ejecución GitHub reportó un retraso en la disponibilidad del artefacto, y se añadió una espera de sincronización antes de publicar.

Dirección prevista una vez publicada: https://almaprintes.github.io/home-run-beyond/ . No se usa Vercel.

## Limitaciones de alfa

Esta versión **no** contiene anuncios reales, tienda de dinero, servidores multijugador, sincronización entre teléfonos, clasificación online ni medición de retención. La compra de cosméticos usa monedas conseguidas dentro del juego. Es una prueba de jugabilidad, no una app monetizada lista para publicar en las tiendas.
