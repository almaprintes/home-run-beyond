# Home Run Beyond · Cosméticos de verdad · v0.34

## Principio de diseño

- El juego seguirá siendo de sesiones cortas: **JUGAR**, **TIENDA**, **CONFIGURACIÓN**. Sin login, rankings, temporadas ni tareas diarias.
- El catálogo inicial tiene **100 entradas reales**: **35 bates, 33 uniformes y 32 pelotas**, cada una con precio, identificador y una descripción visual. Compras y equipamiento exclusivamente locales y con monedas del juego.
- Las primeras versiones permiten variaciones sencillas de color; después llegan modelos **procedurales con forma, accesorios y texturas propias**.
- Una pelota etiquetada *Solar* debe enseñar rayos y superficie solar; una *Lunar*, cráteres; una *Tierra*, continentes. La antigua pelota id `sun` se mantiene adquirida y pasa a llamarse **Pelota amarilla**. El **Mini Sol** real usa el id `sol`.
- El bate con alambre (`alambre`) evoca el objeto posapocalíptico solicitado sin utilizar marcas, nombres ni diseños oficiales de terceros. Los uniformes se inspiran en estilos deportivos sin utilizar escudos ni equipaciones licenciadas.
- Ningún cosmético aumenta la potencia, facilita el swing ni modifica el multiplicador. Sin packs aleatorios ni compras con dinero real.

## Modelo técnico

1. `src/cosmetic-catalog.js`: datos verificables por categoría, diseños, rareza y coste (fuente única).
2. `src/cosmetic-art.js`: Canvas 2D procedural con siluetas para bates, patrones superpuestos para ropa y esferas/objetos ilustrados para las pelotas. El sistema dibuja en navegador sin descargar 100 archivos de imagen.
3. `src/sprites.js`: usa el mismo equipamiento y posiciones aprobadas del bateador en sus cinco poses; conserva la física original. Las pelotas especiales dibujan sus formas, incluidos rayos y anillos, en vuelo.
4. `src/game.js`: miniaturas reales del mismo motor de dibujo, tres pestañas con compra/equipar, persistencia local, caché de miniaturas y aviso de saldo insuficiente.
5. El progreso se mantiene bajo la misma clave `hrb-v1-progress`; migrar no elimina monedas, récords ni cosméticos anteriores.

## Convenciones de precio

El precio se expresa en **monedas ganadas con batazos**, no euros. Rarezas: Común (<1.500), Raro (1.500–4.199), Épico (4.200–11.999), Leyenda (12.000 o más). Las rarezas son informativas; no cambian el juego.

## Bates (35)

| Nombre | Precio | Diseño físico | Rareza |
|---|---:|---|---|
| Bate clásico | 0 | `classic` | COMÚN |
| Bate dorado | 320 | `wood` | COMÚN |
| Bate oceánico | 850 | `wood` | COMÚN |
| Bate rubí | 1500 | `wood` | RARO |
| Bate Nova | 3400 | `nebula` | RARO |
| Fibra de carbono | 1100 | `carbon` | COMÚN |
| Neón eléctrico | 1800 | `neon` | RARO |
| Titanio pulido | 2600 | `metal` | RARO |
| Bate glaciar | 3900 | `ice` | RARO |
| Bate volcánico | 4200 | `flame` | ÉPICO |
| Escoba de barrendero | 2600 | `broom` | RARO |
| Trucha gigante | 4200 | `trout` | ÉPICO |
| Bate con alambre | 4600 | `wire` | ÉPICO |
| Baguette crujiente | 2900 | `bread` | RARO |
| Plátano gigante | 3100 | `banana` | RARO |
| Remo de regata | 3300 | `paddle` | RARO |
| Guitarra rockera | 5900 | `guitar` | ÉPICO |
| Llave inglesa | 5400 | `wrench` | ÉPICO |
| Martillo gigante | 6500 | `hammer` | ÉPICO |
| Palo de hockey | 4400 | `hockey` | ÉPICO |
| Paraguas cerrado | 3500 | `umbrella` | RARO |
| Cactus bateador | 7100 | `cactus` | ÉPICO |
| Varita astral | 9200 | `wand` | ÉPICO |
| Micrófono de concierto | 4900 | `mic` | ÉPICO |
| Sartén antiadherente | 5700 | `pan` | ÉPICO |
| Pez espada | 9700 | `swordfish` | ÉPICO |
| Piruleta XL | 5900 | `lollipop` | ÉPICO |
| Espada de espuma | 6100 | `foam` | ÉPICO |
| Tentáculo alienígena | 11.000 | `tentacle` | ÉPICO |
| Hueso cavernícola | 8200 | `bone` | ÉPICO |
| Maza medieval | 12.500 | `mace` | LEYENDA |
| Pala de jardín | 4300 | `shovel` | ÉPICO |
| Rastrillo de campo | 4800 | `rake` | ÉPICO |
| Zanahoria descomunal | 9600 | `carrot` | ÉPICO |
| Antorcha ancestral | 15.000 | `torch` | LEYENDA |

## Ropa y equipaciones (33)

