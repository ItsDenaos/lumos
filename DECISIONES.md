# Decisiones tomadas al construir

Cuando el plan era ambiguo o algo no encajaba, se eligió la opción más simple y se anotó aquí.

> Las fases 1 a 7 se escribieron cuando el juego era "Inti y Killa", con estética inca. Desde el rediseño (al final de este archivo), Inti es **Mos** y Killa es **Lu**; lo que esas secciones dicen del arte, la fuente y la música quedó sustituido por el pixel art y el chiptune de Lumos.

## Fases 1 a 3

### Física

- **Escalón bajo automático (20 px).** El plan dice que quien es inmune "camina por dentro" de su charco, medio hundido. Como el charco deja el suelo media baldosa más abajo, para salir sin saltar los personajes suben solos escalones de hasta 20 px cuando caminan por el suelo. Como toda la geometría es de baldosas enteras, esto solo ocurre en los bordes de los charcos (y, en la fase 4, al subir a un bloque hundido en un charco). Se ajusta en `PHYSICS.stepHeight`.
- **Gravedad con velocidad media del paso.** El desplazamiento vertical usa la media de la velocidad al principio y al final del paso, así la parábola es exacta y el salto alcanza los 98 px del plan (con Euler simple serían unos 93).
- **Frenado en el aire.** El plan solo da el frenado en suelo. Sin dirección pulsada en el aire, el personaje frena con la aceleración de aire (1500 px/s²). Al cambiar de sentido en el suelo se usa el frenado (2600) hasta pararse.
- **Salto variable.** Al soltar el salto mientras se sube, la velocidad vertical se multiplica por 0,45 una sola vez. Un toque muy corto da un saltito mínimo.
- **Paso fijo estable.** Si un fotograma dura casi exactamente 1/60 s (±0,5 ms), cuenta como un paso justo, para que las fluctuaciones de los monitores de 60 Hz no alternen fotogramas de 0 y 2 pasos. El dibujo interpola la posición de los personajes entre pasos, así se ve suave en monitores de 120 o 144 Hz.

### Reglas

- **Muerte en charcos.** Se muere si el solape con la mitad superior de la baldosa del charco supera 4 px en ambos ejes a la vez.
- **Gemas.** Caja de recogida de 24 × 24 px centrada en su celda.
- **Puertas.** Un personaje está "frente a su puerta" si el centro de su caja cae dentro de la celda de la puerta o la de encima. No hace falta estar en el suelo.
- **Muerte.** Durante el segundo de animación ambos se quedan quietos. Si mueren los dos en el mismo paso, cuentan las dos muertes.
- **R reinicia** posiciones, gemas y cronómetro, pero conserva el contador de muertes del nivel (para los piques).
- **Tercera estrella** con tiempo menor o igual al objetivo.
- **El cronómetro** arranca con la primera tecla de juego de cualquiera (moverse, saltar o accionar); las teclas generales (pausa, R, F) no lo arrancan.
- **Pausa con P.** En pantalla completa los navegadores usan Esc para salir de ella y no lo pasan a la página, así que P siempre funciona.

### Niveles

- **Charcos en el borde inferior.** El nivel 1 del plan tiene charcos en la última fila. Como su mitad inferior es sólida, el borde sigue cerrado: el validador acepta `o`, `p` y `x` en la fila inferior.
- **Recorrido del nivel 1 con la física real.** `tests/playthrough.test.ts` juega el nivel 1 con dos bots deterministas: ambos llegan a su puerta con sus 3 gemas, sin morir y bajo los 40 s. El bot de Inti recoge el segundo sol saltando desde encima del bloque de piedra.

### Pantallas (provisional hasta la fase 6)

- El juego arranca directamente en el nivel 1. La pausa y los resultados son versiones básicas: Enter pasa al siguiente nivel (o repite si es el último).
- En modo depuración, `?debug&nivel=N` empieza en el nivel N.

### Técnica

