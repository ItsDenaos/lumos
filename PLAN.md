# Lumos: El reloj del cielo — Plan de creación

Oct 13, 2026 · @Moisés

> **Rediseño (14 oct 2026).** El juego nació como "Inti y Killa: El Eclipse Eterno", con estética inca. Se rediseñó como **Lumos**: los personajes ahora son **Lu** (la luna, plata) y **Mos** (el sol, oro), con una historia nueva y todo el arte en **pixel art**. Se mantienen el sol y la luna, el oro y la plata, las mecánicas y los 9 niveles. Este documento ya refleja el rediseño.

## Cómo usar este plan

Este documento es la especificación completa para que Claude Code construya el juego de principio a fin. Expórtalo como Markdown, guárdalo como `PLAN.md` en una carpeta vacía y pega el prompt de la sección "Prompt para Claude Code".

- **Requisitos:** Node.js (versión LTS) y un navegador de escritorio: Chrome, Edge o Firefox.
- **Resultado:** un juego web que se abre con doble clic desde un único archivo `index.html`, sin internet.
- **Cambiar la temática:** basta con tocar Visión, Personajes, Arte y Sonido; las mecánicas no dependen de ella.

## Visión e historia

Lumos es un juego cooperativo de plataformas y puzles para dos personas en el mismo teclado, donde nadie puede ganar solo.

- **Género:** plataformas y puzles cooperativo, al estilo de Fireboy & Watergirl: cada personaje resiste su elemento y muere con el del otro.
- **Identidad propia:** fantasía luminosa en pixel art, con el Sol y la Luna como centro de todo.
- **Alcance de la v1:** 9 niveles en 3 zonas, unos 30 a 45 minutos de juego.
- **Plataforma:** navegador de escritorio, sin conexión, desde un único archivo HTML.

**Historia: el reloj del cielo.** Desde siempre, un gran reloj en lo alto de Lumos hace girar el cielo: de día brilla el Sol, de noche la Luna. La Sombra rompió su engranaje y el Sol y la Luna quedaron atascados uno sobre otro: un eclipse que no termina. Lu, con su báculo de luna, y Mos, con su espada de sol, atraviesan el Bosque del Alba y el Santuario de los Astros hasta el Observatorio para volver a darle cuerda al cielo.

**El tema justifica las reglas.** El oro guarda la luz del Sol y la plata la de la Luna: cada metal protege a quien comparte su luz y daña al otro. Por eso el oro protege a Mos pero quema a Lu, y la plata protege a Lu pero apaga a Mos.

## Personajes

Lu y Mos tienen exactamente la misma física; solo cambian su elemento, su aspecto y lo que pueden tocar.

|  | Lu | Mos |
|---|---|---|
| Jugador | Izquierda del teclado: WASD | Derecha del teclado: flechas |
| Elemento | Plata, la luz de la Luna | Oro, la luz del Sol |
| Aspecto | Maga de pelo plateado, túnica azul con ribetes de plata, colgante de luna y báculo con una media luna | Caballero de pelo de fuego, armadura de oro, escudo con el sol y espada dorada |
| Colores | Plata `#CFD9EA`, azul `#4A68C6`, brillo frío | Oro `#F2B632`, ámbar `#C47F12`, brillo cálido |
| Cruza sin daño | Charcos de plata y muros de plata | Charcos de oro y muros de oro |
| Muere en | Charcos de oro y de sombra | Charcos de plata y de sombra |
| Recoge | Lunas de plata | Soles de oro |
| Puerta | En arco, de plata, con la luna | En arco, de oro, con el sol |
| Gesto (palanca y victoria) | Alza el báculo y lanza un hechizo de luna | Da un espadazo con estela de sol |
| Al morir | Se evapora en bruma plateada | Se apaga en una nube de humo |
| Carácter en animaciones | Serena: respira despacio, parpadeo lento, rastro de destellos | Enérgica: respira deprisa, el pelo chisporrotea, chispas al aterrizar |

Hoja de sprites de cada uno (la del diseño, convertida a pixel art limpio): quieto (3), andar (4), acción (3: hechizo de Lu, espadazo de Mos) y daño (1).

## Controles

Lu juega con WASD y Mos con las flechas, así cada jugador ocupa un lado del teclado.