| Nombre | Precio | Diseño físico | Rareza |
|---|---:|---|---|
| Clásico rojo | 0 | `classic` | COMÚN |
| Azul océano | 350 | `classic` | COMÚN |
| Verde estadio | 780 | `classic` | COMÚN |
| Violeta | 1400 | `classic` | COMÚN |
| Dorado campeón | 2400 | `classic` | RARO |
| Fútbol azul y granate | 2700 | `stripes` | RARO |
| Fútbol blanco total | 2600 | `shoulders` | RARO |
| Fútbol rojiblanco | 2900 | `stripes` | RARO |
| Fútbol amarillo | 3000 | `hoops` | RARO |
| Fútbol verde | 3100 | `chevron` | RARO |
| Baloncesto negro y oro | 3600 | `basket` | RARO |
| Baloncesto rojo | 3800 | `basket` | RARO |
| Baloncesto violeta | 3900 | `basket` | RARO |
| Hockey sobre hielo | 4400 | `hockey` | ÉPICO |
| Tenista blanco | 3100 | `polo` | RARO |
| Rugby verde | 4700 | `hoops` | ÉPICO |
| Maillot ciclista | 4800 | `cycling` | ÉPICO |
| Velocista neón | 4000 | `running` | RARO |
| Boxeador rojo | 5200 | `boxing` | ÉPICO |
| Karateka blanco | 5600 | `kimono` | ÉPICO |
| Lucha libre | 6900 | `wrestling` | ÉPICO |
| Golfista clásico | 4700 | `polo` | ÉPICO |
| Béisbol retro | 3500 | `pinstripes` | RARO |
| Críquet crema | 4200 | `polo` | ÉPICO |
| Guardameta naranja | 4800 | `jersey` | ÉPICO |
| Chef de campeonato | 7300 | `chef` | ÉPICO |
| Pescador del muelle | 7900 | `fisher` | ÉPICO |
| Pirata del home | 9100 | `pirate` | ÉPICO |
| Vaquero del oeste | 9700 | `cowboy` | ÉPICO |
| Astronauta orbital | 13.000 | `astronaut` | LEYENDA |
| Ninja del diamante | 11.200 | `ninja` | ÉPICO |
| Bombero valiente | 11.400 | `fireman` | ÉPICO |
| Jugador robótico | 16.000 | `robot` | LEYENDA |

## Pelotas (32)

| Nombre | Precio | Diseño físico | Rareza |
|---|---:|---|---|
| Pelota clásica | 0 | `baseball` | COMÚN |
| Pelota azul | 280 | `baseball` | COMÚN |
| Pelota amarilla | 620 | `baseball` | COMÚN |
| Pelota verde menta | 1100 | `baseball` | COMÚN |
| Pelota lavanda | 1800 | `baseball` | RARO |
| Pelota negra | 1950 | `baseball` | RARO |
| Pelota dorada | 2300 | `baseball` | RARO |
| Pelota rosa | 2450 | `baseball` | RARO |
| Pelota arcoíris | 3500 | `rainbow` | RARO |
| Mini Sol | 4300 | `sun` | ÉPICO |
| Mini Luna | 4900 | `moon` | ÉPICO |
| Planeta Tierra | 5800 | `earth` | ÉPICO |
| Planeta Marte | 5900 | `mars` | ÉPICO |
| Mini Saturno | 8100 | `saturn` | ÉPICO |
| Bola 8 de billar | 6700 | `billiard` | ÉPICO |
| Pelota de tenis | 3200 | `tennis` | RARO |
| Pelota de golf | 3700 | `golf` | RARO |
| Pelota de playa | 4100 | `beach` | RARO |
| Sandía redonda | 4500 | `watermelon` | ÉPICO |
| Naranja gigante | 4800 | `orange` | ÉPICO |
| Ojo que todo lo ve | 6800 | `eyeball` | ÉPICO |
| Meteorito | 8200 | `meteor` | ÉPICO |
| Bola de discoteca | 8800 | `disco` | ÉPICO |
| Bomba de dibujos | 9500 | `bomb` | ÉPICO |
| Mini calabaza | 5600 | `pumpkin` | ÉPICO |
| Bola de nieve | 5500 | `snow` | ÉPICO |
| Bola de bolos | 7200 | `bowling` | ÉPICO |
| Dado cúbico | 7500 | `dice` | ÉPICO |
| Dónut glaseado | 9100 | `donut` | ÉPICO |
| Caramelo redondo | 9400 | `candy` | ÉPICO |
| Cristal encantado | 12.500 | `crystal` | LEYENDA |
| Balón de fútbol | 6800 | `soccer` | ÉPICO |

## Limitaciones de la primera entrega

Las piezas se dibujan con geometría 2D procedural superpuesta a las poses originales y no son modelos 3D independientes. Esto permite un catálogo amplio y ligero, pero los detalles pequeños pueden reducirse visualmente a mucha distancia y algunos objetos fantásticos necesitarán ilustraciones mejoradas tras probarlos en el iPhone. Los nombres y diseños originales pueden refinarse sin alterar la persistencia de sus IDs.