- **Versiones.** Se instalaron las últimas disponibles al crear el proyecto: TypeScript 7, Vite 8, Vitest 5 y vite-plugin-singlefile 2.
- **Fuente.** Solo Fredoka *latin* en pesos 500 y 700, en woff2 (~32 KB), cargada con la API `FontFace` e incrustada en el HTML. Fredoka no tiene las flechas ← → ↑ ↓: se dibujan con la fuente de reserva. En la fase 6 se dibujarán como teclas.
- **Nitidez.** El búfer del canvas usa la resolución real de la pantalla (`devicePixelRatio`) y se dibuja en coordenadas lógicas de 1280 × 720.
- **npm audit.** Avisa de 3 vulnerabilidades "altas" en `braces`/`micromatch`, que llegan a través de `vite-plugin-singlefile`. Solo se usan al compilar, con patrones propios, y no llegan al juego. `npm audit fix --force` bajaría el plugin a la versión 0.9, así que no se aplica.
- **Puerto de la vista previa.** `.claude/launch.json` usa el puerto 5288 porque el 5173 estaba ocupado por otro proyecto. `npm run dev` sigue usando el puerto por defecto de Vite.

## Fase 4 · Mecanismos

- **Orden de cada paso:** palancas y botones → canales → plataformas (con pasajeros) → personajes (empujan bloques) → bloques (gravedad) → gemas, charcos y puertas. Los botones miran las posiciones del principio del paso: el retraso es de 1/60 s y no se nota.
- **Botón.** Detecta peso en una franja de 32 × 8 px sobre el suelo de su celda. Lo pisa cualquier personaje o bloque que la toque.
- **Palanca.** La acciona quien tenga el centro en su columna y toque su celda. Los dos pueden usar cualquier palanca (Inti con ↓, Killa con S), como dice la tabla del plan.
- **Plataformas.**
  - Siempre empiezan en `at`. Si su canal empieza activo (una palanca con `startOn`), arrancan hacia `to` desde el primer momento.
  - Se mueven en línea recta y atraviesan la piedra.
  - Un pasajero es todo cuerpo apoyado encima (a 0,5 px o menos) que no esté subiendo, incluidas las pilas: un bloque sobre la cabeza de un pasajero viaja con él.
- **Nunca aplastan.** Una plataforma se detiene si su nueva posición pisaría a alguien que no va encima, o si al subir algún pasajero chocaría con el techo. Al bajar o en horizontal, el pasajero que no cabe simplemente se queda. Por ejemplo, quien está con medio cuerpo en el suelo no baja con el ascensor.
- **Empujar bloques.**
  - Empujando se avanza a 110 px/s en vez de pararse.
  - Un bloque no empuja a otro bloque (no hay cadenas).
  - Los personajes son sólidos para los bloques: un bloque cae sobre una cabeza y se queda apoyado, y no se puede empujar a través del otro personaje.
  - Lo que va encima de un bloque empujado viaja con él si cabe.
- **Encaje de bloques.** Un bloque empujado que queda a 3 px o menos de alinearse sobre un hueco o un charco se coloca justo encima para caer. Sin esto, un charco de una baldosa no lo atraparía nunca, porque el bloque siempre se apoya en uno de los bordes. Una vez hundido en el charco ya no se puede sacar: queda como puente.
- **Interpolación.** El mundo guarda la posición anterior de todo (personajes, bloques y plataformas) al principio del paso, antes de que las plataformas muevan a sus pasajeros, para que el viaje se vea suave.
- **Sandbox.** Nivel con id 0 que solo existe en modo depuración (`?debug&nivel=sandbox`, o con N tras el último nivel). `tests/sandbox.test.ts` lo recorre entero con dos bots que usan cada mecanismo.
- **Estructura.** Las gemas y puertas pasaron a `src/game/entities/`, junto a botón, palanca, plataforma y bloque, como en el árbol del plan.

## Fase 5 · Arte y animación

