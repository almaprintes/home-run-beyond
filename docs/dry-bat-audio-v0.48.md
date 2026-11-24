# Home Run Beyond 0.48 — bateo seco

La prueba de usuario en iPhone confirmó que los rebotes de la versión
0.47 suenan bien, pero el golpe del bate todavía tenía demasiada cola.

## Corrección
- El contacto del bate utiliza ahora `synthDryBat()`, un único impulso
  procedural de aproximadamente **69 ms** (no la síntesis genérica).
- El chasquido de impacto desaparece en unos **2,5 ms** y la resonancia
  muy breve de madera y pelota decae en **12–13 ms**.
- Sin reverb, sin segunda pulsación ni resonancia larga; salida fundida
  para evitar chasquido de corte digital.
- La potencia del efecto continúa reflejando la calidad del contacto.
- Los sonidos de rebote de césped, tierra, asfalto, agua y demás
  superficies no se han modificado. Tampoco cambia la física.
- Actualización a caché PWA **v0.48** para evitar sonido antiguo en iPhone.

## Validación
Pruebas a 22.050, 44.100 y 48.000 Hz que miden duración, energía en
los primeros milisegundos, cola final y amplitud máxima. Pruebas de
regresión que validan que césped, asfalto y tierra conservan exactamente
sus perfiles anteriores. Requiere valoración auditiva final en iPhone.
