# Home Run Beyond 0.47 — golpe de bate y rebotes

## Motivo
En la versión 0.46, `synthImpulse` construía el bate con ruido
filtrado y una cola de ruido relativamente larga. Los rebotes sobre
césped, tierra y asfalto usaban prácticamente la misma fórmula
con variaciones de frecuencia y amplitud. A volumen de iPhone
resultaban ásperos y poco reconocibles como impactos físicos.

## Cambio
- **Contacto bate/pelota**: impulso breve (132 ms de búfer, con el
  máximo de energía en los primeros 22 ms), pequeño crack inicial y
  resonancias amortiguadas de madera y cuero. Sin tono sostenido ni
  cola de estática.
- **Suelo**: impactos independientes de césped, tierra y asfalto;
  césped amortigua agudos, asfalto tiene un ataque más seco y mayor
  presencia de medios. Hormigón, ladrillo, tejados y goma también
  usan perfiles de contacto específicos.
- **Dinámica**: bateo perfecto más contundente que bueno o débil;
  los rebotes dependen de la velocidad normal del golpe y no repiten
  efectos de contacto por debajo de 115 ms ni para impactos de
  velocidad inferior a 2,25.
- **Volumen**: se reduce el nivel del efecto de suelo y el
  barrido del bate para que no enmascaren el impacto principal.
- **Integración**: mismos métodos `hit`, `impact`, `sound` y
  `land`; no cambia física, rebotes ni distancias.
- **Rendimiento**: se generan búferes PCM procedimentales una vez por
  material y se reutilizan con pequeñas variaciones de reproducción.
  Sin dependencias, descargas ni permisos de audio adicionales.
- **PWA**: versión 0.47, con nueva clave de caché de service worker.

## Validación
Pruebas del envelope de ataque y caída, fin sin click, contraste
césped/asfalto, amplitud de impactos comparada con el bate,
supresión de múltiples impactos y compatibilidad de AudioContext
simulado. Las sensaciones acústicas definitivas requieren probar
en altavoz y auriculares de iPhone reales.
