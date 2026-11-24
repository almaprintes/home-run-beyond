# Home Run Beyond 0.51 · Icono de aplicación y CTA

**Icono elegido:** imagen original generada en esta conversación (bate de madera golpeando una pelota de béisbol, estallido naranja/amarillo y líneas de velocidad sobre fondo azul). La misma imagen se ha convertido, sin cambiar el diseño, en PNG de 32, 180, 192 y 512 píxeles.

- `icons/icon-180.png`: Apple Touch Icon, con enlace versionado para el acceso directo en el iPhone.
- `icons/icon-192.png` y `icons/icon-512.png`: iconos PWA del manifiesto.
- `icons/icon-32.png`: favicon del navegador.
- `manifest.webmanifest`, `index.html` y `sw.js`: rutas versionadas y nuevo nombre de caché para evitar iconos anteriores.
- **Descanso:** el botón «VOLVER A BATEAR» se ha convertido en un CTA amarillo/naranja de alto contraste, tamaño grande, sombra y animación muy sutil; respeta la preferencia de reducir movimiento. Se conservan los indicadores de récord y número de batazos.
- Sin cambios en físicas, monedas, tienda, audio ni progreso.

**Nota iOS:** una PWA ya instalada puede conservar su icono en la pantalla de inicio porque iOS lo almacena por separado. Primero se recomienda cerrar y abrir la web; si el icono no cambia en la pantalla de inicio, eliminar solo el acceso directo y volver a añadirlo desde Safari → Compartir → Añadir a pantalla de inicio. No utilizar «Restablecer datos» del juego para actualizar el icono.