| Acción | Lu | Mos |
|---|---|---|
| Moverse | A / D | ← / → |
| Saltar | W | ↑ |
| Accionar palanca | S | ↓ |

Teclas generales: Esc o P pausa, R reinicia el nivel, M silencia, F pone pantalla completa y Enter confirma. Los menús también funcionan con el ratón.

Detalles de implementación:

- Leer `KeyboardEvent.code` (`KeyW`, `ArrowUp`…) y no `key`, para que funcione con cualquier distribución de teclado.
- Guardar el estado de cada tecla y detectar el "recién pulsado" para el salto; ignorar la autorepetición.
- Usar `preventDefault` en flechas y espacio para que la página no haga scroll.
- Al perder el foco o cambiar de pestaña: soltar todas las teclas y pausar.
- Avisar en "Cómo jugar" de que algunos teclados no registran muchas teclas a la vez (ghosting).

## Reglas y elementos del nivel

Un nivel se gana cuando Lu y Mos están a la vez frente a su puerta; si cualquiera muere, el nivel se reinicia para los dos.

- Cada nivel es una sola pantalla fija de 32 × 18 baldosas, sin cámara.
- Con ambos en su puerta durante 0,5 s, las puertas se abren y entran juntos. Si uno se aparta antes, se cancela.
- Al morir: 1 s de animación y reinicio completo de posiciones, gemas, mecanismos y cronómetro.
- Las gemas son opcionales y solo las recoge su dueño.
- Estrellas: 1 por completar, 2 si además se recogen todas las gemas, 3 si además se baja del tiempo objetivo.
- El cronómetro arranca con la primera tecla de cualquiera y se detiene en pausa.
- Los personajes no chocan entre sí: se atraviesan, como en el clásico.
- La pantalla de resultados muestra cuántas veces murió cada uno, para los piques.

| Elemento | Lu | Mos | Detalle |
|---|---|---|---|
| Piedra | Sólida | Sólida | Muros, suelos y techos |
| Charco de oro | Muere | Lo cruza | Brilla y burbujea |
| Charco de plata | Lo cruza | Muere | Destellos fríos |
| Charco de sombra | Muere | Muere | Tinta negra violeta con humo |
| Sol de oro (gema) | Lo atraviesa | Lo recoge | Flota con su halo |
| Luna de plata (gema) | La recoge | La atraviesa | Flota con su halo |
| Reja de oro | Sólida | La atraviesa | Desde la zona 2 |
| Reja de plata | La atraviesa | Sólida | Desde la zona 2 |
| Botón (placa) | Lo pisa | Lo pisa | Activa su canal mientras alguien o un bloque está encima |
| Palanca | S encima | ↓ encima | Alterna su canal entre encendido y apagado |
| Plataforma móvil | Sólida | Sólida | Va a su destino con el canal activo y vuelve al apagarse |
| Bloque de piedra | Lo empuja | Lo empuja | Cae con gravedad, pisa botones, sirve de escalón y de puente |
| Puerta | La suya | La suya | Ambos deben estar en la suya a la vez |

Comportamientos exactos:

- **Charcos:** ocupan la mitad superior de una baldosa del suelo. Quien es inmune camina por dentro, medio hundido. Se muere solo si el solape supera 4 px, para no morir por rozar el borde.
- **Canales:** botones, palancas y plataformas se enlazan por color: verde, rosa, cian o blanco. Un canal está activo si cualquiera de sus botones está pisado o cualquiera de sus palancas está encendida.
- **Plataformas móviles:** 2 baldosas por segundo por defecto. Llevan encima a personajes y bloques, y si algo las bloquea se detienen: nunca aplastan. Se dibujan detrás de la piedra, así se esconden en los muros y sirven de compuertas.
- **Bloques:** 1 × 1 baldosa, sólidos para los personajes, que los empujan a 110 px/s. Si caen en un charco quedan medio hundidos y forman un puente seguro. Si caen sobre un personaje, se apoyan en él sin aplastarlo.

## Física y sensación de juego

Con estos valores un personaje salta unas 2,4 baldosas de alto y recorre unas 4 de largo; todos se ajustan en `config.ts`.

