# v0.43 — Bate íntegro y descubrimientos en modal (24-11-2026)

## Fallos observados en iPhone
- El arma cosmética se dibujaba en un canvas de 512×720 aproximadamente,
  limitado a la pose del jugador. Los bates largos o especiales se recortaban
  cuando sobresalían del contorno de ese canvas. El problema era el recorte
  de composición, no la textura original del bate.
- La tarjeta de descubrimiento se insertaba dentro del resultado, que tiene
  altura máxima. Al aumentar el contenido, Safari mostraba una barra de
  desplazamiento y el botón «Ver en tienda» podía quedar fuera.

## Corrección
- `getStyledPose` devuelve la pose sin bate para equipamientos especiales.
  `draw()` coloca el bate completo directamente en el canvas global del
  juego, antes de pintar cuerpo/manos, usando los cinco anclajes calibrados
  existentes. La empuñadura queda detrás de las manos y el extremo del bate
  ya no queda limitado por el marco de imagen del personaje.
- Los bates de la tienda se muestran en un recuadro apaisado y con
  `object-fit:contain`, para preservar el diseño completo sin zoom/corte.
- La notificación es un diálogo accesible fuera de `#result`, sobre
  toda la interfaz, con «CONTINUAR», «VER EN TIENDA» y botón «×».
  Al continuar vuelve el resultado sin scroll; al abrir la tienda selecciona
  la categoría del descubrimiento. Escape también cierra el diálogo.
  La modal bloquea controles de juego mientras permanece abierta.
- Sin alteraciones a precios, física, progreso, monedas ni reglas
  de descubrimiento.
- Nueva versión 0.43.0 con caché PWA propia para evitar mezclar versiones.

## Validación
Pruebas de regresión automáticas para asegurar que la composición del bate
no vuelva a usar un canvas recortado y que el diálogo esté fuera de la
tarjeta de resultados, sea descartable y no bloquee la tienda.
La inspección visual final en Safari/iPhone sigue siendo necesaria.
