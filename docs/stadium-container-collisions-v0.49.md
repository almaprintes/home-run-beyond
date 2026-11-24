# Home Run Beyond 0.49 · Colisiones de contenedores del estadio

## Problema
Los veinte módulos azules que rodean el perímetro frontal del estadio
se representaban mediante tres `r.box()` por módulo, con rotaciones
diferentes, pero no se incluían en el recorrido de la física de la pelota.

## Implementación
- Se establece un catálogo determinista `stadiumContainers()` con los
  veinte módulos visibles, y otro `stadiumContainerParts()` con cuerpo,
  cenefa y cubierta. El dibujado y las colisiones usan esas mismas
  dimensiones y coordenadas, evitando obstáculos desplazados.
- Los tres sólidos son cajas orientadas según el ángulo de cada contenedor.
  Se transforma el segmento de vuelo a las coordenadas locales y se emplea
  el detector existente de esfera barrida contra caja. La normal del choque
  se vuelve a transformar al mundo para calcular rebote y rozamiento.
- Se selecciona siempre la primera colisión real entre edificios, barreras
  laterales y contenedores. La pelota ya no atraviesa paredes o techos a
  alta velocidad y puede seguir volando tras rebotar.
- El material físico es metálico; el audio ya existente reproduce el contacto
  sin cambiar las muestras de rebote previamente aprobadas.
- La sombra de la pelota toma como suelo las partes superiores cuando vuela
  encima de un contenedor, sin dibujar una sombra sobre el césped que queda debajo.
- Se conservan geometría, aspecto, física general, economía, progreso y
  todos los demás obstáculos. No se modifican las colisiones de los
  edificios ni del vallado.

## Validación
Pruebas para los 20 módulos: coincidencia gráfica/física de 60 cajas,
caras laterales en ambos sentidos, extremos, cubierta, trayectos rápidos,
ausencia de colisión fantasma a gran altura, sombras y rebotes simulados.
El comportamiento visual final en el iPhone requiere una prueba real.
