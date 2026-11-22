# ⚾ Home Run Beyond

**Primera alfa jugable (22-11-2026)**. Proyecto independiente de CraftRace y SlotRace.

Un pitcher, un bateador, un botón y una pelota que puede terminar atravesando ciudades. El juego está desarrollado en **JavaScript ES modules + WebGL2 sin dependencias**, con reserva gráfica Canvas 2D para entornos que bloquean la GPU, y funciona como PWA instalable en iPhone/Android. Todo el arte del mundo 3D se genera mediante geometría procedural; no se descargan modelos, texturas ni fuentes de terceros.

## Jugar

1. Abre la dirección HTTPS publicada en **Safari del iPhone**.
2. Pulsa **¡AL CAMPO!** (primera vez) o **¡JUGAR!**.
3. Al lanzar el pitcher, toca **¡BATEA!** calculando la llegada de la pelota. El instante influye en la distancia.
4. Cuando caiga la pelota, cobra las monedas. Pulsa **OTRO BATAZO** o compra mejoras en **POTENCIA**, **SWING** y **REFLEJOS**.
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