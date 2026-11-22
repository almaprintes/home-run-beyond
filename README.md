# ⚾ Home Run Beyond

**Primera alfa jugable (22-11-2026)**. Proyecto independiente de CraftRace y SlotRace.

Un pitcher, un bateador, un botón y una pelota que puede terminar atravesando ciudades. El juego está desarrollado en **JavaScript ES modules + WebGL2 sin dependencias**, con reserva gráfica Canvas 2D para entornos que bloquean la GPU, y funciona como PWA instalable en iPhone/Android. Todo el arte del mundo 3D se genera mediante geometría procedural; no se descargan modelos, texturas ni fuentes de terceros.

## Jugar

1. Abre la dirección HTTPS publicada en **Safari del iPhone**.
2. Pulsa **¡AL CAMPO!** (primera vez) o **¡JUGAR!**.
3. Cuando la pelota llegue, **mantén pulsada la pantalla** para congelar el instante del golpe y su calidad. Mientras mantienes el dedo, una flecha 3D oscila de un lado a otro.
4. **Suelta el dedo** cuando la flecha indique la dirección deseada. Ese rumbo se utiliza en la física del lanzamiento.
5. Tras detenerse la pelota, compra habilidades o pulsa **VOLVER A BATEAR** desde la pantalla de descanso.
5. Usa `+` para entrar en la tienda de bates cosméticos; el botón `♫` activa/desactiva el sonido.

Para instalarlo en iOS: Safari → Compartir → **Añadir a pantalla de inicio**. Se puede abrir en pantalla completa y, tras una primera visita conectada, los recursos esenciales quedan almacenados para funcionar sin red. Las partidas se guardan en **localStorage** del dispositivo; no se sincronizan entre dispositivos.

## Desarrollo local

Requiere Node.js 18+ (o cualquier servidor estático compatible con módulos ES):

```bash
npm run dev
```

Abre `http://localhost:4173`. Para ver los FPS abre `http://localhost:4173/?debug=1`.

Pruebas automáticas:

```bash
npm run check
npm test
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo (nombre recomendado: `home-run-beyond`, separado de otros juegos).
2. Sube **todo el contenido de esta carpeta a la raíz de `main`**, incluida `.github/workflows/pages.yml`.
3. En GitHub → Settings → Pages → Build and deployment, elige **GitHub Actions** como origen.
4. Verifica en **Actions** que pasan los trabajos `validate` y `publish`.
5. Abre `https://<usuario>.github.io/home-run-beyond/` desde el iPhone y añade el sitio a la pantalla de inicio.

No se usa Vercel; el flujo de publicación principal es GitHub Actions.

## Arquitectura

- `src/engine.js`: motor WebGL2 propio, shaders de iluminación/fog, geometría instanciada y reserva Canvas2D.
- `src/world.js`: estadio, público estilizado, focos, pitcher, bateador, ciudad, carreteras, agua, vegetación y montañas procedurales.
- `src/logic.js`: habilidades, contacto, balance, monedas, catálogo y persistencia validable.
- `src/game.js`: estados, controles, simulación física arcade, seguimiento de cámara y UI.
- `src/audio.js`: efectos con Web Audio, sin archivos de sonido.
- `src/main.js`: inicialización y diagnóstico.
- `manifest.webmanifest` + `sw.js`: PWA y caché sin conexión.
- `.github/workflows/pages.yml`: checks y publicación GitHub Pages.

## Estado real de esta alfa

**Incluido:** control de un botón, pitching y timing, disparo balístico y tres tipos de superficie, colisiones básicas con tejados, rebotes, distancia, FPS adaptativos, escalado de niveles, monedas y compras, récords y descubrimiento de zonas, sonido, tienda cosmética y guardado local.

**Pendiente de siguiente iteración:** ads recompensados reales (requieren proveedor/configuración), clasificaciones mundiales, cuenta y sincronización online, tutorial avanzado, dificultad adaptativa del pitcher, físicas más refinadas, más estructuras/objetos interactivos y test en GPU de un iPhone físico. Es una alfa, no un producto comercial acabado.

**Verificación:** las pruebas de Node verifican economía y generación de mundo; el test de navegador en entorno sin WebGL2 validó la reserva Canvas2D y el ciclo completo de un golpe. **La ruta WebGL2 debe validarse en un iPhone real** antes de darla por estable.

## Privacidad

Sin trackers, cookies de analítica, servidor de cuentas ni SDK publicitario. Los progresos se conservan solamente en el navegador. Borra los datos del sitio para reiniciar. No necesita cámara, micrófono ni localización.

## Mejoras y recompensas (alfa 0.2)

El panel de resultado se presenta en una tarjeta compacta, sin oscurecer la pantalla de forma invasiva. Las tres tarjetas de habilidades destacan con borde dorado si son comprables, gris si no hay monedas y verde al estar disponible un bonus extra. Cada **cuatro mejoras pagadas** se desbloquea una **mejora adicional** en la habilidad que elija el jugador, y se conserva en el guardado local. Los jugadores de la versión anterior reciben el bonus que les corresponda por sus niveles ya adquiridos.

