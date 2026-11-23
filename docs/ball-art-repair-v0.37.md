# Home Run Beyond · reparación visual de pelotas · v0.37

## Defecto reproducido
En v0.36 la tienda mostraba pelotas de béisbol lisas sin costuras; algunas pelotas temáticas tenían rayas que escapaban del borde y manchas incorrectas. En vuelo y rodadura, proyectar una imagen circular RGBA sobre una esfera hacía que los píxeles transparentes del fondo se muestrearan como agujeros o fragmentos del interior.

## Corrección implantada
- `tools/ball_art.py`: fuente única de generación en Pillow a triple resolución, antialias y exportación WebP sin pérdidas. Cada pelota se compone con un **núcleo circular opaco** y decoraciones recortadas por una máscara alpha. Las siluetas deliberadas del Sol, Saturno, meteorito y mecha de bomba se dibujan por detrás del núcleo; no son errores de transparencia.
- Las ocho pelotas de diseño `baseball` muestran **dos costuras continuas y puntos cruzados**, con el color de acento de cada artículo. La clásica también se dibuja correctamente en la tienda.
- Las otras 24 pelotas no heredan esas costuras. Tenis y golf tienen sus propias marcas; playa presenta sectores completos; sandía mantiene franjas verdes contenidas; bola 8 enseña un ocho legible, y el dado sigue siendo cúbico.
- `tools/build_cosmetics.py` genera **405 WebP**: 330 poses de uniforme, 35 bates, 32 pelotas finales y **8 texturas UV completamente opacas** específicas para las pelotas de béisbol.
- `src/baked-assets.js`: `ballRenderMode` separa béisbol y temáticas; `bakedBallTextureUrl` referencia exclusivamente las ocho UV válidas.
- `src/sprites.js`: utiliza la **imagen final** del objeto al salir del pitcher y durante el vuelo. Al rodar, solo las pelotas tipo béisbol con una UV totalmente opaca emplean proyección esférica. Las temáticas giran **como imagen completa**, sin mapeo ni costuras ajenas.
- Si no se puede cargar la UV, se dibuja el WebP circular completo, sin mapear sus esquinas transparentes.

## Control de calidad automático
El generador comprueba todos los archivos guardados, no solo sus imágenes previas a la compresión:
- Las 32 pelotas tienen el disco interior completamente opaco (sin un solo píxel alpha inferior a 255 dentro del radio de seguridad).
- Las ocho pelotas de béisbol contienen costuras visibles a izquierda y derecha.
- Las ocho UV tienen **alpha 255 en todos los píxeles**, incluidas las esquinas.
- El manifiesto confirma `ballsValidated=32` y `texturesValidated=8`; los tests Node comprueban el catálogo, rutas, importaciones, integración y cifras.

## Compatibilidad
No cambian IDs, precios, compras, niveles ni el guardado local. No cambian ni la ropa —que ya funciona correctamente— ni los bates. La PWA fuerza un caché nuevo (`hrb-v37-20261123-opaque-ball-art`).

## Comprobación en dispositivo
Revisar en el iPhone al menos pelota clásica, negra, bola 8, tenis, golf, playa, sandía, naranja, Mini Luna y Mini Sol, tanto en la tienda como con el pitcher y durante el bote. Las pruebas de píxeles detectan transparencias accidentales, pero no sustituyen la apreciación estética del acabado visual.
