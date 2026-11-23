# Home Run Beyond · Tráfico con vistas 3/4 auténticas de TDR · v0.40

## Cambio solicitado
Los vehículos NO deben renderizarse con sprites cenitales pegados al suelo. Se usan las
seis ilustraciones completas en perspectiva 3/4 del Taller de Top Down RACE. Se han
copiado byte a byte a Home Run Beyond, sin alterar ningún fichero del proyecto TDR.

| Vehículo | Origen original TDR | Ruta local de Home Run Beyond |
|---|---|---|
| Hélix Spark | `public/assets/cars/workshop/helix_spark.webp` | `assets/traffic/three-quarter/helix_spark.webp` |
| Avenir Gripline | `public/assets/cars/workshop/avenir_gripline.webp` | `assets/traffic/three-quarter/avenir_gripline.webp` |
| Veloce Flash | `public/assets/cars/workshop/veloce_flash.webp` | `assets/traffic/three-quarter/veloce_flash.webp` |
| Crown Axis | `public/assets/cars/workshop/crown_axis.webp` | `assets/traffic/three-quarter/crown_axis.webp` |
| Forge Hammer | `public/assets/cars/workshop/forge_hammer.webp` | `assets/traffic/three-quarter/forge_hammer.webp` |
| Hélix Comet | `public/assets/cars/workshop/helix_comet.webp` | `assets/traffic/three-quarter/helix_comet.webp` |

## Colocación y sentido
En `src/traffic.js`, la longitud del coche se proyecta sobre el eje longitudinal
real del carril. El render se posiciona verticalmente sobre el punto de apoyo
con sus proporciones originales, en lugar de deformarlo en un paralelogramo
horizontal como se hacía con la vista cenital. Cada sentido recibe orientación
coherente; los coches que avanzan hacia la derecha invierten horizontalmente la
imagen 3/4, cuyo frontal original se encuentra a la izquierda.

Se mantiene la sombra de contacto, el tráfico continuo por dos carriles, seis
vehículos por carretera, y las reglas previas de simulación, sin modificar la
pelota ni la física de rodadura. Los vehículos se ordenan por distancia a cámara.
`src/sprites.js` reduce cada WebP grande a 512 px **una sola vez** en memoria,
para no pagar el coste de decodificación completo en cada fotograma.

## Distribución y pruebas
La precarga offline ahora apunta solo a `assets/traffic/three-quarter/`;
se reemplaza la caché por `hrb-v40-20261123-traffic-three-quarter`.
Los tests comparan los seis hashes Git contra TDR y comprueban dirección,
proyección, volteo y ausencia de deformación como textura del asfalto.

**Pendiente de validación visual en un dispositivo:** comprobar sobre carretera,
a la velocidad normal, que los seis 3/4 mantienen detalles distinguibles,
respetan el sentido de marcha y no tapan elementos del mundo. Si se detecta
que la perspectiva 3/4 no funciona bien, crear *sprites nuevos de perfil*
para esos mismos modelos (sin alterar marcas, colores, vinilos ni siluetas).
No afirmar que esa segunda fase está hecha si aún no es necesaria.