| Parámetro | Valor inicial |
|---|---|
| Resolución lógica | 1280 × 720, escalada a la ventana con bandas negras |
| Baldosa / nivel | 40 px / 32 × 18 baldosas |
| Caja de colisión del personaje | 24 × 44 px (el dibujo puede ser más grande) |
| Gravedad | 1600 px/s² |
| Velocidad de salto | 560 px/s (altura ≈ 98 px) |
| Salto variable | Soltar el salto mientras sube: velocidad vertical × 0,45 |
| Velocidad horizontal máxima | 230 px/s |
| Aceleración en suelo / aire | 2200 / 1500 px/s² |
| Frenado en suelo | 2600 px/s² |
| Caída máxima | 900 px/s (15 px por paso: nunca atraviesa una baldosa) |
| Tiempo coyote / búfer de salto | 0,09 s / 0,10 s |

Motor:

- Bucle de paso fijo a 60 Hz con acumulador y dibujo con `requestAnimationFrame`. El dt se limita a 0,25 s para no dar saltos al volver de otra pestaña.
- Colisiones AABB resueltas por ejes, primero X y luego Y, contra baldosas y sólidos móviles.
- Lógica determinista y sin DOM, separada del dibujo, para poder probarla con tests.
- Squash & stretch, partículas y brillos son solo visuales: nunca afectan a la física.

Reglas de diseño de niveles, derivadas de la física:

- Subida máxima: 2 baldosas, con al menos 4 de altura libre sobre el punto de salto.
- Hueco máximo en plano: 3 baldosas. Con 4 se llega, pero no se usa en el camino principal.
- Subir 2 baldosas y cruzar a la vez: hueco máximo de 2.
- Pasillos de al menos 2 baldosas de alto, y 3 si hay que saltar dentro.
- Charcos que el otro debe saltar: 3 baldosas de ancho como máximo.

## Pantallas y progreso

Cada partida sale del mapa de niveles y vuelve a él por la pantalla de resultados; morir solo reinicia el nivel.

*(Diagrama en el original: flujo de pantallas · 6 pantallas.)*

Recorrido: Título, Mapa de niveles y Partida. En la partida, Esc o P abre la pausa, desde la que se continúa o se sale al mapa. Con ambos en su puerta se pasa a Resultados: siguiente nivel, repetir o mapa; tras el nivel 9, el final.

- **Título:** la ilustración de portada de Lu y Mos en sus marcos de plata y oro, con el logo LUMOS (LU en plata, MOS en oro). Junto a Lu, "Pulsa Enter" y después el menú; junto a Mos, la historia. Menú: Jugar, Cómo jugar y Opciones.
- **Mapa de niveles:** sobre la ilustración de las 3 zonas apiladas (Bosque del Alba abajo, Santuario de los Astros en medio y Observatorio arriba), un camino que sube con un nodo por nivel que muestra estrellas y mejor tiempo. Los niveles bloqueados se ven en gris; se navega con teclado o ratón.
- **Partida:** al entrar aparece el rótulo "Nivel 3 · La piedra que sube" durante 1,5 s. HUD arriba: lunas de Lu (x/y), cronómetro, soles de Mos (x/y) e icono de pausa.
- **Pausa:** Continuar, Reiniciar, Opciones y Salir al mapa.
- **Resultados:** tiempo, gemas, estrellas animadas y muertes de cada uno, con los botones Siguiente, Repetir y Mapa.
- **Final:** el reloj vuelve a girar, el Sol y la Luna se separan y amanece, con estadísticas totales y créditos.
- **Opciones:** volumen general, música, efectos, pantalla completa y "reducir efectos" (sin temblores ni destellos).
- **Progreso guardado:** niveles desbloqueados, estrellas y mejor tiempo por nivel, y opciones. Ganar un nivel desbloquea el siguiente.

## Niveles

Cada nivel es un archivo TypeScript con un mapa ASCII de 18 filas × 32 columnas y una lista de entidades. Las coordenadas son `[columna, fila]`, contando desde la esquina superior izquierda.

| Símbolo | Significado |
|---|---|
| `#` | Piedra (sólido) |
| `.` | Aire |
| `M` / `L` | Inicio de Mos / de Lu |
| `[` / `]` | Puerta de Mos / de Lu |
| `*` / `c` | Sol de oro (lo recoge Mos) / luna de plata (la recoge Lu) |
| `o` / `p` / `x` | Charco de oro / de plata / de sombra, siempre en la fila del suelo |
| `O` / `P` | Reja de oro (solo Mos la atraviesa) / reja de plata (solo Lu) |
| `B` | Bloque de piedra empujable |

