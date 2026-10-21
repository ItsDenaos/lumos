# Lumos: El reloj del cielo

Juego cooperativo de plataformas y puzles en pixel art para dos personas en el mismo teclado, donde nadie puede ganar solo.

Un gran reloj en lo alto de Lumos hace girar el cielo: de día brilla el Sol, de noche la Luna. La Sombra rompió su engranaje y el Sol y la Luna quedaron atascados en un eclipse que no termina. **Lu**, con su báculo de luna, y **Mos**, con su espada de sol, suben hasta el Observatorio para volver a darle cuerda al cielo. El oro guarda la luz del Sol y la plata la de la Luna: el oro protege a Mos pero quema a Lu, y la plata protege a Lu pero apaga a Mos.

La especificación completa está en [PLAN.md](PLAN.md) y las decisiones tomadas al construirlo, en [DECISIONES.md](DECISIONES.md).

## Cómo jugar

| Acción | Lu | Mos |
|---|---|---|
| Moverse | A / D | ← / → |
| Saltar | W | ↑ |
| Accionar palanca | S | ↓ |

Teclas generales: **Esc** o **P** pausa, **R** reinicia el nivel, **M** silencia, **F** pantalla completa, **Enter** confirma. Los menús se manejan con las flechas o WASD y también con el ratón.

Para ganar, Lu y Mos deben estar a la vez frente a su puerta. Si cualquiera muere, el nivel se reinicia para los dos. Ganar un nivel desbloquea el siguiente; el progreso (estrellas, mejores tiempos y opciones) se guarda en el navegador. Algunos teclados no registran muchas teclas a la vez (*ghosting*): si una tecla "no responde" mientras la otra persona también juega, prueben otro teclado.

## Requisitos

- Node.js (versión LTS) para desarrollar.
- Para jugar basta un navegador de escritorio: Chrome, Edge o Firefox.
- Solo para regenerar las imágenes desde los originales del diseño: Python 3 con Pillow (`python -m pip install pillow`).
  - `python tools/sprites/convertir.py`: los sprites de Lu y Mos (`src/assets/personajes.png` y `src/render/spriteSheet.ts`).
  - `python tools/elementos/convertir.py`: la piedra y los elementos de los niveles (`src/assets/elementos.png` y `src/render/propSheet.ts`), desde las hojas de `tools/elementos/originales/` (los prompts con que se hicieron están en `tools/elementos/PROMPT.md`).
  - `python tools/sprites/convertir_fondos.py`: la portada del menú, el fondo del mapa, los fondos de las tres zonas y el de la pantalla final (`src/assets/portada.png`, `mapa.png`, `fondo-*.png` y `final.png`; los originales de los fondos están en `tools/fondos/`, con su [LEEME](tools/fondos/LEEME.md)).

## Comandos

```bash
npm install
```

```bash
npm run dev
```

