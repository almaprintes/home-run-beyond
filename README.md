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
