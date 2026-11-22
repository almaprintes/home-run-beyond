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

## Publicación mediante GitHub Actions

Repositorio: https://github.com/almaprintes/home-run-beyond

Cada nuevo commit en `main` inicia el workflow `.github/workflows/pages.yml`, que comprueba el código y publica la PWA con GitHub Pages. Para la primera publicación, configura **Settings → Pages → Build and deployment → Source: GitHub Actions** si aún no está seleccionada. Verifica el estado de cada ejecución en https://github.com/almaprintes/home-run-beyond/actions.

Cuando el trabajo `publish` termine correctamente, la dirección será https://almaprintes.github.io/home-run-beyond/ . Para instalar en iPhone, usa Safari → Compartir → Añadir a pantalla de inicio.

No se usa Vercel en este proyecto.

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
