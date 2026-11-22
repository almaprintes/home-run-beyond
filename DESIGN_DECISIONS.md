# Decisiones de dirección — alfa 0.1

## Preguntas respondidas autónomamente

**¿Simulación realista o juego arcade?** Arcade. Un primer batazo no debería salir del estadio; con habilidades avanzadas podrá cruzar carreteras, ríos y ciudades. La física mantiene trayectorias balísticas consistentes, pero las velocidades son deliberadamente fantásticas.

**¿Una o varias acciones?** Un control central. Una pulsación inicia la ronda, la siguiente batea el lanzamiento. El menú de recompensas ofrece un botón para volver a jugar. Las mejoras se realizan solo entre lanzamientos.

**¿Qué es lo que determina el resultado?** El momento del contacto y las tres habilidades. El timing humano sigue importando. Reflejos aumenta la ventana de contacto perfecto, swing reduce el tiempo de anticipación y aumenta la velocidad del bate, potencia aumenta la velocidad de salida.

**¿Qué ocurre al fallar?** Se produce un golpe flojo con distancia y recompensa reducidas. Evitamos bloquear la progresión tras un error.

**¿Cómo se progresa?** El jugador gana monedas reales de juego, proporcionales a los metros y al avance de niveles; compras con precio creciente. No hay necesidad de ver anuncios.

**¿Qué monetización?** Nada implementado en la alfa. Se propone publicidad recompensada opcional, nunca anuncios obligatorios intercalados cada swing. Nunca simular visualizaciones de anuncios.

**¿Cosméticos mejoran la jugabilidad?** No. Los bates cambian de aspecto, no alteran ninguna habilidad.

**¿Cuántos escenarios?** Un único mundo contínuo de extensión amplia, construido por zonas procedurales. Alcanza un límite técnico de 200 km en esta alfa por control de números de punto flotante.

**¿Orientación?** Vertical para jugar con una mano y mejorar compatibilidad con PWA iPhone. El diseño es responsive en horizontal/escritorio.

**¿Motor gráfico?** WebGL2 propio con instanciación y reserva Canvas 2D; sin paquetes npm ni descargas externas. Esto evita cambios inesperados de dependencias y permite jugar offline. WebGL2 es la versión visual preferida.

**¿Público y competencia?** Un jugador por dispositivo en esta primera versión. Clasificación mundial posterior, después de estabilizar físicas y economía.

**¿Públicación?** GitHub Actions + GitHub Pages, proyecto aislado de los repos de carreras; nunca modificar CraftRace, SlotRace ni sus servicios.

## Próximas prioridades

1. Probar la experiencia real en Safari iPhone, ajustar geometría, GPU y posiciones de cámara.
2. Mejorar animación de pitcher y swing, lectura del instante perfecto y variedad de lanzamientos.
3. Ampliar contenido procedural (bosques, puertos, aeronaves, puentes y objetivos especiales).
4. Añadir panel de ajustes, reducir espera de vuelos extremos y sincronizar progreso opcional.
5. Solo después de métricas de retención reales, conectar proveedor de monetización respetuosa.

## v0.2: interfaz de resultados y bonificación de habilidades

- El resultado es una tarjeta compacta en el tercio superior, sin oscurecer el mundo ni interponerse entre el usuario y la progresión.
- Las habilidades son la acción principal: dorado cuando son comprables, apagado únicamente cuando no hay monedas y verde cuando existe un bonus.
- Tras cada 4 **compras pagadas** se genera 1 crédito de habilidad extra que el usuario elige. El crédito no caduca y se guarda localmente. No cuenta como compra pagada al canjearlo.
- Alfa sin proveedor publicitario: se regala la mejora de forma transparente y se indica «BONO ALFA · SIN ANUNCIO», en lugar de simular que se ha visto un anuncio.
- Adaptador para futuros anuncios recompensados en `src/rewarded.js`, que solo concede el premio tras respuesta `{rewarded:true}`.
- En la migración de partidas anteriores, las mejoras ya obtenidas cuentan para desbloquear el primer bonus.