Botones, palancas, plataformas móviles y textos de ayuda van en `entities`, porque necesitan canales y destinos.

```ts
type Cell = [col: number, row: number];
type Channel = 'green' | 'pink' | 'cyan' | 'white';

interface LevelData {
  id: number;
  name: string;            // nombre visible, en español
  zone: 'forest' | 'sanctuary' | 'observatory';
  parTime: number;         // segundos para la 3.ª estrella
  dark?: boolean;          // nivel oscuro (zona 3)
  map: string[];           // 18 filas de 32 caracteres
  entities: Entity[];
}

type Entity =
  | { type: 'hint'; at: Cell; text: string }
  | { type: 'button'; at: Cell; channel: Channel }
  | { type: 'lever'; at: Cell; channel: Channel; startOn?: boolean }
  | { type: 'mover'; at: Cell; size: [w: number, h: number]; to: Cell;
      channel: Channel; speed?: number };
```

Ejemplo completo: nivel 1, "El despertar". Está validado: borde cerrado, un inicio y una puerta por personaje, y ambos alcanzan su puerta y sus 3 gemas con las reglas de salto. Lu va por arriba sobre plata, Mos por abajo sobre oro, y se reúnen en las puertas.

```ts
export const level01: LevelData = {
  id: 1,
  name: 'El despertar',
  zone: 'forest',
  parTime: 40,
  map: [
    '################################',
    '#..............................#',
    '#..............................#',
    '#.........c....................#',
    '#......c......c................#',
    '#.L.......#....................#',
    '######pp#####ppp######.........#',
    '##################.............#',
    '##################.............#',
    '##################.............#',
    '##################.......[..]..#',
    '##################....##########',
    '#.....................##########',
    '#..................*############',
    '#...........*.......############',
    '#.....*...........##############',
    '#.M......#........##############',
    '#####oo####ooo##################',
  ],
  entities: [
    { type: 'hint', at: [2, 2], text: 'Lu: A / D para moverte · W para saltar' },
    { type: 'hint', at: [2, 13], text: 'Mos: ← / → para moverte · ↑ para saltar' },
    { type: 'hint', at: [12, 2], text: 'La plata protege a Lu… y apaga a Mos' },
    { type: 'hint', at: [11, 12], text: 'El oro protege a Mos… y quema a Lu' },
    { type: 'hint', at: [22, 7], text: 'Lleguen juntos, cada uno a su puerta' },
  ],
};
```

Mecanismos enlazados por canal (ejemplo suelto, no pertenece al nivel 1):

```ts
entities: [
  // Mientras alguien pise el botón verde, la plataforma sube 4 baldosas
  { type: 'button', at: [6, 16], channel: 'green' },
  { type: 'mover', at: [12, 16], size: [3, 1], to: [12, 12], channel: 'green' },
  // La palanca rosa esconde en el techo una compuerta de 1 × 3
  { type: 'lever', at: [20, 10], channel: 'pink' },
  { type: 'mover', at: [26, 8], size: [1, 3], to: [26, 5], channel: 'pink' },
]
```

Los 9 niveles, en 3 zonas: Bosque del Alba (amanecer atascado, tutorial), Santuario de los Astros (interior con estandartes del Sol y la Luna) y Observatorio (de noche, bajo el reloj del cielo, niveles oscuros).

| # | Nombre | Zona | Qué introduce | Gemas (Lu + Mos) | Tiempo objetivo |
|---|---|---|---|---|---|
| 1 | El despertar | Bosque del Alba | Moverse, saltar, charcos propios, gemas y puertas, con rutas separadas | 3 + 3 | 40 s |
| 2 | Oro y plata | Bosque del Alba | Las rutas se cruzan: cada uno salta los charcos del otro; primer charco de sombra | 4 + 4 | 50 s |
| 3 | La piedra que sube | Bosque del Alba | Botón y plataforma: uno sostiene el botón mientras el otro sube; arriba, otro botón trae al compañero | 4 + 4 | 60 s |
| 4 | Palancas del recinto | Santuario de los Astros | Palancas que abren compuertas en orden; un error encierra a alguien y enseña a usar R | 5 + 5 | 75 s |
| 5 | La ofrenda | Santuario de los Astros | Bloques: sobre un botón para sostener una compuerta, como escalón y como puente sobre un charco | 5 + 5 | 80 s |
| 6 | Muros de oro y plata | Santuario de los Astros | Cada uno cruza las rejas de su metal para abrirle paso al otro | 5 + 5 | 90 s |
| 7 | Penumbra | Observatorio | Primer nivel oscuro, con una mezcla suave de lo aprendido | 5 + 5 | 90 s |
| 8 | La escalera del cielo | Observatorio | Ascenso vertical con plataformas encadenadas: hay que turnarse para sostener botones, con sombra al fondo | 6 + 6 | 120 s |
| 9 | El reloj del cielo | Observatorio | Final: todo combinado, a oscuras, con las puertas junto al reloj en la cima | 6 + 6 | 150 s |

