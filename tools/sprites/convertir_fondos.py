"""Convierte las ilustraciones del diseño en los fondos del menú, del mapa y de los niveles.

Para cada una:
1. La recorta a 16:9 (por el centro) y la reduce a 640 × 360: la misma rejilla de píxeles que
   el escenario del juego (cada píxel se ve de 2 × 2 en pantalla).
2. En la portada, intercambia los colores del logo: en la ilustración "LU" es dorado y "MOS"
   plateado, al revés que los personajes (Lu es la luna, de plata; Mos el sol, de oro).
3. Reduce los colores a una paleta y la guarda con paleta (pesa poco).

Entradas: tools/sprites/portada-referencia.webp y mapa-referencia.webp, y en tools/fondos/
los fondos de los niveles: bosque.webp, santuario.webp y observatorio.webp.
Salidas: src/assets/portada.png, mapa.png, fondo-bosque.png, fondo-santuario.png y
fondo-observatorio.png, y la portada para itch.io en tools/publicar/portada-itch.png.
Requiere Python 3 y Pillow:  python -m pip install pillow
Uso, desde la raíz del proyecto:  python tools/sprites/convertir_fondos.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPRITES = ROOT / 'tools' / 'sprites'
BACKGROUNDS = ROOT / 'tools' / 'fondos'

W, H = 640, 360
# Recuadro del logo en la portada reducida, y la x donde acaba "LU" y empieza "MOS".
LOGO = (222, 8, 418, 60)
SPLIT = 301


def lum(r, g, b):
    return 0.3 * r + 0.59 * g + 0.11 * b


def swap_logo(img, box=LOGO, split=SPLIT):
    """Dorado → plata y plata → dorado, conservando la luz de cada píxel (y el halo de cada parte)."""
    px = img.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            l = lum(r, g, b)
            if l < 70:
                # El halo de "LU" también pasa de cálido a frío.
                if x < split and l >= 18 and r > b + 15:
                    px[x, y] = (round(l * 0.7), round(l * 0.9), min(255, round(l * 1.5)))
                continue
            if r > b + 45:
                # Dorado → plata (un poco azulada, como la de Lu).
                px[x, y] = (min(255, round(l * 0.93)), min(255, round(l * 0.98)), min(255, round(l * 1.1)))
            elif b >= r - 25:
                # Plata → dorado (como el de Mos).
                px[x, y] = (min(255, round(l * 1.18)), min(255, round(l * 0.88)), min(255, round(l * 0.38)))


def convert(source, output, retouch=None, colors=160, method=Image.Quantize.MEDIANCUT):
    im = Image.open(source).convert('RGB')
    cw = round(im.height * W / H)
    x0 = (im.width - cw) // 2
    img = im.crop((x0, 0, x0 + cw, im.height)).resize((W, H), Image.LANCZOS)
    if retouch:
        retouch(img)
    q = img.quantize(colors=colors, method=method, dither=Image.Dither.NONE)
    out = ROOT / 'src' / 'assets' / output
    out.parent.mkdir(parents=True, exist_ok=True)
    q.save(out, optimize=True)
    print(f'{out.relative_to(ROOT)}: {W} × {H}, {colors} colores, {out.stat().st_size // 1024} KB')


def itch_cover():
    """Portada para la página de itch.io (630 × 500), con el logo como en el juego."""
    im = Image.open(SPRITES / 'portada-referencia.webp').convert('RGB')
    cw = round(im.height * 630 / 500)
    x0 = (im.width - cw) // 2
    img = im.crop((x0, 0, x0 + cw, im.height)).resize((630, 500), Image.LANCZOS)
    swap_logo(img, (143, 4, 490, 88), 288)
    out = ROOT / 'tools' / 'publicar' / 'portada-itch.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    print(f'{out.relative_to(ROOT)}: 630 × 500')


def main():
    itch_cover()
    convert(SPRITES / 'portada-referencia.webp', 'portada.png', swap_logo)
    convert(SPRITES / 'mapa-referencia.webp', 'mapa.png')
    # En los fondos de los niveles el corte por medianas apagaba los dorados (estandartes,
    # engranajes, el reloj): el octree con 255 colores los conserva.
    for name in ['bosque', 'santuario', 'observatorio']:
        convert(BACKGROUNDS / f'{name}.webp', f'fondo-{name}.png', colors=255, method=Image.Quantize.FASTOCTREE)


if __name__ == '__main__':
    main()
