# Créditos de audio — Home Run Beyond

## Golpe de bate (grabación real)

**«Hitting baseball w. wooden bat.wav» — CGEffex**, publicado en
[Freesound, sonido 93136](https://freesound.org/people/CGEffex/sounds/93136/).

Licencia: **[Creative Commons Attribution 4.0 International — CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**.
El autor debe ser reconocido en cualquier distribución del efecto.

Cambios: se ha seleccionado un fragmento de aproximadamente 0,4 segundos,
convertido a mono, filtrado para eliminar ruidos fuera de banda y aplicado
un desvanecimiento de salida. Para garantizar una PWA descargable sin
conexión se conserva en el repositorio una versión corta de respaldo
(`assets/audio/bat-cgeffex-source.wav`) previamente procesada a partir de
esa misma grabación, compartida públicamente en el proyecto
[DEADBALL](https://github.com/gopherbone/deadball)
(que también acredita expresamente a CGEffex, bajo CC BY 4.0).

Una copia de calidad mayor del mismo sonido se intenta preparar desde la
vista previa pública en cada compilación; en caso de que no esté disponible,
se emplea la versión de respaldo. Ambas proceden del sonido 93136.

Este crédito aparece también en **Configuración > Créditos de audio**.

## Materiales (candidatos CC0)

Como mejora de asfalto y fachada, el proceso de compilación intenta utilizar
dos grabaciones de campo de Freesound, ambas con licencia CC0 1.0:

- **«Bouncing Ball.wav» — JaenKleynhans**, [Freesound 267882](https://freesound.org/people/JaenKleynhans/sounds/267882/).
  Un balón rebotando en una superficie dura o pared.
- **«boing.wav» — BranRainey**, [Freesound 108737](https://freesound.org/people/BranRainey/sounds/108737/).
  Grabación de una pelota contra una pared interior.

La extracción de estas dos grabaciones es opcional: si Freesound no publica
su vista previa en una URL disponible, el juego utiliza síntesis local
**específica para superficie dura**, separada de los botes de hierba y de
los impactos metálicos (que no se modifican).

Las grabaciones opcionales descargadas se guardan como recursos del juego
en la publicación de GitHub Pages: no se requiere conexión con Freesound
para reproducirlas durante una partida.

## Materiales conservados

Los rebotes de **hierba** y los impactos **metálicos** contra contenedores
mantienen los sonidos aprobados en las versiones 0.47–0.49.

Ninguno de los sonidos se utiliza para activar o alterar la física.

## 0.53 — solo grabación real
El WAV PCM de la misma grabación se incluye directamente en el repositorio y en la caché PWA, incluso si Pages publica sin ejecutar el generador. Se precarga antes de empezar a jugar. Se elimina la síntesis del golpe del bate; si WebAudio falla, solo se intenta reproducir el WAV real. Los sonidos de otras superficies permanecen intactos.

## 0.54 — impacto aislado y más fuerte
Ganancia WebAudio del golpe CGEffex multiplicada por tres (perfecto 0,72), sin modificar velocidad ni añadir efectos. El movimiento del bate y los swings al aire quedan silenciosos; se conserva la voz de strike. Las superficies mantienen sus ganancias originales.