Los tiempos objetivo son iniciales: tras probar, se fijan en unas 1,3 veces el tiempo de una buena partida.

Validación automática, dentro de `npm test`:

- **Estructura:** 18 × 32, borde cerrado, exactamente un `M`, `L`, `[` y `]`, inicios y puertas sobre suelo, gemas fuera de sólidos, cada canal con al menos un activador y un receptor, plataformas dentro del nivel.
- **Alcance aproximado:** búsqueda en anchura por baldosas con las reglas de salto de la sección de física, probando cada plataforma en sus dos posiciones. Avisa si alguien no alcanza su puerta o alguna de sus gemas; es el método con el que se validó el nivel 1.

## Arte (pixel art)

La interfaz y los efectos se dibujan en código con Canvas 2D. Los personajes salen de la hoja de sprites del diseño; el título, el mapa de niveles y los fondos de las tres zonas, de sus ilustraciones; y la piedra y los elementos de los niveles (charcos, rejas, puertas, gemas, botones, palancas, plataformas y bloques), de las hojas de `tools/elementos/`. Los scripts `tools/sprites/convertir.py`, `tools/sprites/convertir_fondos.py` y `tools/elementos/convertir.py` los pasan a pixel art en imágenes pequeñas que van dentro del HTML: el juego sigue cabiendo en un solo archivo.

- **Estilo:** pixel art. El mundo se pinta en un lienzo de 640 × 360 (una baldosa son 20 × 20 píxeles del arte) y se amplía sin suavizar a la resolución lógica de 1280 × 720. Cuando cabe, cada píxel del arte ocupa un número entero de píxeles de la pantalla.
- **Personajes:** los fotogramas de la hoja de sprites del diseño, sin fondo, reducidos a su rejilla de píxeles (unos 56–64 px de alto) y con una paleta de 32 colores cada uno. Se dibujan a un píxel lógico por píxel, el doble de resolución que el escenario. Al mirar a la izquierda se usa el sprite volteado.
- **Animaciones:** quieto con respiración, andar, saltar y caer (zancadas), aterrizar con squash & stretch en filas enteras, el gesto de cada uno al usar una palanca y al ganar, daño al morir, entrar por la puerta y celebrar.
- **Fondos:** una ilustración por zona (`tools/fondos/`), un poco oscurecida en el juego para que lo de delante se lea bien, con nubes, polvo dorado o estrellas animados encima.
- **Escenario:** ladrillos con luz arriba y sombra abajo, contorno donde dan al aire y un remate según la zona (pasto, moldura de oro, ribete de latón), dibujados una sola vez por nivel en un canvas aparte. Puertas en arco con el emblema de su dueño.
- **Líquidos:** superficie que ondula píxel a píxel; el oro lleva burbujas, la plata destellos y la sombra humo violeta. Cada charco muestra además un símbolo (sol, luna o aspa) para jugadores daltónicos.
- **Partículas:** cuadraditos de polvo, chispas de Mos, destellos de Lu, hechizo y espadazo, brillo al recoger gemas, humo y bruma al morir. Máximo 400 a la vez.
- **Niveles oscuros:** una capa casi negra con círculos de luz recortados en anillos escalonados: cálido y amplio alrededor de Mos, frío alrededor de Lu, y halos en gemas, charcos, puertas y mecanismos.
- **Fuente:** Pixelify Sans vía `@fontsource`, empaquetada para funcionar sin internet.