Abre el servidor local (por defecto en http://localhost:5173; si ese puerto está ocupado, Vite elige otro y lo muestra en la terminal).

```bash
npm test
```

Ejecuta los tests de física, reglas, mecanismos (canales, plataformas, bloques y muros), guardado, música, pantallas (con teclado y ratón), teclado y bucle; la validación y el comprobador de alcance de los niveles; y recorridos completos de los 9 niveles y del sandbox, jugados por bots con la física real (con todas las gemas y bajo el tiempo objetivo).

```bash
npm run build
```

Genera `dist/index.html`: un único archivo con todo dentro (código, fuente pixel e imágenes) que se abre con doble clic, sin internet. Cómo publicarlo: ver [Publicar](#publicar).

```bash
npm run preview
```

Sirve la versión compilada para revisarla.

## Modo depuración

Añade `?debug` a la dirección (por ejemplo `http://localhost:5173/?debug`):

- **H** muestra las cajas de colisión y la rejilla.
- **N** salta al siguiente nivel.
- **G** vuelve invencibles a ambos.
- **Z** cambia la zona del arte (Bosque del Alba, Santuario de los Astros, Observatorio).
- **L** alterna la oscuridad de los niveles de la zona 3.
- Abajo se ve el contador de FPS.
- `?debug&nivel=N` empieza directamente en el nivel N.
- `?debug&nivel=sandbox` abre el nivel de pruebas con todos los mecanismos (también se llega con N tras el último nivel).
- Sin `nivel`, el juego empieza en el título como siempre.
- El contexto del juego queda en `window.lumos` para inspeccionarlo desde la consola.

## Niveles

| # | Nombre | Zona | Qué introduce |
|---|---|---|---|
| 1 | El despertar | Bosque del Alba | Moverse, saltar, charcos propios, gemas y puertas |
| 2 | Oro y plata | Bosque del Alba | Las rutas se cruzan; primer charco de sombra |
| 3 | La piedra que sube | Bosque del Alba | Botones y plataformas: cada uno sube al otro |
| 4 | Palancas del recinto | Santuario de los Astros | Palancas que abren compuertas en orden (y R si alguien queda encerrado) |
| 5 | La ofrenda | Santuario de los Astros | Bloques: puente, escalón y peso sobre un botón |
| 6 | Muros de oro y plata | Santuario de los Astros | Cada uno cruza las rejas de su metal para abrirle paso al otro |
| 7 | Penumbra | Observatorio | Primer nivel oscuro |
| 8 | La escalera del cielo | Observatorio | Plataformas encadenadas, turnándose en los botones |
| 9 | El reloj del cielo | Observatorio | Todo combinado, hasta el reloj del cielo |

## Estructura

```
src/
├── main.ts          # arranque: canvas, escalado, bucle
├── config.ts        # física, tamaños, colores y teclas
├── i18n/es.ts       # todos los textos del juego
├── core/            # bucle, teclado y ratón, escenas, escalado, ajustes, guardado, sonido y música
├── game/            # mundo, física, personaje, reglas, canales, lectura de mapas
│   └── entities/    # gema, puerta, botón, palanca, plataforma y bloque
├── assets/          # imágenes ya convertidas: personajes, portada, mapa, fondos de las zonas, final y elementos de los niveles
├── render/          # pixel art: lienzo del arte, sprites, iconos, fondos, ladrillos, líquidos, personajes, animación, partículas, luz, interfaz
├── scenes/          # título, cómo jugar, opciones, mapa, partida, pausa, resultados y final
└── levels/          # los 9 niveles en ASCII, sandbox, validador y comprobador de alcance
tests/               # física, reglas, mecanismos, guardado, música, pantallas, arte, niveles y recorridos
tools/sprites/       # las imágenes originales del diseño (sprites, portada y mapa) y los scripts que las convierten
tools/fondos/        # las ilustraciones de los fondos de cada zona y de la pantalla final
tools/elementos/     # las hojas de la piedra y los elementos de los niveles, sus prompts y su script
tools/publicar/      # la portada para la página de itch.io
netlify.toml         # cómo compila y publica Netlify
```

## Progreso

- [x] Fase 1 · Proyecto base: Vite + TypeScript, canvas 1280 × 720 escalado con bandas, bucle de paso fijo.
- [x] Fase 2 · Movimiento y física: dos jugadores, mapas, colisiones, coyote, búfer y salto variable.
- [x] Fase 3 · Reglas: charcos, muerte y reinicio, gemas, puertas, victoria, cronómetro, HUD y R.
- [x] Fase 4 · Mecanismos: botones, palancas, canales, plataformas, bloques y muros de oro y plata.
- [x] Fase 5 · Arte y animación: personajes, escenario, líquidos, puertas, gemas, partículas, oscuridad y paletas por zona.
- [x] Fase 6 · Pantallas, progreso y sonido: título, mapa, pausa, resultados, final, opciones, guardado, efectos y música.
- [x] Fase 7 · Los 9 niveles, con validador, comprobador de alcance y recorridos con bots. **← punto de control**
- [x] Rediseño **Lumos**: Lu y Mos, la historia del reloj del cielo, todo en pixel art y sonido chiptune.
- [x] Fase 8 · Pulido y publicación: armas al andar, cifras legibles, formas en los mecanismos, archivo más ligero y cómo publicar.

Pendiente de probar jugando: los **tiempos objetivo** (la 3.ª estrella) siguen siendo los del plan. Se fijan en unas 1,3 veces el tiempo de una buena partida; los bots tardan entre 6 y 27 s, mucho menos que una persona.

## Créditos

Fuente [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), de The Pixelify Sans Project Authors, con licencia SIL Open Font License 1.1.

## Publicar

`npm run build` deja todo el juego en **un solo archivo**, `dist/index.html` (unos 830 KB): el código, la fuente y las imágenes van dentro. Se abre con doble clic, sin internet, en Chrome, Edge y Firefox, así que también se puede compartir tal cual (por correo, en un USB…). El progreso se guarda en el navegador de cada persona.

### itch.io

1. `npm run build`.
2. En itch.io: **Dashboard → Create new project**.
3. **Kind of project:** HTML.
4. **Uploads:** sube `dist/index.html` (o un ZIP que lo contenga) y marca **This file will be played in the browser**.
5. **Embed options:**
   - **Viewport dimensions:** 1280 × 720.
   - Marca **Click to launch in fullscreen** (así el juego recibe el teclado desde el primer momento) y **Fullscreen button**.
   - **Mobile friendly:** no (hacen falta dos personas con teclado).
6. **Cover image:** `tools/publicar/portada-itch.png` (630 × 500, el tamaño que pide itch.io).
7. **Genre:** Platformer o Puzzle; en las etiquetas, *local multiplayer*, *co-op*, *pixel art*.
8. Guarda como borrador, pruébalo en la página del proyecto y, cuando esté bien, cámbialo a **Public**.

### Subir el código a GitHub

Crea en GitHub un repositorio **vacío** (sin README, `.gitignore` ni licencia: ya están aquí) y, desde la carpeta del proyecto:

```bash
git add .
```

```bash
git commit -m "Lumos: El reloj del cielo"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/<tu-usuario>/lumos.git
```

```bash
git push -u origin main
```

`node_modules/` y `dist/` no se suben (están en `.gitignore`): Netlify los genera.

### Netlify

El repositorio trae `netlify.toml`, así que Netlify ya sabe qué hacer: en cada subida instala, pasa los tests (`npm test`), compila (`npm run build`) y publica `dist/` con Node 22. Si un test falla, no publica y la web sigue con la versión anterior.

1. En Netlify: **Add new project → Import an existing project → GitHub** y elige el repositorio (la primera vez pide permiso para leer tus repositorios de GitHub).
2. Los campos de compilación salen ya rellenos desde `netlify.toml` (rama `main`, *build command* y *publish directory*): no cambies nada y pulsa **Deploy**.
3. Al terminar (un par de minutos), el juego queda en `https://<nombre>.netlify.app`. El nombre se cambia en la configuración del proyecto (**Change project name**).
4. A partir de ahí, cada `git push` a `main` publica de nuevo, y cada pull request tiene su propia dirección de prueba (*deploy preview*).

Sin repositorio también se puede: `npm run build` y arrastra la carpeta `dist` a [app.netlify.com/drop](https://app.netlify.com/drop).

Cualquier otro alojamiento de páginas estáticas sirve igual: basta con subir `dist/index.html`, no necesita servidor.
