# Fondos de los niveles

El juego tiene **3 fondos**, uno por zona; cada uno lo comparten los 3 niveles de su zona.

| Zona | Niveles | Ilustración |
|---|---|---|
| Bosque del Alba | 1, 2 y 3 | `bosque.webp` |
| Santuario de los Astros | 4, 5 y 6 | `santuario.webp` |
| Observatorio | 7, 8 y 9 (a oscuras) | `observatorio.webp` |

## Cómo se usan

`python tools/sprites/convertir_fondos.py` (Python 3 con Pillow) recorta cada ilustración a 16:9, la reduce a 640 × 360 (la rejilla de píxeles del escenario: cada píxel se ve de 2 × 2) y la guarda con 255 colores en `src/assets/fondo-<zona>.png`. Para cambiar un fondo basta con sustituir su `.webp` y volver a ejecutar el script.

En el juego (`src/render/background.ts`):

- **Se oscurece un poco** para que lo que se juega encima (piedra, gemas, personajes, mecanismos) se lea bien: el bosque un 32 %, el santuario un 18 % y el observatorio un 22 % (`BACKGROUND_DIM`). La imagen original no se toca.
- **Encima se anima** lo justo: nubes rosadas que cruzan lo alto del cielo del bosque, motas de polvo dorado que suben por el santuario y estrellas que titilan en el cielo del observatorio (nada con "reducir efectos").
- En los niveles del Observatorio, la oscuridad tapa el fondo salvo dentro de los círculos de luz.

## Si haces fondos nuevos

- **Tamaño:** 16:9 (por ejemplo 1024 × 576 o 1280 × 720), en el estilo de la portada y el mapa.
- **Sin personajes, texto ni interfaz.**
- **Lo llamativo arriba:** la mitad de abajo es donde pasa casi todo; cuanto más tranquila, mejor se juega.
- **Nada que parezca suelo:** repisas o balcones horizontales nítidos a media altura pueden confundirse con plataformas.
- **Evitar los colores que significan algo:** verde `#4ADE80`, rosa `#F472B6`, cian `#22D3EE` y blanco puro (botones, palancas y plataformas), y manchas grandes del oro `#F2B632`, la plata `#CFD9EA` o el violeta `#7B2CBF` de los charcos.

## Pantalla final

`final.webp` es el fondo de la pantalla que sale al superar el último nivel: el amanecer desde la terraza del Observatorio, con el reloj del cielo arreglado arriba, la Luna poniéndose a la izquierda (el lado de Lu) y el Sol saliendo a la derecha (el de Mos). El mismo script la pasa a `src/assets/final.png`.

En el juego (`src/render/endingArt.ts`) la escena empieza de noche y se aclara de derecha a izquierda, desde el Sol; a mitad del amanecer el reloj suelta dos ondas de luz al volver a girar. Lu y Mos se colocan sobre el suelo de la terraza (fila 313 del arte, `ENDING_FLOOR`), por dentro del telescopio y del engranaje. Si cambias la imagen, revisa esa fila y la posición del reloj (`CLOCK`).

Encima van el título, la frase final, un panel con estrellas, tiempos y créditos, y "¡Gracias por jugar!": por eso el centro de la imagen, de media altura hacia abajo, es tranquilo.

`anteriores/` guarda cómo eran los fondos dibujados en código, con capturas de los 9 niveles, por si sirven de referencia.