- **Capas en caché.** El fondo y la piedra se pintan una sola vez por nivel en canvases aparte, a la resolución real de la pantalla, así que todo se ve nítido. Solo se repintan al cambiar de nivel, de zona o de tamaño de ventana; cada repintado tarda unos 100–170 ms.
- **Sillería inca.** Hileras de media baldosa. Las juntas horizontales son curvas que dependen solo de la x, así la piedra de arriba y la de abajo comparten exactamente el mismo borde y encajan sin huecos. Las juntas verticales van inclinadas al azar. Cada piedra tiene relieve almohadillado (más clara arriba a la izquierda). El dibujo es siempre el mismo para cada nivel.
- **Cielo de Los Andenes.** El plan da "#FFB4A2 a #6D597A"; se usa #6D597A arriba y #FFB4A2 en el horizonte, como un amanecer. El sol naciente ya aparece mordido por la sombra del eclipse, como en la historia.
- **Coricancha.** Es un interior y el plan solo da piedra, oro y plata. El fondo se deriva de esos tres colores: sillería oscura, banda de placas de oro y plata, nichos trapezoidales, y el sol de oro y la luna de plata del templo.
- **Personajes.**
  - El dibujo mide unos 36 × 60 px sobre la caja de 24 × 44; el tocado de Inti asoma por encima.
  - Las trenzas de Killa son un muelle amortiguado que sigue su velocidad.
  - Al morir, Inti pierde el color con `ctx.filter` (`grayscale`), que funciona en Chrome, Edge y Firefox.
  - Al ganar celebran 0,35 s (saltito y brazos arriba) y luego entran por su puerta hasta que salen los resultados.
- **Muros de metal.** El de oro lleva el sol de Inti y el de plata la luna de Killa, así también se distinguen sin color.
- **Partículas.** Usan `Math.random`: son solo visuales y no tocan la lógica, que sigue siendo determinista. Killa suelta un destello cada 0,05 s mientras se mueve.
- **Iluminación barata.** La capa de oscuridad se calcula a 320 × 180 y se amplía; al ser un degradado suave no se nota. Así bajó de 46 ms a 5,5 ms por fotograma a 2560 × 1440. Solo los personajes tiñen su luz; gemas, puertas y mecanismos ya dibujan su propio halo.
- **Rendimiento medido en este equipo.**
  - A 1280 × 720: 2,4–3,3 ms por fotograma.
  - A 2560 × 1440: 5,4–6 ms por fotograma, incluido un nivel oscuro.
  - El margen para 60 FPS es de 16,7 ms.
- **Reducir efectos.** Ya existe en los ajustes; la opción para cambiarlo llega en la fase 6. Cuando está activo:
  - no titilan las estrellas ni late la corona;
  - los destellos de la plata quedan fijos;
  - no aparece el anillo al recoger gemas;
  - sale la mitad de partículas y el rastro de Killa se espacia.
- **Depuración extra.** Z cambia la zona del arte y L alterna la oscuridad en cualquier nivel. Sirven para revisar las tres paletas y la iluminación antes de que existan niveles de las zonas 2 y 3 (fase 7).

## Fase 6 · Pantallas, progreso y sonido

- **Pila de escenas.** La pausa, los resultados, las opciones y "Cómo jugar" se apilan sobre la pantalla anterior, que se sigue viendo debajo. Con la pausa encima, la partida queda congelada y el cronómetro no avanza. Con los resultados encima, el nivel sigue animándose (agua, partículas) sin que nadie se mueva.
- **Menús.**
  - Se manejan con las flechas o WASD, Enter o Espacio para confirmar, y Esc o Retroceso para volver.
  - El ratón selecciona al pasar por encima (solo si se mueve, para no pisar la selección del teclado) y confirma con un clic. Sobre lo que se puede pulsar, el cursor es una mano.
  - El icono de pausa del HUD también se puede pulsar.
- **Mapa de niveles.**
  - Tiene 9 huecos fijos en zigzag, tres por zona, de abajo arriba. Solo se dibujan los niveles que existen; por ahora, el 1.
  - ← o ↓ va al nivel anterior y → o ↑ al siguiente (el camino sube), saltando los bloqueados.
  - Bajo cada nodo salen sus estrellas y su mejor tiempo.
