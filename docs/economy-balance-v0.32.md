# Home Run Beyond — economía 0.32

## Decisión de diseño

Progresión objetivo: alcanzar un batazo de **50 km** tras aproximadamente
**2.000–4.000 golpeos** de un jugador competente que compra las tres skills
según su utilidad. No es un objetivo garantizado para cualquier jugador.

Se conserva la economía original **hasta el nivel 50 (inclusive)**. La
subida cuadrática posterior se cambia por una curva sublineal, sin reducir
ningún coste respecto al nivel anterior:

- Para nivel hasta 50: `floor_5(base * (1 + 0.30*(nivel-1) + 0.04*(nivel-1)^2))`
- A partir del nivel 51:
  `floor_5(base * (1 + 0.30*49 + 0.04*49^2) + 180*(base/160)*(nivel-50)^0.65)`
- Bases: Potencia 160, Swing 180, Multiplicador 290 monedas.
- El Multiplicador tiene tope efectivo **nivel 51 (×3.00)**: a partir de ahí
  no se puede comprar ni canjear un bono en esa skill.
- El bono gratis se desbloquea **cada cinco compras pagadas**, pero solo
  se canjea con confirmación de un anuncio recompensado real. En la PWA sin
  proveedor, se acumulan los bonos pendientes.
- Ningún cambio en `SAVE_KEY`, saldo, premios `0.75 m`, física,
  récords o cuentas anteriores.

## Valores de comprobación

| Potencia actual | Coste próximo nivel |
|---|---:|
| 1 | 160 |
| 49 | 17.205 |
| 50 | 17.875 |
| 51 | 18.055 |
| 100 | 20.165 |
| 200 | 22.550 |
| 500 | 27.425 |
| 1.318 | 36.595 |

## Simulaciones previas (23-11-2026)

Se calibraron mediante el código real del motor de `BaseballGame.simulateStep`,
utilizando **256 potencias de referencia** y **nueve combinaciones de calidad
y dirección por potencia**. Entre los puntos de calibración, las distancias se
interpolaron; los rebotes y terrenos concretos de esas nueve combinaciones sí
pasaron por el motor físico. Por tanto, son proyecciones de diseño, no predicción
exacta ni resultados de usuarios reales.

Política de juego utilizada: 60% Perfecto, 25% Excelente, 12% Bueno, 3% fallo;
error de dirección gaussiano y semilla reproducible; subir Swing aproximadamente
a `ceil(Potencia^0.72)`, Multiplicador a `min(51,ceil(Potencia^0.60))`;
el resto de mejoras va a Potencia. Sin anuncios ni compras con dinero real.
Un batazo con mayor energía puede incluso recorrer menos distancia por
colisiones, aunque se alcance el umbral al mejorar.

- **12 simulaciones** con semillas diferentes: **3.543–3.615 golpes** para 50 km.
- Ejecución de referencia: **3.560 golpes**, 1.547 mejoras compradas,
  Potencia **1.322**, Swing **177**, Multiplicador **51** y **41,5 M**
  monedas ganadas; 50.216 m de mejor golpe.
- Perfil con 80% perfectos: 3.220–3.255 golpes (cinco semillas).
- Perfil con 40% perfectos: 3.980–4.048 golpes (cinco semillas).
- Partiendo de los niveles aproximados 49/17/9 y 1.311 monedas:
  **2.878 golpes adicionales** en una semilla de referencia, no una garantía
  individual.
- Economía anterior, con el mismo perfil y precio cuadrático,
  exigía alrededor de **106.409 golpes**.

Progresión de referencia: 1 km → 177; 5 km → 2.243;
10 km → 2.745; 20 km → 3.136; 30 km → 3.327;
40 km → 3.461; 50 km → 3.560 golpes.

## Control de calidad

Tests verifican continuidad y monotonicidad de costes, conservación de
precios hasta nivel 50, saldo y nivel de partidas existentes, tope ×3,
bonos pendientes y el gasto total de la ruta equilibrada.

## Límite de interpretación

El modelo asume una distribución de aciertos fija y no mide la habilidad
real en un iPhone ni los tiempos de espera entre golpes. Enviar el juego a
usuarios y observar tasas de progresión reales será necesario antes de
dar por definitiva la curva.
