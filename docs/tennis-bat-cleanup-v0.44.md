# Home Run Beyond 0.44 — pelota de tenis y eliminación del bate fantasma

## Diagnóstico basado en el código y las cinco imágenes de origen
- La pelota «tenis» ya usaba `design=tennis`, pero el recurso horneado
  en `tools/ball_art.py` trazaba dos arcos por los bordes exteriores, por
  lo que los surcos desaparecían prácticamente al reducir la imagen en juego.
- Las poses originales tienen un bate de madera pintado dentro del mismo
  WebP. `bake_uniform(...,remove_bat=True)` lo intentaba quitar por un
  detector de color limitado; quedaban partes detrás de bates como la escoba.
  Con WebGL2, el actor procedimental antiguo se oculta cuando el sprite
  principal está listo; el defecto visible estaba en el WebP «nobat».

## Correcciones
1. Pelota de tenis: fieltro amarillo/verde, luz suave, microtextura y
   **dos surcos marfil con canal oscuro** curvados por el hemisferio
   frontal. Dibujo antialias a 3×. La generación comprueba que se vean
   píxeles claros en ambos lados tras el horneado y el reescalado.
2. Bateador: las cinco imágenes «sin bate» se limpian con máscaras por pose,
   extrayendo el color del **original sin recolorear** y ampliando a los
   contornos oscuros para quitar restos de madera y empuñadura. Se
   protegen casco rojo y ropa clara. El proceso usa una única máscara
   por pose para todas las equipaciones, comprueba que se haya
   eliminado madera y que no se haya borrado más del 12 % del lienzo.
   Se limpia además la flecha antigua de la pose de carga y la bola
   antigua/destellos de la pose de contacto, fuera del personaje.
3. Los bates siguen siendo una sola capa por detrás del cuerpo, dibujada
   en el canvas global, sin volver a introducir el recorte del bate.
4. Todas las rutas de los **397 WebP horneados** llevan
   `?v=0.44.0` para actualizar la PWA en Safari y no reutilizar
   variantes antiguas de pelota o de poses.
5. Se conservan física, monedas, habilidades y compras; no se toca el
   código de Top Down RACE.

## Verificaciones
`npm run check` y tests de integración en GitHub Actions; los archivos
WebP se generan y verifican en cada publicación. Pendiente inspección
visual final en iPhone real.