- **Guardado** en `localStorage`, clave `inti-killa-save-v1`.
  - Guarda la versión, el nivel más alto desbloqueado, las estrellas y el mejor tiempo por nivel, las opciones y las muertes totales de cada uno (para el final).
  - Si los datos guardados son de otra versión, se empieza una partida nueva: aún no hay migraciones.
  - Los datos se revisan campo a campo: lo que no tiene sentido vuelve a su valor por defecto.
  - Se guarda al cambiar una opción, al silenciar, al ganar y en cada muerte. El sandbox no guarda nada.
- **Récords.** Ganar nunca empeora un récord: se queda con más estrellas y el menor tiempo. Ganar el último nivel no desbloquea nada más.
- **Final.** Se llega pulsando "Siguiente" en los resultados del último nivel de la campaña. Como estadísticas totales muestra las estrellas (de 27), la suma de los mejores tiempos y las muertes de cada uno. Créditos: "Una idea de Moisés" (de la firma del plan), Claude Code y la fuente Fredoka (licencia SIL OFL).
- **Sonido.**
  - El audio se crea en la primera tecla o clic de verdad (los navegadores no dejan sonar antes).
  - Mezcla: volumen general → música (al 45 %) y efectos.
  - M es un silencio aparte del volumen: no lo cambia, se guarda y avisa en pantalla.
  - Las plataformas zumban mientras alguna se mueve.
  - En los resultados suena un tintineo por cada estrella que aparece.
- **Música generativa.**
  - Hay un ambiente por zona, más otro para el título y otro para el final, en escala pentatónica y con una semilla fija.
  - La flauta es un seno con un armónico, vibrato de 5,2 Hz y un poco de aliento al empezar cada nota.
  - El colchón son tres osciladores filtrados que cambian de acorde cada 16 pulsos.
  - Las notas se programan con 0,3 s de adelanto.
- **Flechas en el texto.** Todas las flechas ← → ↑ ↓ se dibujan como vectores (Fredoka no las trae), en las ayudas de los niveles, en "Cómo jugar" y en los avisos. Esto resuelve lo pendiente de la fase 1.
- **Pantalla completa desde Opciones.** Funciona porque se pide justo después de la tecla o el clic, cuando el navegador aún lo permite.
- **Depuración.** Con `?debug`, el contexto del juego queda en `window.intiKilla` para inspeccionarlo desde la consola. `?debug&nivel=N` sigue entrando directo en un nivel, sin pasar por el título.

## Fase 7 · Los 9 niveles

- **Comprobador de alcance** (`src/levels/reachability.ts`). Hace una búsqueda en anchura por baldosas para cada personaje con las reglas de salto del plan:
  - subir 2 baldosas como mucho, con 4 libres sobre el punto de salto;
  - huecos de 3 en plano y de 2 subiendo;
  - saltos más cortos en pasillos bajos.
  - El estado incluye qué canales están activos, y se pueden cambiar en cualquier momento (se supone que el compañero o una palanca lo hacen). Así cada plataforma se prueba en sus dos posiciones, y quien va encima viaja con ella.
  - Los bloques se suponen empujables a cualquier sitio donde puedan quedar parados.
  - Es optimista a propósito: solo avisa de lo que seguro no se alcanza.