| Zona | Ambiente | Paleta |
|---|---|---|
| Bosque del Alba | Amanecer atascado: el eclipse, la Luna, montañas nevadas y un bosque espeso; pasto en los bordes de la piedra | Cielo `#3B2D5C` a `#F9C784`, piedra `#7A6A58`, pasto `#4E9A2F` |
| Santuario de los Astros | Templo de noche: bóvedas abiertas al cielo estrellado, columnas, ventanales y estandartes del Sol y la Luna | Fondo `#1A1429`, piedra `#8A7EA6`, moldura de oro `#E9C46A` |
| Observatorio | Cima de noche con el gran reloj del cielo, engranajes de latón, telescopios y cúpulas | Cielo `#0B0A1C` a `#262052`, piedra `#3C4468`, latón `#C9A24A` |

Colores de los elementos: charco de oro `#F2B632`, charco de plata `#CFD9EA` y sombra `#2A0E3A` con borde `#7B2CBF`. Canales: verde `#4ADE80`, rosa `#F472B6`, cian `#22D3EE` y blanco `#F1F5F9`.

## Sonido (sintetizado)

Todos los sonidos se generan con Web Audio API, sin archivos, con timbres chiptune de 8 bits (ondas cuadradas y triangulares, y ruido). El audio se activa con la primera tecla o clic, por la política de reproducción automática de los navegadores.

| Evento | Sonido |
|---|---|
| Salto | Lu: barrido agudo y ligero. Mos: barrido más grave |
| Gema | Arpegio rápido de 4 notas, agudo y cristalino para Lu y más grave para Mos |
| Botón y palanca | Chasquido y bip |
| Plataforma en marcha | Zumbido grave y suave |
| Muerte | Lu: tono que sube con un siseo al evaporarse. Mos: tono que cae con ruido al apagarse |
| Puertas y victoria | Fanfarria con acorde final |

- **Música:** generativa por zona, en escala pentatónica: melodía de onda cuadrada con eco, bajo triangular y, en algunas zonas, arpegios.
- **Mezcla:** volumen general, música y efectos por separado en Opciones; M silencia todo.

## Arquitectura técnica

El juego se construye con Vite y TypeScript sobre Canvas 2D, sin motor de juego, y se compila a un único `dist/index.html` que funciona sin servidor.

- **Stack:** Vite, TypeScript, Canvas 2D, Web Audio API, Vitest para los tests y `vite-plugin-singlefile` para empaquetarlo todo en un archivo.
- **Por qué sin motor (Phaser u otros):** control total de la sensación de salto, ninguna dependencia pesada y todo el arte procedural en un solo archivo.
- **Idioma:** código e identificadores en inglés; comentarios y textos del juego en español, centralizados en `src/i18n/es.ts`.
- **Guardado:** `localStorage` con la clave `lumos-save-v1`, que incluye versión. Siempre dentro de try/catch y tolerante a datos corruptos.

```
lumos/
├── index.html
├── package.json
├── vite.config.ts          # incluye vite-plugin-singlefile
├── README.md               # cómo jugar, desarrollar y publicar
├── DECISIONES.md           # decisiones tomadas al construir
├── src/
│   ├── main.ts             # arranque: canvas, escalado, bucle
│   ├── config.ts           # física, tamaños, colores y teclas
│   ├── i18n/es.ts          # todos los textos del juego
│   ├── core/               # loop, input, audio, storage, scenes
│   ├── game/               # world, physics, player, rules, channels
│   │   └── entities/       # gem, door, button, lever, mover, block
│   ├── render/             # pixel, sprites, icons, renderer, tiles, characters, liquids, particles, lighting, ui
│   ├── scenes/             # title, levelSelect, play, pause, results, ending, options
│   └── levels/             # 01-el-despertar.ts … 09-el-reloj-del-cielo.ts, index.ts, validate.ts
└── tests/                  # physics, rules, channels, storage, levels
```

Scripts de npm: `dev` (servidor local), `build` (genera `dist/index.html`), `preview` y `test` (tests y validación de niveles).

**Modo depuración**, solo con `?debug` en la dirección: H muestra cajas de colisión y rejilla, N salta al siguiente nivel, G vuelve invencibles a ambos, y se ve el contador de FPS. Incluye un nivel "sandbox" con todos los mecanismos.

## Fases de desarrollo

Claude Code construye el juego en 8 fases, cada una con su commit, y se detiene tras las fases 3 y 7 para que lo pruebes.

