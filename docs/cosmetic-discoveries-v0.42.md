# Home Run Beyond 0.42 · Tienda de descubrimientos

## Funcionamiento
Los 100 cosméticos siguen disponibles internamente, pero el catálogo visible
contiene **solo artículos descubiertos**. Al empezar, están visibles las tres
piezas básicas: bate clásico, ropa roja y pelota clásica. La tarjeta de progreso
de cada categoría muestra cuántos de sus artículos se han descubierto (35 bates,
33 equipaciones y 32 pelotas) y un próximo objetivo sin revelar nombre, aspecto
ni precio del producto oculto.

Hay 97 reglas permanentes e independientes del saldo o de las compras:
- 47 artículos mediante partidas/batazos y distancia acumulada;
- 25 mediante récords de distancia;
- 15 mediante precisión, rachas y récords superados;
- 10 mediante secretos del mundo o de las superficies.

Ejemplos dedicados: pelota azul al completar 3 batazos; bate dorado con 5
batazos; uniforme azul al alcanzar 100 metros; pelota de tenis con 2500
metros acumulados; baguette con 5 perfectos; Tierra al alcanzar 3000 metros;
meteorito al superar 10000 metros; astronauta al llegar a 20000 metros de
trayectoria. También hay descubrimientos por rebote sobre asfalto, techo o
agua, paso por el río y regiones remotas.

Cada desbloqueo permite **comprar** el artículo, no lo regala. Las compras y
las habilidades conservan sus precios, la física no cambia, y el jugador
elige cuándo gastar. Los intentos no acertados (strikes) no se cuentan como
batazos completados.

## Persistencia y compatibilidad
Se conserva la clave local previa `hrb-v1-progress`, las monedas, las compras,
los equipados y el historial de habilidades. Las reglas por récord, batazos
completados y distancia acumulada se comprueban inmediatamente sobre
guardados antiguos. Todos los artículos ya comprados siguen visibles.
Los contactos perfectos, rachas y sucesos especiales **no se inventan**:
se registran desde esta versión. Los descubrimientos son monotónicos,
persisten al cerrar el navegador y nunca se cobran otra vez por desbloquear.
El botón de reinicio explícito mantiene su semántica de borrar el progreso.

## Interfaz y rendimiento
- Sin placeholders de productos bloqueados, sin nombre ni imagen de artículos
  todavía ocultos en el listado. Los assets precocinados pueden formar parte
  de la PWA, pero la tienda no los muestra ni los solicita hasta descubrirlos.
- Avisos agrupados en la tarjeta del resultado **después** de la simulación
  de la pelota; no interrumpen la carrera ni tapen el vuelo.
- Botón a la tienda desde el aviso y contador de progreso por categoría,
  con objetivo orientativo genérico que no revela el artículo.
- Versionado v0.42.0 de JS/CSS/PWA y caché para no mezclar código de v0.41.

La batería de pruebas valida migración, 100 reglas y cuotas, estado inicial,
compras bloqueadas, recompensas repetibles sin anuncios duplicados, secretos,
y protección de la economía.