- **Charcos pequeños se saltan siempre.** Con esta física, un charco de 1 o 2 baldosas se salta incluso en un pasillo de 2 de alto: el saltito da unos 65 px de vuelo y hacen falta unos 57. Por eso, en "La ofrenda", el puente es un pozo de una baldosa con oro al fondo. Inti baja sin problema; Killa solo puede bajar después de que el bloque caiga y se hunda en el charco.
- **Trampa del nivel 4.** El carril de Killa baja 3 baldosas, y por ahí no hay vuelta atrás. Si salta abajo sin haber accionado antes la palanca rosa, Inti queda encerrado para siempre y hay que pulsar R. Una ayuda en pantalla lo explica.
- **Muros del nivel 9.** Sobre la base del Intihuatana los muros miden 2 de alto: Inti atraviesa el de oro y Killa lo salta para llegar a su puerta, al otro lado de la piedra del sol.
- **Cómo se diseñó cada nivel.**
  - 2 · Oro y plata: dos pasillos unidos por andenes; cada uno salta los charcos del otro.
  - 3 · La piedra que sube: dos ascensores; cada uno sube al otro.
  - 4 · Palancas del recinto: dos carriles con cuatro compuertas, cada una abierta por la palanca del otro.
  - 5 · La ofrenda: un bloque de puente, otro de escalón y otro sobre el botón. Un escalón impide que el bloque se pase del botón.
  - 6 · Muros de oro y plata: suelos de metal por los que solo cae su dueño, y muros que guardan los mecanismos del otro.
  - 7 · Penumbra: charcos, una compuerta y dos ascensores, a oscuras.
  - 8 · La escalera del cóndor: cuatro ascensores encadenados, turnándose en los botones, sobre un foso de sombra.
  - 9 · El Intihuatana: tres pisos con todo, una barca sobre la sombra y las puertas junto a la piedra del sol.
- **Recorridos con bots** (`tests/campaign-walkthrough.test.ts`). Cada nivel lo juegan dos bots deterministas con la física real y lo completan con todas las gemas, sin morir y bajo el tiempo objetivo. Así se comprueba que en todos se pueden conseguir las 3 estrellas.
- **Tiempos objetivo.** Los bots juegan perfecto y conociendo la ruta: tardan entre 6 y 27 s, mucho menos que una buena partida humana. Por eso se mantienen los tiempos objetivo del plan hasta probarlos jugando; el plan dice que después se fijan en unas 1,3 veces el tiempo de una buena partida.
- **Arreglo visual.** El reflejo de los muros de metal se pintaba fuera de su baldosa; ahora se recorta a ella.

## Rediseño · Lumos

Se cambió la temática sin tocar las mecánicas ni los 9 niveles: los personajes son **Lu** (la luna, plata, WASD) y **Mos** (el sol, oro, flechas), la historia es la del reloj del cielo, y todo el arte pasó a pixel art.

- **Nombres en el código.** `PlayerId` es `'lu' | 'mos'`; en los mapas, `L` es el inicio de Lu y `M` el de Mos (antes `K` e `I`). Las zonas son `forest`, `sanctuary` y `observatory` (Bosque del Alba, Santuario de los Astros y Observatorio). Los niveles 8 y 9 se llaman "La escalera del cielo" y "El reloj del cielo".
- **Guardado nuevo.** La clave pasa a `lumos-save-v1`: el progreso de "Inti y Killa" no se lee (sus muertes estaban guardadas con los nombres viejos).
- **Lienzo del arte.** El mundo se pinta en un canvas de 640 × 360 (una baldosa son 20 × 20 píxeles del arte) y se amplía ×2 sin suavizar. La lógica sigue en 1280 × 720: las posiciones se pasan al arte redondeando a la mitad. El texto (ayudas, HUD, menús) se dibuja encima a resolución lógica con la fuente pixel, para que se lea bien.
- **Escalado entero.** Si cabe perdiendo como mucho un 15 % de tamaño, cada píxel del arte ocupa un número entero de píxeles de la pantalla (en 1920 × 1080, justo 3); si no, se llena la ventana como antes.
- **Personajes: la hoja de sprites del diseño.** Primero se redibujaron a mano en código (rejillas de 28 × 36 a píxel doble), pero quedaban muy lejos del diseño: con unos 30 píxeles de alto no cabe ese detalle, ni siquiera reduciendo la propia hoja. Así que el juego usa la hoja original, convertida por `tools/sprites/convertir.py` (Python + Pillow):
  - La hoja es una ilustración "estilo pixel art" sin rejilla real (unos 9.500 colores por fotograma), comprimida y con fondo de pergamino. El script quita el pergamino con un relleno desde el borde (más el que queda atrapado entre el báculo y la túnica), reduce cada bloque de 2,5 × 2,5 a un píxel, deja 32 colores por personaje (paleta común a todos sus fotogramas), quita motas y trozos del fotograma vecino, y oscurece el contorno pardo del original.
  - Retoques a mano en el hechizo de Lu: fuera los remolinos de luz cian (sobre fondo oscuro quedaban como manchas pálidas) y la media luna, rehecha con la del reposo. Los destellos del hechizo los dibuja el juego alrededor de la media luna. La estela dorada del espadazo de Mos sí se conserva: viene en sus fotogramas.
  - Cada fotograma va en una celda fija (Lu 57 × 73, Mos 69 × 63) con los pies abajo y la cabeza centrada en el ancla, para que no bailen al animarse. Salida: `src/assets/personajes.png` (con paleta, 20 KB) y `src/render/spriteSheet.ts` (posiciones), ambos generados.
  - Los personajes se dibujan a un píxel lógico por píxel del sprite: el doble de resolución que el escenario, con el mismo tamaño en pantalla que antes. Por eso van en una capa propia, entre el mundo (lienzo del arte) y las partículas y la oscuridad (otro lienzo del arte).
  - La imagen va dentro del HTML (como la fuente), así que el juego sigue siendo un único archivo sin internet. Es la única excepción a "todo procedural".
  - Fieles a la hoja: Lu camina sin el báculo y Mos sin espada ni escudo (y sin escudo al golpear), y no hay fotogramas de parpadeo, así que el parpadeo se quitó.
