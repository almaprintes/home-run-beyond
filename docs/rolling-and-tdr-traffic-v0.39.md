# Home Run Beyond · Rodadura recuperada y coches de Top Down RACE · v0.39

## Fuente de verdad y objetivo
La pelota original restaurada en v0.38 conserva las costuras 3D aprobadas (`assets/baseball.webp`). Al restaurarla se dibujó siempre como imagen 2D rotada, incluso durante la rodadura, dando un giro de moneda/patinaje. Se comparó `src/game.js` con el commit original **82a846d8** de v0.24: los parámetros físicos aprobados de bote, retención horizontal y frenado siguen iguales.

### Físicas que NO se deben volver a empeorar
- Rozamiento continuo independiente de FPS: **asfalto 1,05 s⁻¹**, **césped 2,05 s⁻¹**, implementados por `groundRollRetention(type,dt)`.
- Rebote normal y freno horizontal de suelo: asfalto `0.78 / 0.92`, césped `0.39 / 0.70`. Impactos en cubiertas respetan sus materiales. No hay límite artificial de botes.
- La contabilización de distancia, monedas y las habilidades no se modifica.

### Corrección visual del giro
- En el lanzamiento y vuelo, los 8 diseños de béisbol mantienen **exactamente la imagen original**, sin hacerla girar como moneda. Las pelotas especiales siguen utilizando su propia imagen completa.
- Tras el primer contacto con el suelo, la pelota de béisbol vuelve a proyectarse sobre una esfera real en **96 × 96 píxeles** (antes 64); el eje sigue la dirección física de avance, mediante `advanceVisualSpin`.
- Una copia de la fuente original rellena los bordes transparentes para la reproyección UV. Esto se hace una vez en memoria por textura. El WebP original, las puntadas y su relieve permanecen intactos.
- Los rebotes muestran una compresión pequeña, calculada en tiempo real de pantalla y no en los subpasos rápidos, sin cambios de trayectoria ni energía.

## Tráfico: coches oficiales propios de TDR
Se copian únicamente **seis skins cenitales originales** del repositorio `almaprintes/TopdownCraftrace` al repositorio independiente `almaprintes/home-run-beyond`:

| Modelo | Origen TDR | Copia HRB |
|---|---|---|
| Hélix Spark | `public/assets/skins/skin_helix_spark.webp` | `assets/traffic/helix_spark.webp` |
| Avenir Gripline | `public/assets/skins/skin_avenir_gripline.webp` | `assets/traffic/avenir_gripline.webp` |
| Veloce Flash | `public/assets/skins/skin_veloce_flash.webp` | `assets/traffic/veloce_flash.webp` |
| Crown Axis | `public/assets/skins/skin_crown_axis.webp` | `assets/traffic/crown_axis.webp` |
| Forge Hammer | `public/assets/skins/skin_forge_hammer.webp` | `assets/traffic/forge_hammer.webp` |
| Hélix Comet | `public/assets/skins/skin_helix_comet.webp` | `assets/traffic/helix_comet.webp` |

Los hashes de objeto Git del archivo copiado se comparan contra el origen en los tests. Son vehículos originales de las marcas **ficticias** de TDR, no automóviles reales licenciados.

### Movimiento y rendimiento
- Se suprimen las cajas/cubos LEGO del mundo.
- `src/traffic.js` produce seis coches por carretera cercana, en **dos carriles opuestos**, con velocidad 12–25 m/s, sin arrastre lateral.
- Las carrocerías se dibujan como **cuadriláteros proyectados por la cámara**, con ligera separación del asfalto y sombra de contacto. Dirección y orientación se mantienen en ambos sentidos.
- Se dibujan solo en los tramos próximos a la cámara; las seis imágenes se reutilizan desde la caché y están disponibles offline en la PWA.
- No se copia física de conducción, sistemas multijugador, coches de otras carpetas ni ninguna lógica de CraftRace. Solo seis assets visuales.

## Pruebas
Tests de continuidad de rozamiento, rebote visible, orientación de rodadura y relleno opaco temporal; integración de tráfico por carretera, dirección y matriz de proyección; verificación binaria exacta del origen TDR; PWA versión 0.39. Nada altera compras ni progreso.

## Revisión pendiente en móvil
Verificar en iPhone: primer bote sobre césped y asfalto, paso continuo al giro hacia delante sin costuras que desaparecen, duración real de la rodadura, coches cruzando en sentidos opuestos y cuerpo/sombra adheridos a la calzada. Las pruebas unitarias no sustituyen una revisión visual en un dispositivo real.
