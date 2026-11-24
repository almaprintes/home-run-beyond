# Home Run Beyond — v0.41: tráfico 3D procedural (24/11/2026)

## Cambio implementado
El tráfico abandona **definitivamente** los PNG/WebP cenitales y las vistas 3/4 de Top Down RACE.
No se cargan sprites de vehículos en la PWA, no hay mezcla de imágenes con el motor 3D,
y se borran las doce copias de las imágenes del repositorio de Home Run Beyond.
Top Down RACE no se modifica.

## Geometría real
- Cuatro carrocerías originales: hatchback, berlina, SUV y pickup; seis coches con colores,
  proporciones y perfiles diferentes.
- Mallas con capó, aletas y carrocería suavizada con secciones de anchura variable;
  habitáculo trapezoidal independiente, ventanas laterales y parabrisas inclinados,
  techo, pilares, espejos, faros delanteros y luces traseras.
- Cada coche tiene cuatro neumáticos cilíndricos con perfil, llantas de cinco radios y
  pasos de rueda semicirculares, con contacto al suelo y sombra suave.
- Geometría instanciada en WebGL2: todos comparten prueba de profundidad, cámara,
  iluminación y niebla del mundo. Detalles reducidos por distancia para iPhone.
- El motor Canvas 2D de emergencia sigue siendo un escenario simplificado;
  el tráfico volumétrico requiere WebGL2, que es la vía principal del juego.

## Movimiento
Los vehículos circulan longitudinalmente por X, con dos carriles fijos en sentidos
opuestos y velocidad constante. El modelo se rota 180 grados al cambiar de sentido.
El ángulo de giro de cada rueda es distancia / radio; depende de segundos reales,
no de fotogramas. Las seis variantes usan radio acorde con su tamaño.
Los coches se reciclan a 322 unidades del centro (más allá de los 280 de la
calzada) y se ocultan una vez que salen de ella, evitando teletransportes
visibles. No hay desplazamiento lateral ni cambios de carril espontáneos.

## Continuidad
No se tocan físicas, rozamiento, rebotes, skins de pelotas ni economía.
La versión PWA y la caché cambian a 0.41; se eliminan las rutas a las
imágenes de tráfico. GitHub Actions ejecuta pruebas de geometría,
movimiento, ruedas, render WebGL y regresiones. Pendiente de validación
visual y de FPS reales en iPhone.