- **Portada del menú.** El título se construye sobre la ilustración de portada del diseño (Lu y Mos en sus marcos de plata y oro, con el logo), convertida por `tools/sprites/convertir_fondos.py` a 640 × 360 y 160 colores: la misma rejilla de píxeles que el escenario.
  - En la ilustración "LU" era dorado y "MOS" plateado, al revés que los personajes: el script intercambia los colores del logo (y el halo de "LU" pasa a frío).
  - Los huecos oscuros junto a cada retrato se usan para el menú: junto a Lu, "Pulsa Enter" y luego los botones; junto a Mos, el título "El reloj del cielo" y la historia, en la parte que no tapa su escudo. Abajo, quién juega con qué teclas.
  - Encima solo se anima lo justo: estrellas que titilan fuera de los marcos y motas de luz que suben por cada retrato (nada con "reducir efectos").
  - El título ya no dibuja el logo, el reloj ni la cornisa: los da la ilustración. El final sigue con su fondo dibujado en código.
- **Mapa de niveles sobre la ilustración de las tres zonas.** Arriba el Observatorio con su esfera armilar, en medio el muro de oro y plata del Santuario y abajo el Bosque del Alba con el eclipse. Se convierte igual que la portada (`tools/sprites/convertir_fondos.py`, que ahora hace las dos), recortada a 16:9 por los lados.
  - Los nueve nodos se recolocaron para no tapar el eclipse ni los estandartes del Sol y la Luna, y el último nivel, "El reloj del cielo", queda sobre la esfera armilar.
  - Encima solo titilan algunas estrellas del cielo, lejos de la esfera y del título.
  - Los números de los nodos se dibujan con cifras de píxel propias (5 × 7): en Pixelify Sans el 5 es casi igual que una S, y con contorno el 2 parecía un 8.
- **Fondos de los niveles: ilustraciones.** Los fondos dibujados en código (pinos, ventanales, engranajes) se sustituyeron por una ilustración 16:9 por zona (`tools/fondos/`), convertida como la portada a 640 × 360. Con el corte por medianas los dorados (estandartes, engranajes, el reloj) se apagaban, así que estos tres se reducen con octree a 255 colores.
  - Son mucho más detalladas y claras que los fondos de antes, sobre todo el bosque. Para que la piedra, las gemas y los personajes se lean bien, el juego las oscurece un poco al pintarlas (bosque 32 %, santuario 18 %, observatorio 22 %, en `BACKGROUND_DIM`).
  - Encima siguen animados las nubes del bosque (ahora solo en lo alto del cielo), el polvo dorado del santuario y las estrellas del observatorio (solo en el cielo).
  - Los dibujos anteriores quedan en `tools/fondos/anteriores/` como referencia; el reloj del cielo y el eclipse dibujados en código siguen en el final.
