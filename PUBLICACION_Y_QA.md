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

## Pendiente de publicación

La conexión GitHub utilizada permite leer y modificar repositorios existentes, pero **no ofrece crear uno nuevo**. Por seguridad no se ha mezclado el juego en los repositorios de CraftRace o SlotRace.

**Acción necesaria:** crear repositorio vacío `almaprintes/home-run-beyond` con `main` como rama principal, y conceder acceso a la conexión GitHub actual si la instalación está limitada a repos concretos. Después se sube el código y se habilita GitHub Pages, origen **GitHub Actions**. La dirección esperada, si la publicación tiene éxito, sería `https://almaprintes.github.io/home-run-beyond/`; no es un enlace verificado aún.

No se ha usado Vercel. El código y la configuración están listos para un despliegue por GitHub Actions en cuanto exista el nuevo repositorio.

## Limitaciones de alfa

Esta versión **no** contiene anuncios reales, tienda de dinero, servidores multijugador, sincronización entre teléfonos, clasificación online ni medición de retención. La compra de cosméticos usa monedas conseguidas dentro del juego. Es una prueba de jugabilidad, no una app monetizada lista para publicar en las tiendas.