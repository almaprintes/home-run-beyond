# Auditoría íntegra de progresión, recompensas y tienda — Home Run Beyond 0.45

**Fecha:** 24 de noviembre de 2026. **Origen de los datos:** `src/logic.js`, `src/cosmetic-catalog.js` y `src/discoveries.js`. Se auditan los 100 cosméticos (97 de pago) y los tres árboles de habilidades.

## Diagnóstico de la versión 0.44

- Inicio con **170 monedas**. Un golpe perfecto de nivel 1 alcanza **~116 m teóricos**, que proporcionaría **~86 monedas** antes de obstáculos; las ganancias reales dependen de la trayectoria y las colisiones.
- El uniforme **Azul océano (350)** requería solo récord de **100 m**; la pelota **Verde menta (1.100)**, solo **un perfecto**. Podían descubrirse tras el primer batazo, sin capacidad de compra.
- Un artículo de 11.400 monedas llegaba a exigir **1.536 batazos** en la curva antigua; otros caros aparecían por un logro inmediato. No existía condición económica.
- El multiplicador incrementa un **4 % del ingreso básico por nivel**, pero el primer nivel cuesta 290: con golpes de 120 m añade 3 monedas por golpe y necesitaría aproximadamente **97 golpes** para amortizarse. Una compra de nivel 10 cuesta 2.010; a 255 m teóricos aporta unas 7–8 monedas extra por golpe. Su retorno es mucho más lento que Potencia en las fases iniciales.

## Política corregida en 0.45

- Un artículo necesita **su logro concreto** y haber acumulado ingresos de carrera por un importe de `max(0, ceil(2,2 × precio + 150 − 170))` monedas. Se usan ingresos **brutos ganados**, no saldo disponible, y no se exige comprar productos anteriores. El factor 2,2 reserva margen para invertir en habilidades.
- Al finalizar cada batazo se anuncia **un único artículo**, priorizando los de menor precio. Los demás logros quedan conservados y pendientes para batazos posteriores. Una migración de partida existente puede reconocer varios sin generar notificaciones repetitivas.
- La curva de desbloqueo por batazos se reduce a `8 + 2n + floor(0,12 n²)`; los artículos normales de esta categoría tienen ahora objetivos muy inferiores al antiguo máximo de 1.536.
- Todo lo ya descubierto o comprado permanece descubierto. Los ingresos históricos de partidas antiguas se estiman conservadoramente como `max(0, floor(metros totales × 0,75) − batazos)` cuando falta el nuevo contador; nunca se crean monedas adicionales.

## Resumen económico

| Categoría | Objetos | Coste íntegro |
|---|---:|---:|
| Bates | 35 | 180.070 |
| Ropa | 33 | 172.030 |
| Pelotas | 32 | 166.900 |
| **Total** | **100** | **519.000 monedas** |

| Siguiente subida | Potencia | Swing | Multiplicador |
|---|---:|---:|---:|
| Nivel 1→2 | 160 | 180 | 290 |
| Nivel 10→11 | 1.110 | 1.245 | 2.010 |
| Nivel 20→21 | 3.380 | 3.805 | 6.130 |
| Nivel 50→51 | 17.875 | 20.110 | 32.400 (última mejora disponible, máximo 51) |

Elevar desde el nivel 1 hasta el 50 cuesta **307.545 en Potencia**, **346.000 en Swing** y **557.505 en Multiplicador**, sumando **1.211.050 monedas** sin contar mejoras gratuitas por anuncios recompensados. No se recomienda completar los tres árboles antes de comprar cosméticos: son decisiones de gasto independientes.

### Simulación ilustrativa: 120 m por golpe, sin multiplicador

Un golpe de 120 m genera **90 monedas**. Los niveles de Potencia y Swing pueden mejorar la distancia, pero este ejemplo mantiene exactamente 120 m para no fingir una evolución real predecible.

