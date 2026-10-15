"""Convierte las hojas de elementos del diseño (tools/elementos/originales/) en los sprites del juego.

Las hojas vienen grandes (unos 250 px por baldosa), en JPG y con fondos distintos: un damero
dibujado (no transparente), gris liso, magenta o negro. Para cada pieza:
1. se recorta de su hoja y se le quita el fondo (por color, o rellenando desde el borde cuando
   el propio dibujo usa colores parecidos al fondo, como la luz blanca de la puerta de Lu);
2. se reduce a su tamaño en el juego (1 píxel = 1 píxel del juego; una baldosa son 40 × 40):
   cada píxel nuevo es la media de los píxeles del dibujo en su bloque, si cubren la mitad;
3. se quitan las motas sueltas y los trozos de la pieza vecina.
Las texturas de piedra ya vienen a su tamaño (40 px por baldosa) y se copian tal cual.

Todo se empaqueta en src/assets/elementos.png, con las posiciones en src/render/propSheet.ts.
Requiere Python 3 y Pillow:  python -m pip install pillow
Uso, desde la raíz del proyecto:  python tools/elementos/convertir.py
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).parent / 'originales'
OUT_PNG = ROOT / 'src' / 'assets' / 'elementos.png'
OUT_TS = ROOT / 'src' / 'render' / 'propSheet.ts'

CHANNELS = ['green', 'pink', 'cyan', 'white']
ZONES = {'forest': 'bosque', 'sanctuary': 'santuario', 'observatory': 'observatorio'}

_cache = {}


def sheet(name):
    if name not in _cache:
        _cache[name] = Image.open(SRC / name).convert('RGB')
    return _cache[name]


# ── Fondos ──────────────────────────────────────────────────────────────────


def checker_light(p):
    """Damero claro dibujado: blancos y grises neutros."""
    r, g, b = p
    return max(p) - min(p) <= 14 and (r + g + b) / 3 >= 180


def checker_dark(p):
    """Damero oscuro dibujado: grises neutros medios."""
    r, g, b = p
    return max(p) - min(p) <= 12 and 40 <= (r + g + b) / 3 <= 110


def flat_grey(p):
    """Gris liso de fondo (palancas y botones)."""
    return sum((a - b) ** 2 for a, b in zip(p, (72, 82, 90))) ** 0.5 < 24


def grey_and_glow(p):
    """Gris de fondo y el halo de las perillas encendidas (gris teñido del color de la perilla)."""
    r, g, b = p
    return sum((a - c) ** 2 for a, c in zip(p, (72, 82, 90))) ** 0.5 < 48 and (r + g + b) / 3 < 120


def magenta(p):
    """Magenta de fondo y su borde emborronado por el JPG (rojo y azul parejos, poco verde).
    El rosa de las luces de canal tiene bastante menos azul que rojo: ese se queda."""
    r, g, b = p
    return r > 110 and b > 110 and abs(r - b) < 40 and g < min(r, b) - 60


def black(p):
    return sum(p) < 45


def mask_keyed(img, is_bg):
    """Fondo por color, en toda la pieza (sirve cuando el fondo se ve entre barrotes)."""
    px = img.load()
    return [[not is_bg(px[x, y]) for x in range(img.width)] for y in range(img.height)]


def mask_flood(img, is_bg, sides='lrtb'):
    """Fondo por relleno desde los bordes indicados: lo de dentro del dibujo no se toca."""
    w, h = img.size
    px = img.load()
    bg = [[False] * w for _ in range(h)]
    q = deque()
    if 't' in sides:
        q.extend((x, 0) for x in range(w))
    if 'b' in sides:
        q.extend((x, h - 1) for x in range(w))
    if 'l' in sides:
        q.extend((0, y) for y in range(h))
    if 'r' in sides:
        q.extend((w - 1, y) for y in range(h))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or bg[y][x] or not is_bg(px[x, y]):
            continue
        bg[y][x] = True
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return [[not v for v in row] for row in bg]


# ── Reducción y limpieza ──────────────────────────────────────────────────


def downscale(img, fg, size):
    """Cada píxel nuevo: la media de los píxeles del dibujo en su bloque, si cubren la mitad."""
    W, H = img.size
    w, h = size
    fx, fy = W / w, H / h
    px = img.load()
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    o = out.load()
    for ty in range(h):
        for tx in range(w):
            x0, y0 = int(tx * fx), int(ty * fy)
            x1, y1 = max(x0 + 1, int((tx + 1) * fx)), max(y0 + 1, int((ty + 1) * fy))
            mine = [px[x, y] for y in range(y0, min(y1, H)) for x in range(x0, min(x1, W)) if fg[y][x]]
            total = (min(x1, W) - x0) * (min(y1, H) - y0)
            if total and len(mine) / total >= 0.5:
                n = len(mine)
                o[tx, ty] = tuple(sum(c[k] for c in mine) // n for k in range(3)) + (255,)
    return out


def despeckle(img, minimum=6):
    """Quita los grupos sueltos pequeños (motas, restos del fondo o de la pieza vecina)."""
    w, h = img.size
    a = img.load()
    seen = set()
    groups = []
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or a[x, y][3] == 0:
                continue
            comp = []
            q = deque([(x, y)])
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and a[nx, ny][3]:
                            seen.add((nx, ny))
                            q.append((nx, ny))
            groups.append(comp)
    for comp in groups:
        if len(comp) < minimum:
            for x, y in comp:
                a[x, y] = (0, 0, 0, 0)
    return img


def piece(name, box, size, is_bg, flood=None, minimum=6):
    """Recorta una pieza, le quita el fondo y la reduce a `size`."""
    img = sheet(name).crop(box)
    fg = mask_flood(img, is_bg, flood) if flood else mask_keyed(img, is_bg)
    return despeckle(downscale(img, fg, size), minimum)


# ── Piezas ──────────────────────────────────────────────────────────────────


def gems():
    frames = {}
    xs = [(120, 290), (330, 500), (560, 730), (795, 965)]
    for i, (x0, x1) in enumerate(xs):
        frames[f'gem-sun-{i}'] = piece('gemas.jpg', (x0, 60, x1, 230), (24, 24), checker_dark)
        frames[f'gem-moon-{i}'] = piece('gemas.jpg', (x0, 258, x1, 428), (24, 24), checker_dark)
    return frames


def doors():
    frames = {}
    cols = [(0, 342), (342, 684), (684, 1024)]
    for owner, (y0, y1) in [('mos', (0, 489)), ('lu', (489, 977))]:
        for i, (x0, x1) in enumerate(cols):
            frames[f'door-{owner}-{i}'] = piece('puertas.jpg', (x0, y0, x1, y1), (56, 80), checker_light, flood='lrt', minimum=30)
    return frames


def blocks():
    boxes = {'forest': (15, 0, 320, 320), 'sanctuary': (358, 0, 662, 320), 'observatory': (698, 0, 1006, 320)}
    return {f'block-{z}': piece('bloques.jpg', b, (40, 40), checker_light, flood='lrtb', minimum=20) for z, b in boxes.items()}


def levers():
    frames = {}
    for r, ch in enumerate(CHANNELS):
        top = r * 256
        frames[f'lever-{ch}-off'] = piece('palancas.jpg', (0, top + 30, 253, top + 228), (56, 44), flat_grey, flood='lrtb', minimum=10)
        frames[f'lever-{ch}-on'] = piece('palancas.jpg', (253, top + 30, 506, top + 228), (56, 44), grey_and_glow, flood='lrtb', minimum=10)
    return frames


def buttons():
    frames = {}
    tops = [0, 205, 410, 615]
    for ch, top in zip(CHANNELS, tops):
        frames[f'button-{ch}-up'] = piece('botones.jpg', (35, top + 50, 215, top + 128), (40, 18), flat_grey, flood='lrt', minimum=10)
        frames[f'button-{ch}-down'] = piece('botones.jpg', (790, top + 50, 970, top + 128), (40, 18), flat_grey, flood='lrt', minimum=10)
    return frames


def liquids():
    frames = {}
    rows = {'gold': (0, 126), 'silver': (128, 252), 'shadow': (253, 377)}
    cols = [(2, 254), (258, 510), (514, 766), (770, 1022)]
    for liquid, (y0, y1) in rows.items():
        for i, (x0, x1) in enumerate(cols):
            # El negro de encima de la superficie es fondo; el del fondo del líquido, no.
            frames[f'liquid-{liquid}-{i}'] = piece('liquidos.jpg', (x0, y0, x1, y1), (40, 20), black, flood='t', minimum=4)
    return frames


def platforms():
    frames = {}
    img = sheet('plataformas.jpg')
    tops = [0, 170, 342, 512]
    for ch, top in zip(CHANNELS, tops):
        # Horizontal: tapa izquierda, un tramo del cuerpo (se repite) y tapa derecha.
        frames[f'platform-{ch}-left'] = piece('plataformas.jpg', (0, top, 98, top + 168), (23, 40), magenta, minimum=8)
        frames[f'platform-{ch}-body'] = piece('plataformas.jpg', (250, top, 393, top + 168), (34, 40), magenta, minimum=8)
        frames[f'platform-{ch}-right'] = piece('plataformas.jpg', (586, top, 687, top + 168), (24, 40), magenta, minimum=8)
        # Vertical: el cuerpo de la columna del medio, de su color.
        frames[f'platform-{ch}-vbody'] = piece('plataformas.jpg', (800, top, 906, top + 168), (40, 64), magenta, minimum=8)
    # Tapas de las plataformas verticales (de latón, iguales para todos los colores).
    frames['platform-vtop'] = piece('plataformas.jpg', (688, 4, 792, 62), (40, 22), magenta, minimum=8)
    frames['platform-vbottom'] = piece('plataformas.jpg', (915, 278, 1020, 338), (40, 23), magenta, minimum=8)
    del img
    return frames


def gates():
    """Rejas: de la pieza suelta (riel, emblema, riel) salen la de arriba, la del medio y la de abajo."""
    frames = {}
    src = sheet('rejas.jpg')
    for metal, top in [('gold', 0), ('silver', 252)]:
        single = src.crop((768, top, 1022, top + 252))
        if metal == 'gold':
            rail_top, bars, rail_bottom = (0, 32), (170, 214), (214, 252)
        else:
            rail_top, bars, rail_bottom = (0, 38), (178, 220), (220, 252)
        strip = single.crop((0, bars[0], single.width, bars[1]))

        def with_bars(img, y0, y1):
            img = img.copy()
            y = y0
            while y < y1:
                img.paste(strip.crop((0, 0, img.width, min(strip.height, y1 - y))), (0, y))
                y += strip.height
            return img

        variants = {
            'single': single,
            'top': with_bars(single, *rail_bottom),
            'bottom': with_bars(single, *rail_top),
            'middle': with_bars(with_bars(single, *rail_top), *rail_bottom),
        }
        for kind, img in variants.items():
            fg = mask_keyed(img, checker_light)
            frames[f'gate-{metal}-{kind}'] = despeckle(downscale(img, fg, (40, 40)), 4)
    return frames


def stone():
    """Texturas de piedra (ya a su tamaño) y el remate de arriba de cada zona."""
    frames = {}
    rims = {'forest': 3, 'sanctuary': 4, 'observatory': 4}
    for zone, name in ZONES.items():
        img = Image.open(SRC / f'tileset-{name}.png').convert('RGBA')
        # El ladrillo se repite cada 40 × 20: cualquier recorte de 40 × 40 empalma consigo mismo.
        frames[f'stone-{zone}'] = img.crop((0, 20, 40, 60))
        frames[f'rim-{zone}'] = img.crop((0, 0, 40, rims[zone]))
    return frames


# ── Empaquetado ─────────────────────────────────────────────────────────────


def pack(frames):
    """Estanterías: cada fila del atlas, de izquierda a derecha, con 1 px de separación."""
    width = 512
    x = y = shelf = 0
    places = {}
    for name, img in sorted(frames.items(), key=lambda kv: (-kv[1].height, kv[0])):
        if x + img.width > width:
            x, y, shelf = 0, y + shelf + 1, 0
        places[name] = (x, y, img.width, img.height)
        x += img.width + 1
        shelf = max(shelf, img.height)
    atlas = Image.new('RGBA', (width, y + shelf), (0, 0, 0, 0))
    for name, (px, py, _, _) in places.items():
        atlas.alpha_composite(frames[name], (px, py))
    return atlas, places


def main():
    frames = {}
    for build in (stone, gems, doors, blocks, levers, buttons, liquids, platforms, gates):
        frames.update(build())
    atlas, places = pack(frames)
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    # Con paleta (octree, 255 colores y transparencia): pesa unas 5 veces menos y se ve igual.
    atlas.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(OUT_PNG, optimize=True)
    lines = [
        '// Generado por tools/elementos/convertir.py a partir de las hojas de elementos del diseño.',
        '// No editar a mano: vuelve a ejecutar el script.',
        '',
        '/** Recuadro de cada pieza en src/assets/elementos.png: [x, y, ancho, alto]. */',
        'export const PROP_FRAMES = {',
    ]
    for name in sorted(places):
        x, y, w, h = places[name]
        lines.append(f"  '{name}': [{x}, {y}, {w}, {h}],")
    lines += ['} as const satisfies Record<string, readonly [number, number, number, number]>;', '']
    lines += [f'export const PROP_SHEET_SIZE = {{ w: {atlas.width}, h: {atlas.height} }};', '']
    lines += ['export type PropFrame = keyof typeof PROP_FRAMES;', '']
    OUT_TS.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    print(f'{OUT_PNG.relative_to(ROOT)}: {atlas.width} × {atlas.height}, {len(places)} piezas, {OUT_PNG.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