- **Elementos del nivel: las piezas del diseño.** La piedra, los charcos, las rejas, las puertas, las gemas, los botones, las palancas, las plataformas y los bloques se cambiaron por las hojas que generaste con los prompts de `tools/elementos/PROMPT.md`. `tools/elementos/convertir.py` las pasa al juego:
  - Venían mucho más grandes (unas 250 px por baldosa en vez de 40), en JPG y con fondos distintos: damero dibujado, gris liso, magenta o negro. Cada pieza se recorta, se le quita el fondo (por color, o rellenando desde el borde cuando el dibujo tiene colores parecidos, como la luz blanca de la puerta de Lu), se reduce a su tamaño (media de los píxeles del dibujo en cada bloque) y se limpian las motas. El halo de las perillas encendidas y el borde magenta que deja el JPG también se quitan.
  - Todo va en un atlas (`src/assets/elementos.png`, 77 piezas) con sus recuadros en `src/render/propSheet.ts`.
  - Se dibujan a resolución lógica, un píxel por píxel del juego, como Lu y Mos; solo el fondo queda a píxel doble detrás. Por eso la piedra se guarda ahora en un canvas de 1280 × 720.
  - Las texturas de piedra llegaron como un ladrillo que se repite (sin esquinas ni bordes): se usa en cada baldosa, con el remate de la zona arriba donde da al aire y un contorno oscuro de 2 px a los lados y abajo.
  - Las rejas se arman con la pieza suelta de la hoja (riel, emblema, riel), cambiando los rieles por barrotes en las de arriba, el medio y abajo. Las plataformas horizontales son tapa + cuerpo repetido + tapa, y las verticales, tapa + cuerpo de su color + tapa.
  - De los botones se usan el levantado y el pisado encendido; de las palancas, apagada y encendida (cambia cuando el mango pasa la vertical). Las gemas, los charcos y su símbolo traen 4 fotogramas.
  - Las gemas, más pequeñas que antes, llevan un halo suave detrás para verse sobre los fondos.
- **Animaciones.** Las de la hoja: quieto (3), andar (4), acción (3) y daño (1). Saltar y caer usan las zancadas de andar. Las habilidades se reutilizan sin mecánicas nuevas: la acción suena al accionar una palanca (hechizo de Lu, espadazo de Mos) y al ganar; el daño, al morir.
- **Squash & stretch en pixel art.** Escalar un sprite rompería la rejilla: se aplica quitando o repitiendo filas enteras (hasta 6), siempre con los pies en su sitio. Mos al apagarse se pinta en gris.
- **Ladrillos.** La sillería inca se sustituyó por ladrillos de 20 × 10 con luz arriba, sombra y junta abajo, tres tonos al azar fijo por nivel y detalles de zona (musgo, estrellitas de oro, remaches). Los muros de metal ahora son rejas.
- **Oscuridad.** La capa se calcula a 320 × 180 con tres anillos escalonados por luz (más claro hacia el centro), y se amplía sin suavizar.
- **Fuente.** Pixelify Sans (SIL OFL) en lugar de Fredoka. Se le quitan las ligaduras (`textRendering = 'optimizeSpeed'`) porque su "fi" junta las letras y "sin fin" parecía otra palabra. El contorno del texto es duro: el texto repetido alrededor, más una sombra abajo.
- **Historia en pantalla.** El prólogo sale en el título antes de pulsar Enter; la regla del oro y la plata, en "Cómo jugar"; y el final muestra el reloj volviendo a girar, con el Sol y la Luna separados dentro de la esfera.
- **Sonido chiptune.** Efectos con ondas cuadradas y triangulares y ruido. La música sigue siendo generativa y pentatónica, pero la melodía es una onda cuadrada filtrada con vibrato tardío y eco, sobre un bajo triangular cada dos pulsos y, en el título, el bosque y el final, un arpegio de corcheas.
- **Orden en pantalla.** Como Lu juega a la izquierda del teclado, en el HUD, los resultados, el título y el mapa Lu va a la izquierda y Mos a la derecha.