**Publicidad recompensada:** el juego está preparado para conectar el adaptador `src/rewarded.js` con un proveedor. Cuando ese adaptador existe se debe comprobar la confirmación `rewarded:true` antes de aplicar el beneficio. Mientras no haya proveedor publicitario, se muestra claramente «BONO ALFA · SIN ANUNCIO» y se regala el nivel. No hay anuncios simulados, SDKs ni seguimiento comercial en esta versión.
## Mecánica de apuntado 0.7

La cámara de bateo está detrás del bateador a altura próxima a la de su cabeza. Mientras se pulsa la superficie táctil, el instante y la calidad del bateo quedan congelados, y una flecha tridimensional recorre lateralmente ±52°. Soltar congela el ángulo y lanza la pelota con ese rumbo, conservando su rapidez inicial horizontal. Se admiten toques, ratón y teclado; el botón principal permanece bajo la zona de visión para no tapar al pitcher.

## Visibilidad y pelota 0.9

Los edificios, árboles y estructuras cuya caja espacial corte la línea de visión entre la cámara y la pelota se dibujan translúcidos durante el vuelo. El motor tiene tres capas: geometría opaca, obstáculos semitransparentes y una pasada final de profundidad reservada al béisbol, por lo que el balón no desaparece aunque la cámara quede dentro de un edificio. La pelota se genera con una esfera 3D de mayor resolución, costuras curvas rojas y puntadas procedurales (sin texturas ni archivos externos). Los obstáculos conservan sus colisiones originales. La caché de la PWA cambia de versión sin alterar el guardado local.

## Arte aprobado del bateador (v0.11)

Se han integrado recortes **de las láminas aprobadas por el creador**, sin generar otro personaje. Se dibujan como sprites con transparencia y proyección sobre el campo 3D (representación **2.5D**, no se presentan falsamente como archivos de modelos 3D esqueléticos). El movimiento selecciona ocho poses: ready, watch, loaded, aim-left, aim-center, aim-right, contact y follow. La pelota y las tres flechas usan también sus recortes del tablero original. Las láminas completas de personaje, animación y recursos permanecen en `assets/reference/` para la futura producción de mallas animadas.

La cámara y la posición de los sprites se proyectan usando las mismas matrices que el mundo WebGL; el impacto y la bola del pitcher comparten el punto de contacto real (aprox. x=0, z=-4.7). La ruta alternativa de primitivas procedurales se mantiene únicamente si los recortes gráficos no cargan. La caché de la PWA incorpora todos los sprites y el guardado de monedas/niveles no se toca.

## Reparación de actualizaciones iPhone (0.12)

La grabación de iPhone del 22/11/2026 reveló HTML actualizado junto a CSS y JavaScript anteriores: logo de béisbol gigante, muñeco geométrico en vez de sprite, flechas nuevas. El origen es la política cache-first de recursos del service worker cuando el HTML cambia antes de que se active la nueva caché. Se corrige con CSS y módulos importados versionados en la URL `?v=0.12.0`, network-first para todos los recursos con fallback de caché offline, registro de service worker `updateViaCache: none` y límites intrínsecos de tamaño de iconos y canvas. El antiguo guardado local y las físicas se conservan. En la siguiente publicación, aumentar la versión en `index.html`, enlaces de módulos y SW para mantener la coherencia.

## Texturas y física visual (0.13 · 22/11/2026)

Atlas procedural real `assets/materials-atlas.png` (768×384 px; 8 recortes de 192×192): hierba, ladrillo, asfalto, tejas, madera, hormigón, agua y tierra. Se carga una sola vez en una textura WebGL2 y se reutiliza por instancias de escena, preservando la geometría, las colisiones y la translucidez de obstáculos. El motor amplía el formato de instancia a 20 valores (matriz 16, color 3, ID de material 1), y el fragment shader proyecta UV locales repetibles sobre los objetos (top, laterales), con la paleta original como tinte. Los materiales se asignan explícitamente a césped, edificios, techos, carreteras, árboles, campos y zonas húmedas. Si no carga el atlas, continúa con los colores de baja carga.

La pelota aprobada mantiene su recurso original pero limita el diámetro dibujado en función de su proyección, en lugar de agrandarse descontroladamente al volver hacia la cámara. Se añaden sombra proyectada sobre hierba/asfalto/azotea, estela discreta y anillo temporal al chocar. La dirección mantiene una única flecha azul original rotada suavemente, sin saltos entre imágenes. La caché PWA utiliza v0.13 para HTML, módulos y materiales. No cambia el formato del progreso ni la economía.

## Efectos de golpeo y colisiones 0.14 (22/11/2026)

Los impactos generan partículas y anillos que siguen la posición 3D de la pelota. Se diferencian ladrillo/hormigón/tejado, goma, hierba/tierra, asfalto y agua/pantano/charco por color, emisión, dinámica y sonido sintetizado. El límite es de 90 partículas y ocho anillos simultáneos. El golpe crea una ráfaga y una pausa visual de contacto de 60/38/18 ms para perfecto/excelente/bueno respectivamente, sin alterar la calidad ni las velocidades de lanzamiento. Sacudida de cámara acotada que no se acumula en la posición persistente. Progreso intacto.