1. **Proyecto base:** Vite + TypeScript, estructura de carpetas, canvas de 1280 × 720 escalado con bandas, bucle de paso fijo y README con comandos.
   - *Listo cuando:* `npm run dev` muestra el canvas adaptado a la ventana, `npm test` y `npm run build` pasan, y `dist/index.html` abre con doble clic.
2. **Movimiento y física:** entrada de dos jugadores, lectura de mapas, colisiones y salto con coyote, búfer y altura variable. Los personajes aún son rectángulos.
   - *Listo cuando:* ambos se mueven a la vez sin interferencias, nadie atraviesa paredes ni a máxima velocidad de caída, se sube un escalón de 2 baldosas pero no uno de 3, y pasan los tests de colisión.
3. **Reglas:** charcos y muerte con reinicio, gemas, puertas y victoria, cronómetro, HUD básico y R para reiniciar.
   - *Listo cuando:* el nivel 1 se completa de principio a fin, aún con formas simples.
   - **Punto de control:** pausa para probar el control y la sensación del salto.
4. **Mecanismos:** botones, palancas, canales, plataformas con pasajeros, bloques y muros de oro y plata.
   - *Listo cuando:* el nivel "sandbox" usa todos los mecanismos sin fallos y pasan los tests de canales, bloques y plataformas.
5. **Arte y animación:** personajes, escenario, líquidos, puertas, gemas, partículas, iluminación de niveles oscuros y paletas por zona.
   - *Listo cuando:* 60 FPS estables en un portátil normal, todo nítido a cualquier tamaño de ventana, y cada charco se distingue sin depender del color.
6. **Pantallas, progreso y sonido:** título, mapa de niveles, pausa, resultados, final, opciones, guardado y audio.
   - *Listo cuando:* el progreso sobrevive a recargar la página, todo se navega con teclado y ratón, y M silencia.
7. **Los 9 niveles:** diseñados según la sección de niveles, con validador y comprobador de alcance.
   - *Listo cuando:* `npm test` pasa sin avisos de alcance y cada nivel se recorrió con el modo depuración.
   - **Punto de control:** pausa para jugar los 9 niveles y decir qué ajustar.
8. **Pulido y publicación:** ajuste fino de la sensación de juego, accesibilidad y README final con cómo publicar en itch.io o GitHub Pages.
   - *Listo cuando:* se cumple la definición de terminado.

**Definición de terminado:**

- Los 9 niveles se completan, y en todos se pueden conseguir las 3 estrellas.
- Sin errores en la consola y a 60 FPS.
- `dist/index.html` funciona sin internet, con doble clic, en Chrome, Edge y Firefox.
- Tests en verde: física, reglas, canales, guardado y validación de niveles.

## Prompt para Claude Code

Pega este texto tal cual en Claude Code, abierto en la carpeta donde guardaste `PLAN.md`.

> Lee PLAN.md completo: es la especificación del juego "Lumos: El reloj del cielo".
> Constrúyelo en esta carpeta siguiendo el plan al pie de la letra.
>
> 1. Inicializa git y crea una lista de tareas con las 8 fases del plan.
> 2. Trabaja las fases en orden. Al terminar cada una: ejecuta `npm test` y `npm run build`, corrige lo que falle, haz un commit y dame un resumen de 3 a 5 líneas con qué cambió y cómo probarlo.
> 3. Detente al terminar la fase 3 (para probar el control) y la fase 7 (para jugar los 9 niveles). En el resto, sigue sin preguntar.
> 4. Si algo del plan es ambiguo o no funciona, elige la opción más simple, anótala en DECISIONES.md y continúa.
> 5. Código e identificadores en inglés; comentarios y todos los textos del juego en español.
> 6. Nada de imágenes ni sonidos externos: todo procedural, como dice el plan (excepto la hoja de sprites de Lu y Mos, la portada y el mapa, que se convierten con los scripts de `tools/sprites/`).

## Ideas para después

Quedan fuera de la v1 para que el primer juego salga completo y pulido.

- Soporte de mandos con Gamepad API, uno por jugador.
- Editor de niveles en el navegador que exporte el formato ASCII.
- Una cuarta zona, por ejemplo el Mar de las Mareas, con corrientes de agua que mueve la Luna.
- Contrarreloj con récords locales por nivel.