## Fase 8 · Pulido y publicación

- **Armas al andar.** En la hoja de sprites, Lu anda sin el báculo y Mos sin la espada ni el escudo, y como saltar también usa los pasos de andar, las armas aparecían y desaparecían a cada momento. `tools/sprites/convertir.py` las copia del primer fotograma de reposo: el báculo de Lu (lo unido a la media luna, sin la mano) pasa junto a su mano de delante, por detrás del cuerpo; Mos lleva la espada baja en la mano de atrás y el escudo delante. Se alinean por la cabeza, porque en el reposo el báculo y la espada bajan más que los pies.
- **Cifras legibles.** En Pixelify Sans el 5 es casi igual que una S. Todas las cifras de los textos (cronómetro, gemas, "Nivel 5", porcentajes, tiempos) se dibujan con las cifras de píxel de 5 × 7, al tamaño de las mayúsculas de la fuente y con el mismo contorno.
- **Formas en los mecanismos (accesibilidad).** Botones, palancas y plataformas se enlazaban solo por color. Una opción nueva pone una forma por canal (verde triángulo, rosa círculo, cian cuadrado, blanco rombo), blanca con contorno oscuro, en la placa del botón, la base de la palanca y el centro de la plataforma. Viene apagada para no recargar el dibujo; "Cómo jugar" avisa de que existe. Se guarda con las demás opciones.
- **Archivo más ligero.** El atlas de elementos se guarda con paleta (octree, 255 colores con transparencia): de 133 a 28 KB, sin diferencia a la vista. El juego entero pasa de 919 a 776 KB.
- **Sensación de juego.** Sin cambios en la física: el salto se dio por bueno en el punto de control de la fase 3. Los **tiempos objetivo** siguen siendo los del plan hasta que se prueben jugando.
- **Comprobaciones de la definición de terminado:**
  - Los 9 niveles se completan con las 3 estrellas: lo comprueban los recorridos con bots en `npm test`.
  - Sin errores en la consola, ni en desarrollo ni en la versión compilada.
  - Rendimiento, en la versión compilada y en un nivel oscuro (el más cargado): 0,9 ms para dibujar un fotograma y 0,02 ms por paso de lógica, muy por debajo de los 16,7 ms de 60 FPS.
  - `dist/index.html` no pide nada de fuera (todo va incrustado). El navegador integrado no abre archivos locales, así que se probó servido como página estática; el doble clic en Chrome, Edge y Firefox queda por confirmar en tu equipo.
- **Publicación.** El README explica cómo subirlo a itch.io y a Netlify, y `tools/publicar/portada-itch.png` es la portada de 630 × 500 para itch.io, con el logo en los colores del juego.
- **Netlify en lugar de GitHub Pages.** El juego se publica en Netlify desde el repositorio de GitHub. `netlify.toml` compila con `npm test && npm run build` (un test que falla para la publicación) y publica `dist/`, con Node 22 porque Vitest 5 lo pide (también en `.nvmrc` y en `engines` de `package.json`). Se quitó el flujo de GitHub Pages: habría fallado en cada subida sin Pages activado, y Netlify ya pasa los tests.
- **Carpeta renombrada.** La carpeta del proyecto pasó de `inti-y-killa` a `lumos`, como el paquete.
- **Aviso de `npm audit`.** Señala `braces` (dentro de `vite-plugin-singlefile`): es una herramienta de compilación que no llega al juego publicado, y el arreglo que propone (`--force`) baja el plugin a una versión antigua incompatible. Se deja como está.