| Batazo | Ingresos acumulados | Habilidades compradas en el ejemplo | Saldo proyectado* | Primer artículo nuevo |
|---|---:|---|---:|---|
| 1 | 90 | Ninguna | 260 | Ninguno |
| 2 | 180 | Potencia 1→2 (160) | 190 | Ninguno |
| 4 | 360 | + Swing 1→2 (180) | 190 | Ninguno |
| 7 | 630 | Ambas | 460 | Pelota azul (280) |
| 8 | 720 | Ambas | 550 | Bate dorado (320) |
| 9 | 810 | Ambas | 640 | Ropa Azul océano (350) |

\* El saldo supone **no comprar todavía cosméticos**. Si se compra un objeto, se descuenta su precio. La tabla ilustra una estrategia entre muchas; no es un pronóstico de resultados.

## Inventario completo y umbrales auditados

Los ingresos de carrera mínimos indican cuánto debe haber ganado el jugador históricamente, además de alcanzar el logro. El contador de monedas **no se reduce cuando se compra una habilidad**.

| Categoría | Artículo | Precio | Vía | Condición del logro | Ingresos mínimos |
|---|---|---:|---|---|---:|
| Bate | Bate clásico | 0 | Inicial | Incluido | 0 |
| Bate | Bate dorado | 320 | Juego | 5 batazos completados | 684 |
| Bate | Bate oceánico | 850 | Juego | 10 batazos completados | 1851 |
| Bate | Bate rubí | 1500 | Juego | 15 batazos completados | 3281 |
| Bate | Bate Nova | 3400 | Juego | 44 batazos completados | 7461 |
| Bate | Fibra de carbono | 1100 | Juego | 12 batazos completados | 2400 |
| Bate | Neón eléctrico | 1800 | Juego | 17 batazos completados | 3940 |
| Bate | Titanio pulido | 2600 | Récord | 1000 m en un batazo | 5701 |
| Bate | Bate glaciar | 3900 | Récord | 2300 m en un batazo | 8560 |
| Bate | Bate volcánico | 4200 | Récord | 2700 m en un batazo | 9220 |
| Bate | Escoba de barrendero | 2600 | Secreto | rebotar en carretera | 5701 |
| Bate | Trucha gigante | 4200 | Juego | 76 batazos completados | 9220 |
| Bate | Bate con alambre | 4600 | Juego | 96 batazos completados | 10.100 |
| Bate | Baguette crujiente | 2900 | Habilidad | 5 perfectos | 6361 |
| Bate | Plátano gigante | 3100 | Juego | 35 batazos completados | 6801 |
| Bate | Remo de regata | 3300 | Récord | 1650 m en un batazo | 7241 |
| Bate | Guitarra rockera | 5900 | Juego | 166 batazos completados | 12.961 |
| Bate | Llave inglesa | 5400 | Juego | 133 batazos completados | 11.861 |
| Bate | Martillo gigante | 6500 | Habilidad | 8 racha buenos | 14.281 |
| Bate | Palo de hockey | 4400 | Juego | 89 batazos completados | 9660 |
| Bate | Paraguas cerrado | 3500 | Juego | 49 batazos completados | 7681 |
| Bate | Cactus bateador | 7100 | Juego | 204 batazos completados | 15.601 |
| Bate | Varita astral | 9200 | Juego | 257 batazos completados | 20.220 |
| Bate | Micrófono de concierto | 4900 | Juego | 125 batazos completados | 10.760 |
| Bate | Sartén antiadherente | 5700 | Juego | 149 batazos completados | 12.521 |
| Bate | Pez espada | 9700 | Juego | 291 batazos completados | 21.320 |
| Bate | Piruleta XL | 5900 | Récord | 9600 m en un batazo | 12.961 |
| Bate | Espada de espuma | 6100 | Juego | 175 batazos completados | 13.401 |
| Bate | Tentáculo alienígena | 11.000 | Juego | 303 batazos completados | 24.181 |
| Bate | Hueso cavernícola | 8200 | Juego | 235 batazos completados | 18.020 |
| Bate | Maza medieval | 12.500 | Habilidad | 85 perfectos | 27.481 |
| Bate | Pala de jardín | 4300 | Récord | 3400 m en un batazo | 9440 |
| Bate | Rastrillo de campo | 4800 | Juego | 110 batazos completados | 10.540 |
| Bate | Zanahoria descomunal | 9600 | Juego | 280 batazos completados | 21.100 |
| Bate | Antorcha ancestral | 15.000 | Habilidad | 10 récords superados | 32.980 |
| Ropa | Clásico rojo | 0 | Inicial | Incluido | 0 |
| Ropa | Azul océano | 350 | Récord | 100 m en un batazo | 751 |
| Ropa | Verde estadio | 780 | Récord | 250 m en un batazo | 1697 |
| Ropa | Violeta | 1400 | Récord | 500 m en un batazo | 3061 |
| Ropa | Dorado campeón | 2400 | Habilidad | 3 excelentes/perfectos | 5260 |
| Ropa | Fútbol azul y granate | 2700 | Secreto | llegar al puerto | 5921 |
| Ropa | Fútbol blanco total | 2600 | Juego | 27 batazos completados | 5701 |
| Ropa | Fútbol rojiblanco | 2900 | Juego | 31 batazos completados | 6361 |
| Ropa | Fútbol amarillo | 3000 | Récord | 1300 m en un batazo | 6581 |
| Ropa | Fútbol verde | 3100 | Habilidad | 3 racha buenos | 6801 |
| Ropa | Baloncesto negro y oro | 3600 | Juego | 54 batazos completados | 7901 |
| Ropa | Baloncesto rojo | 3800 | Juego | 59 batazos completados | 8340 |
| Ropa | Baloncesto violeta | 3900 | Juego | 64 batazos completados | 8560 |
| Ropa | Hockey sobre hielo | 4400 | Habilidad | 5 racha buenos | 9660 |
| Ropa | Tenista blanco | 3100 | Juego | 40 batazos completados | 6801 |
| Ropa | Rugby verde | 4700 | Juego | 102 batazos completados | 10.320 |
| Ropa | Maillot ciclista | 4800 | Récord | 5200 m en un batazo | 10.540 |
| Ropa | Velocista neón | 4000 | Habilidad | 10 perfectos | 8780 |
| Ropa | Boxeador rojo | 5200 | Récord | 6400 m en un batazo | 11.421 |
| Ropa | Karateka blanco | 5600 | Récord | 8000 m en un batazo | 12.301 |
| Ropa | Lucha libre | 6900 | Habilidad | 45 perfectos | 15.161 |
| Ropa | Golfista clásico | 4700 | Récord | 4200 m en un batazo | 10.320 |
| Ropa | Béisbol retro | 3500 | Récord | 1900 m en un batazo | 7681 |
| Ropa | Críquet crema | 4200 | Secreto | llegar a montañas | 9220 |
| Ropa | Guardameta naranja | 4800 | Juego | 117 batazos completados | 10.540 |
| Ropa | Chef de campeonato | 7300 | Secreto | rebotar sobre un tejado | 16.041 |
| Ropa | Pescador del muelle | 7900 | Secreto | llegar al río | 17.360 |
| Ropa | Pirata del home | 9100 | Habilidad | 3 récords superados | 20.000 |
| Ropa | Vaquero del oeste | 9700 | Récord | 28.000 m en un batazo | 21.320 |
| Ropa | Astronauta orbital | 13.000 | Secreto | llegar a órbita | 28.581 |
| Ropa | Ninja del diamante | 11.200 | Habilidad | 12 racha buenos | 24.621 |
| Ropa | Bombero valiente | 11.400 | Juego | 315 batazos completados | 25.061 |
| Ropa | Jugador robótico | 16.000 | Récord | 45.000 m en un batazo | 35.180 |
| Pelota | Pelota clásica | 0 | Inicial | Incluido | 0 |
| Pelota | Pelota azul | 280 | Juego | 3 batazos completados | 596 |
| Pelota | Pelota amarilla | 620 | Juego | 8 batazos completados | 1344 |
| Pelota | Pelota verde menta | 1100 | Habilidad | 1 perfectos | 2400 |
| Pelota | Pelota lavanda | 1800 | Secreto | llegar al distrito | 3940 |
| Pelota | Pelota negra | 1950 | Récord | 800 m en un batazo | 4270 |
| Pelota | Pelota dorada | 2300 | Juego | 21 batazos completados | 5040 |
| Pelota | Pelota rosa | 2450 | Juego | 24 batazos completados | 5370 |
| Pelota | Pelota arcoíris | 3500 | Habilidad | 10 excelentes/perfectos | 7681 |
| Pelota | Mini Sol | 4300 | Juego | 82 batazos completados | 9440 |
| Pelota | Mini Luna | 4900 | Secreto | tocar pantano | 10.760 |
| Pelota | Planeta Tierra | 5800 | Récord | 3000 m en un batazo | 12.741 |
| Pelota | Planeta Marte | 5900 | Juego | 158 batazos completados | 12.961 |
| Pelota | Mini Saturno | 8100 | Juego | 225 batazos completados | 17.800 |
| Pelota | Bola 8 de billar | 6700 | Juego | 185 batazos completados | 14.721 |
| Pelota | Pelota de tenis | 3200 | Juego | 2500 m acumulados | 7021 |
| Pelota | Pelota de golf | 3700 | Secreto | llegar al bosque | 8120 |
| Pelota | Pelota de playa | 4100 | Juego | 70 batazos completados | 9000 |
| Pelota | Sandía redonda | 4500 | Secreto | tocar agua | 9880 |
| Pelota | Naranja gigante | 4800 | Habilidad | 20 perfectos | 10.540 |
| Pelota | Ojo que todo lo ve | 6800 | Juego | 194 batazos completados | 14.941 |
| Pelota | Meteorito | 8200 | Récord | 10.000 m en un batazo | 18.020 |
| Pelota | Bola de discoteca | 8800 | Récord | 17.500 m en un batazo | 19.340 |
| Pelota | Bomba de dibujos | 9500 | Juego | 268 batazos completados | 20.880 |
| Pelota | Mini calabaza | 5600 | Juego | 141 batazos completados | 12.301 |
| Pelota | Bola de nieve | 5500 | Habilidad | 35 excelentes/perfectos | 12.081 |
| Pelota | Bola de bolos | 7200 | Récord | 14.500 m en un batazo | 15.821 |
| Pelota | Dado cúbico | 7500 | Juego | 214 batazos completados | 16.480 |
| Pelota | Dónut glaseado | 9100 | Juego | 246 batazos completados | 20.000 |
| Pelota | Caramelo redondo | 9400 | Récord | 22.000 m en un batazo | 20.660 |
| Pelota | Cristal encantado | 12.500 | Récord | 35.000 m en un batazo | 27.481 |
| Pelota | Balón de fútbol | 6800 | Récord | 12.000 m en un batazo | 14.941 |

## Observaciones y riesgos pendientes

- **La velocidad de ganancia real no es constante**: la distancia depende de calidad del golpe, Potencia, colisiones y bioma. Las cifras de monedas futuras no pueden presentarse como garantizadas.
- **El multiplicador resulta poco rentable a corto plazo** con sus precios y el +4 % actual. Se recomienda reevaluarlo por separado con telemetría de partidas reales, antes de cambiar la economía global.
- **Las metas extremas de récord (hasta 110.000 m)** siguen siendo objetivos de final de juego; conviene auditar su alcanzabilidad con datos de partidas reales y física actual.
- Se conserva el catálogo completo y sus precios hasta recoger resultados de esta nueva progresión. Cambiar a la vez precios, ingresos y habilidades impediría identificar la causa de un desequilibrio.