## Revisión gráfica y sonora 0.15 (22/11/2026)

Se reemplaza el atlas original por 12 materiales de 192×192 px en una sola imagen fuente 4×3. Hierba orgánica sin líneas orientadas; ladrillo, asfalto, tejas, madera, hormigón, agua, tierra, yeso/fachada pintada, metal, pavimento y goma. En WebGL2 cada recorte se copia a una capa independiente de una TEXTURE_2D_ARRAY: una cadena de mipmaps por material, trilineal LINEAR_MIPMAP_LINEAR y anisotropía hasta 4× cuando existe la extensión. Esto evita filtrado cruzado de atlas y aliasing a distancia. Reducción de contraste de detalle con distancia y eliminación de planos de césped superpuestos y z-fighting. Los solares pasan a pavimento en vez de cuadros verdes.

Se sustituyen los pitidos de impacto y swing por muestras de audio generadas dentro de WebAudio: ruido filtrado, ataque transitorio, cuerpo de resonancia y envolventes distintos para madera, metal, hormigón, goma, tierra, césped y agua. Son sonidos sintetizados proceduralmente, no grabaciones reales; no añaden peticiones de red. Se mantiene la física, la economía y la compatibilidad con el guardado local. En caso de fallo de la carga de texturas, el renderer conserva colores de respaldo.

## 0.16 · Reparación del suelo urbano (22/11/2026)

La captura muestra un suelo ausente entre edificios: no es simplemente transparencia. El motor estaba generando tiras de terreno solo a ±370/700 m alrededor de la cámara, aunque la perspectiva del vuelo permite ver mucho más lejos, y los edificios y carreteras seguían apareciendo sobre el fondo azul. Ahora las tiras de terreno opaco cubren al menos 1.900 m por delante y 750 m por detrás, ampliándose a mayor altura; se centran lateralmente bajo la cámara. Los detalles y vehículos mantienen un radio reducido para limitar la carga de GPU. El río conserva su material de agua. La niebla se atenúa de forma diferenciada en césped y tierra, y el fondo WebGL se vuelve opaco. Se añaden pruebas de cobertura continua en la ciudad y con la cámara en vuelo, sin modificar colisiones ni progreso guardado.

## 0.17 · Giro visible y coherente de pelota (22/11/2026)

Se conserva el arte aprobado de la pelota en sprites 2.5D. Ya no usa `game.clock*.32` (giro casi imperceptible independiente del balón). El estado `ball.spin` se inicializa al batear; durante el vuelo tiene backspin visible limitado a 13,5 rad/s visuales y actualiza orientación una sola vez por frame REAL, independientemente de los subpasos acelerados de física. Al golpear una fachada y retroceder, el giro invierte su sentido; sobre hierba, asfalto o azoteas, pasa gradualmente a rodadura proporcional a la velocidad y se detiene con la bola; agua y pantanos lo amortiguan. Colisiones preservan el ángulo de costura para evitar saltos. El motor WebGL de respaldo anima también sus costuras procedurales con la fase real. Caché PWA 0.17 versionada, sin cambios en monedas, récords ni físicas.

## 0.18 · Control táctil fiable y rodadura 3D aparente (22/11/2026)

La captura del golpe se centraliza entre superficie y botón, con captura de puntero y cierre único en pointerup, pointercancel o lostpointercapture (protegiendo la liberación duplicada). El lanzamiento se activa 90 ms tras soltar, sin que el hit-stop estético retrase el contacto. La rotación de la pelota se integra en cada subpaso físico de contacto como distancia recorrida/radio real de 1,45 m, sin el anterior factor 0,42 ni límite temporal de 14 rad/s. Al rodar, se remapea el sprite original en franjas curvas dentro de una silueta circular para ver las costuras rodando sobre la esfera, y la orientación de la rodadura sigue el desplazamiento lateral. Sin contacto se conserva el backspin aéreo. Se protege la caída en agua, los rebotes hacia atrás y las teletransportaciones de las colisiones. No se cambia la física, las monedas ni las habilidades.

## 0.19 · Rodadura esférica según el eje de avance (22/11/2026)

Corrección de la pelota que parecía girar hacia un lado mientras avanzaba. La rotación ahora se integra con cuaterniones en coordenadas del mundo: eje = (up × desplazamiento), ángulo = distancia recorrida/radio (1,45 m). Avanzar longitudinalmente gira sobre el eje horizontal transversal; moverse de lado gira sobre el eje correspondiente; invertir el movimiento invierte el giro sin reiniciar la orientación. El backspin aéreo también actualiza el cuaternión con el sentido correcto. El sprite de pelota aprobado se re-proyecta como esfera vista desde la cámara actual en una textura dinámica de 64×64 px (sin redibujar ni sustituir el recurso original). Se elimina la animación de franjas orientadas con un simple ángulo del mundo, que provocaba la falsa sensación de giro lateral. La textura de origen y el canvas de salida se reutilizan; no se crean nuevas imágenes por fotograma. Los controles, la física, monedas y progreso se conservan.
