# Home Run Beyond · Restauración de pelota de béisbol original · v0.38

## Motivo
En las versiones 0.36/0.37 se sustituyeron las puntadas originales del sprite aprobado por dos trazos generados con Pillow. Aunque superaban las pruebas automáticas de opacidad, eran gráficamente peores: dejaron de parecer las costuras tridimensionales originales.

## Fuente aprobada
**`assets/baseball.webp`** es la pelota original suministrada para el juego. Conserva su cuero sombreado, perspectiva, puntadas rojas curvas y volumétricas y costuras realistas.

## Cambio efectivo
- La pelota **Clásica** usa directamente ese archivo, redimensionado sin inventar nuevos trazos. La comprobación automática compara sus píxeles centrales contra el recurso original.
- Los otros siete colores tipo béisbol aplican únicamente un tinte al **cuero**, preservando intactos los píxeles rojos de las costuras, su relieve y sombras.
- El juego dibuja el mismo sprite equipado en la tienda, desde el pitcher, durante el vuelo y durante la rodadura. Solo se rota la imagen completa; queda deshabilitado el mapeo UV esférico que deformaba sus costuras.
- Las 24 pelotas temáticas y los assets de ropa y bates mantienen sus diseños y no se modifican.
- Se eliminan las ocho texturas UV adicionales de la generación y precarga. Quedan **397 WebP**: 330 poses, 35 bates y 32 pelotas.

## Validación
El generador de CI verifica que la pelota clásica mantiene los mismos píxeles que el original en toda la zona central de comparación, y que las costuras de las ocho variantes conservan sus píxeles de la fuente. Las 32 pelotas conservan su núcleo opaco. Las pruebas JS verifican que no se aplican mapeos sobre la imagen.

## Datos y economía
No cambian identificadores, niveles, monedas, compras, récords, física de golpes ni configuración. Solo se modifica el aspecto visual y el método de dibujo de las pelotas. Caché PWA actualizado a v0.38.
