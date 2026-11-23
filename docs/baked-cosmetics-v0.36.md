# Home Run Beyond · Assets completos de cosméticos · v0.36

## Problema resuelto
La versión 0.34 dibujaba patrones de ropa en una zona rectangular aproximada. En una captura real de iPhone, el uniforme de fútbol aparecía como un cuadro separado del cuerpo que se desalineaba al animarse. **Ese método queda fuera de la ruta de renderizado.**

## Nueva especificación
La tienda contiene 100 artículos (35 bates, 33 conjuntos de ropa, 32 pelotas), con identificadores y precios conservados. Cada artículo se representa con un archivo WebP real, no con una miniatura que después se sustituye por un diseño diferente.

### Uniformes: cinco poses completas
El generador `tools/build_cosmetics.py` procesa los cinco sprites originales del bateador `ready`, `watch`, `loaded`, `contact`, `follow`. Para cada equipación produce:
- `assets/baked/outfits/{id}/{pose}.webp`: sprite completo con bate clásico
- `assets/baked/outfits/{id}/{pose}-nobat.webp`: sprite completo preparado para otro objeto

**330 archivos**. Los colores de camiseta, pantalón, casco, medias y patrones se aplican según el píxel y la silueta de las poses base: la cara, las manos, el sombreado y la transparencia se conservan. Los accesorios son parte de la imagen exportada, nunca un cuadro que se desplaza por separado.

### Bates: assets de objetos independientes
**35 WebP**, `assets/baked/bats/{id}.webp`, con formas concretas, incluida escoba, trucha, guitarra y bate con alambre de diseño original. El motor los coloca detrás de la imagen completa de manos y cuerpo mediante un anclaje de cada pose. No sigue dibujando el bate antiguo junto al nuevo: usa las imágenes `-nobat`.

### Pelotas
**32 WebP**, `assets/baked/balls/{id}.webp`. Las pelotas especiales tienen imágenes propias con detalles: cráteres, rayos, anillos, caras geométricas, etc. El mismo archivo equipado se utiliza tanto al salir del pitcher como en el bateo y el vuelo.

### Tienda
La previsualización muestra **la propia imagen horneada** de cada cosmético, con carga diferida y botón de compra/equipamiento. La cabecera, el saldo y las pestañas siguen fijos. La tienda no necesita redibujar la ropa con formas genéricas.

### Guardado, progresión y monetización
No se cambia la clave de guardado, las compras, los niveles, las monedas ni los récords. No se introducen cuentas ni funciones sociales. Los anuncios siguen siendo recompensados opcionales únicamente cuando exista un proveedor real, y los bonos cada cinco compras permanecen pendientes.

## Generación y publicación
El repositorio conserva el generador versionado y las imágenes originales como fuente. En **GitHub Actions**, cada validación y publicación ejecuta Python 3.12 + Pillow para exportar **397 WebP** y un manifiesto de comprobación. El sitio en GitHub Pages contiene los assets físicos generados, aunque no se dupliquen los 397 archivos binarios en el árbol de fuentes.

## Rendimiento
Los objetos visibles se cargan con `img.loading='lazy'`; los del equipamiento seleccionado se precargan antes de iniciar la partida. Las combinaciones con un bate alternativo se componen una sola vez por pose y se almacenan en memoria. No hay pintura de ropa por fotograma ni descargas de todos los elementos al abrir el juego. Los assets consultados se almacenan mediante el service worker existente.

## Limitaciones y criterio de aceptación
Son sprites 2.5D basados en las poses originales (no modelos 3D editables). Los uniformes varían en patrones, colores y algunos accesorios, pero siguen la misma silueta corporal para mantener la continuidad. Esto elimina los parches cuadrados, no equivale a haber ilustrado 33 personajes nuevos totalmente diferentes. Es indispensable probar las poses y los objetos extravagantes en el iPhone y corregir los que aún requieran refinamiento de arte.

Criterio de publicación: 397 WebP generados con encabezado correcto; cinco poses para cada uniforme; sprites distintos entre colores/estilos; conservación de guardados; ninguna invocación de las antiguas funciones `overlayOutfit` o `composeSpecialPose` desde la ruta activa; y GitHub Actions en verde.
