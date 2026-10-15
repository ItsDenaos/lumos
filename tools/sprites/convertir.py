"""Convierte la hoja de sprites del diseño (hoja-original.webp) en los sprites del juego.

La hoja original es una ilustración "estilo pixel art": no tiene una rejilla de píxeles real,
está comprimida y lleva un fondo de pergamino. Este script, para cada fotograma:

1. lo recorta y quita el pergamino (y el brillo cian del hechizo de Lu) con un relleno
   desde el borde, más el pergamino que queda atrapado entre el báculo y la túnica;
2. lo reduce a su resolución de pixel art (un píxel nuevo por cada bloque de FACTOR × FACTOR);
3. reduce los colores a una paleta común a todos los fotogramas del personaje;
4. aplica los retoques a mano (los fotogramas del hechizo de Lu) y nitidez del contorno;
5. lo coloca en una celda fija, con los pies abajo y la cabeza centrada en el ancla.

Salidas: src/assets/personajes.png (todas las celdas) y src/render/spriteSheet.ts (posiciones).
Requiere Python 3 y Pillow:  python -m pip install pillow
Uso, desde la raíz del proyecto:  python tools/sprites/convertir.py
"""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).with_name('hoja-original.webp')
OUT_PNG = ROOT / 'src' / 'assets' / 'personajes.png'
OUT_TS = ROOT / 'src' / 'render' / 'spriteSheet.ts'

# Píxeles de la hoja por píxel del sprite: con 2,5 los personajes miden unos 56-64 px de alto,
# como antes en pantalla, pero con el doble de resolución.
FACTOR = 2.5
# Colores por personaje.
COLORS = 32
# Margen arriba de cada fotograma reducido (para lo que se rehace por encima, como la media luna).
PAD = 6
# Color del contorno nítido de cada uno.
OUTLINE = {'lu': (22, 24, 48), 'mos': (42, 22, 10)}
# Color medio del pergamino de la hoja.
PARCH = (240, 218, 163)

ANIMS = ['stand', 'walk', 'action', 'hurt']

# Recuadros (x0, y0, x1, y1) de cada fotograma en la hoja, en el orden de la animación.
FRAMES = {
    'lu': {
        'stand': [(76, 150, 178, 300), (193, 150, 296, 300), (312, 150, 415, 300)],
        'walk': [(466, 148, 538, 300), (554, 148, 628, 300), (641, 148, 713, 300), (723, 148, 796, 300)],
        'action': [(835, 128, 968, 303), (968, 128, 1075, 303), (1075, 128, 1195, 303)],
        'hurt': [(1236, 148, 1370, 300)],
    },
    'mos': {
        'stand': [(24, 370, 180, 540), (188, 370, 292, 540), (305, 370, 412, 540)],
        'walk': [(462, 380, 540, 536), (551, 380, 625, 536), (638, 380, 714, 536), (723, 380, 799, 536)],
        'action': [(862, 365, 993, 536), (993, 365, 1104, 536), (1104, 365, 1218, 536)],
        'hurt': [(1240, 380, 1348, 538)],
    },
}

im = Image.open(SRC).convert('RGB')


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def is_parchment(p):
    # La hoja de la espada es de un amarillo mucho más saturado (g - b alto): no es pergamino.
    return dist(p, PARCH) < 48 and p[1] - p[2] < 72


def is_glow(p):
    # Cian (verde y azul parejos, por encima del rojo). El báculo es blanco azulado (azul > verde).
    r, g, b = p
    return g > 170 and g >= r - 3 and g >= b - 8


def neighbors4(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))


def foreground(box, glow=False):
    """Máscara del personaje dentro del recuadro."""
    x0, y0, x1, y1 = box
    W, H = x1 - x0, y1 - y0
    px = im.load()
    passable = (lambda p: is_parchment(p) or is_glow(p)) if glow else is_parchment
    bg = [[False] * W for _ in range(H)]
    q = deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= W or y >= H or bg[y][x] or not passable(px[x0 + x, y0 + y]):
            continue
        bg[y][x] = True
        q.extend(neighbors4(x, y))
    crop = im.crop(box)
    cp = crop.load()
    fg = [[not v for v in row] for row in bg]

    # Pergamino atrapado (entre el báculo y la túnica, entre las piernas…): regiones claras
    # del color del pergamino que no tocan el borde. La piel es más rosada y la hoja de la
    # espada, más amarilla: esas se quedan.
    seen = [[False] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if seen[y][x] or not fg[y][x] or dist(cp[x, y], PARCH) >= 40:
                continue
            comp = []
            q = deque([(x, y)])
            seen[y][x] = True
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in neighbors4(cx, cy):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and fg[ny][nx] and dist(cp[nx, ny], PARCH) < 40:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(comp) < 20:
                continue
            n = len(comp)
            r, g, b = (sum(cp[c][k] for c in comp) / n for k in range(3))
            if r - g < 25 and 20 <= g - b <= 50:
                for cx, cy in comp:
                    fg[cy][cx] = False

    # Borde claro (antialias contra el pergamino): se quita en dos pasadas.
    for _ in range(2):
        edge = []
        for y in range(H):
            for x in range(W):
                if not fg[y][x]:
                    continue
                touches = any(not (0 <= nx < W and 0 <= ny < H) or not fg[ny][nx] for nx, ny in neighbors4(x, y))
                if touches and dist(cp[x, y], PARCH) < 75 and cp[x, y][1] - cp[x, y][2] < 72:
                    edge.append((x, y))
        for x, y in edge:
            fg[y][x] = False
    return crop, fg


def downscale(crop, fg):
    """Cada píxel nuevo: media de los píxeles del personaje en su bloque (si cubren al menos la mitad)."""
    W, H = crop.size
    w, h = round(W / FACTOR), round(H / FACTOR)
    px = crop.load()
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    o = out.load()
    for ty in range(h):
        for tx in range(w):
            sx0, sy0 = int(tx * FACTOR), int(ty * FACTOR)
            sx1, sy1 = max(sx0 + 1, int((tx + 1) * FACTOR)), max(sy0 + 1, int((ty + 1) * FACTOR))
            pts = [(x, y) for y in range(sy0, min(sy1, H)) for x in range(sx0, min(sx1, W))]
            mine = [px[x, y] for x, y in pts if fg[y][x]]
            if pts and len(mine) / len(pts) >= 0.5:
                n = len(mine)
                o[tx, ty] = tuple(sum(c[k] for c in mine) // n for k in range(3)) + (255,)
    return out


def components(img):
    """Grupos de píxeles opacos conectados (8 vecinos)."""
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
    return groups


def despeckle(img, minimum):
    """Quita las motas sueltas y los trozos del fotograma vecino (grupos separados del
    personaje que tocan un lado o el borde de abajo del recuadro)."""
    a = img.load()
    w, h = img.size
    groups = components(img)
    biggest = max(groups, key=len) if groups else []
    for comp in groups:
        if comp is biggest:
            continue
        neighbor = any(x == 0 or x == w - 1 or y == h - 1 for x, y in comp)
        if len(comp) < minimum or neighbor:
            for x, y in comp:
                a[x, y] = (0, 0, 0, 0)
    return img


def pad(img):
    out = Image.new('RGBA', (img.width, img.height + PAD), (0, 0, 0, 0))
    out.alpha_composite(img, (0, PAD))
    return out


def erase(img, rects):
    """Borra recuadros (coordenadas del fotograma reducido, sin contar el margen)."""
    a = img.load()
    for x0, y0, x1, y1 in rects:
        for y in range(max(0, y0 + PAD), min(img.height, y1 + PAD)):
            for x in range(max(0, x0), min(img.width, x1)):
                a[x, y] = (0, 0, 0, 0)


def paste(img, source, rect, at):
    """Copia los píxeles opacos de un trozo de otro fotograma."""
    x0, y0, x1, y1 = rect
    piece = source.crop((x0, y0 + PAD, x1, y1 + PAD))
    img.alpha_composite(piece, (at[0], at[1] + PAD))


# Media luna del báculo en el primer fotograma de reposo, y dónde queda su centro en cada
# fotograma del hechizo (para los destellos que se dibujan en el juego).
CRESCENT = (28, 2, 41, 16)
CAST_CRESCENT_AT = [(34, -3), (27, -6), (29, -5)]


def fix_lu_cast(frames):
    """Retoques a mano del hechizo de Lu: fuera los remolinos de luz, media luna limpia."""
    stand = frames['stand'][0]
    cast = frames['action']
    erase(cast[0], [(0, 8, 16, 33), (33, -PAD, 48, 11)])
    erase(cast[1], [(0, -PAD, 10, 23), (10, -PAD, 28, 11), (35, 8, 46, 41), (30, 41, 46, 50), (26, -PAD, 41, 8)])
    erase(cast[2], [(0, -PAD, 9, 40), (28, -PAD, 41, 9)])
    for frame, at in zip(cast, CAST_CRESCENT_AT):
        paste(frame, stand, CRESCENT, at)


def outline(img, color):
    """Contorno nítido: los píxeles del borde de tono pardo apagado (antialias del original) pasan al color del contorno."""
    a = img.load()
    w, h = img.size
    change = []
    for y in range(h):
        for x in range(w):
            r, g, b, al = a[x, y]
            if not al:
                continue
            edge = any(not (0 <= nx < w and 0 <= ny < h) or a[nx, ny][3] == 0 for nx, ny in neighbors4(x, y))
            lum = 0.3 * r + 0.59 * g + 0.11 * b
            if edge and lum < 150 and max(r, g, b) - min(r, g, b) < 70:
                change.append((x, y))
    for x, y in change:
        a[x, y] = color + (255,)


def extract(who):
    frames = {}
    for anim in ANIMS:
        frames[anim] = []
        for box in FRAMES[who][anim]:
            crop, fg = foreground(box, glow=(who == 'lu' and anim == 'action'))
            # En los gestos hay más restos sueltos (brillos, trozos del fotograma vecino).
            small = despeckle(downscale(crop, fg), 40 if anim == 'action' else 10)
            frames[anim].append(pad(small))
    # Paleta común a todos los fotogramas del personaje.
    pixels = [p[:3] for imgs in frames.values() for f in imgs for p in f.get_flattened_data() if p[3]]
    swatch = Image.new('RGB', (len(pixels), 1))
    swatch.putdata(pixels)
    palette = swatch.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT)
    for imgs in frames.values():
        for i, f in enumerate(imgs):
            q = f.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
            q.putalpha(f.split()[3])
            imgs[i] = q
    if who == 'lu':
        fix_lu_cast(frames)
    for imgs in frames.values():
        for f in imgs:
            outline(f, OUTLINE[who])
    arm_walk(who, frames)
    return frames


# ── Armas al andar ──────────────────────────────────────────────────────────
# En la hoja, Lu anda sin el báculo y Mos sin la espada ni el escudo: al pararse o al saltar
# (que usa los pasos de andar) aparecían y desaparecían. Se copian del primer fotograma de reposo
# y se colocan alineando la cabeza (los pies del reposo no sirven: el báculo y la espada bajan más).

# Recuadros y trazos, en coordenadas del primer fotograma de reposo (ya reducido).
LU_CRESCENT = (29, 9, 42, 25)
# El palo, de arriba a abajo (para saber por dónde pasa a la altura de la mano).
LU_SHAFT = ((33, 24), (27, 63))
MOS_BLADE = ((3, 65), (27, 46))
MOS_SHIELD = (43, 30, 62, 61)


def lum(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def near_segment(x, y, seg, width):
    (x0, y0), (x1, y1) = seg
    t = max(0, min(1, ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2)))
    px, py = x0 + t * (x1 - x0), y0 + t * (y1 - y0)
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5 <= width


def inside(x, y, box):
    return box[0] <= x < box[2] and box[1] <= y < box[3]


def part(frame, keep):
    """Los píxeles de `frame` que cumplen keep(x, y, color)."""
    out = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    a, o = frame.load(), out.load()
    for y in range(frame.height):
        for x in range(frame.width):
            if a[x, y][3] and keep(x, y, a[x, y]):
                o[x, y] = a[x, y]
    return out


def connected_staff(stand):
    """El báculo del reposo: lo que está unido a la media luna a la derecha del cuerpo (sin el azul
    de la túnica), menos la piel de la mano que lo sujeta. Su contorno oscuro sí entra."""
    a = stand.load()
    w, h = stand.size

    def is_skin(x, y):
        r, g, b = a[x, y][:3]
        return r > g + 15 and r > b + 25

    def ok(x, y):
        # La mano corta el palo en dos: el relleno pasa por ella (luego se quita).
        if x < 26 or x >= w or y >= h or not a[x, y][3]:
            return False
        r, g, b = a[x, y][:3]
        return not (b > r + 30 and lum(a[x, y]) < 120)

    seeds = [(x, y) for y in range(LU_CRESCENT[1], LU_CRESCENT[3]) for x in range(LU_CRESCENT[0], LU_CRESCENT[2]) if ok(x, y)]
    seen = set(seeds)
    q = deque(seeds)
    while q:
        x, y = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                n = (x + dx, y + dy)
                if n not in seen and 0 <= n[0] < w and 0 <= n[1] < h and ok(*n):
                    seen.add(n)
                    q.append(n)
    return part(stand, lambda x, y, c: (x, y) in seen and not is_skin(x, y))


def head_top(frame):
    """Primera fila de la cabeza: la primera con una tira de al menos 12 píxeles seguidos."""
    a = frame.load()
    for y in range(frame.height):
        run = best = 0
        for x in range(frame.width):
            run = run + 1 if a[x, y][3] else 0
            best = max(best, run)
        if best >= 12:
            return y
    return 0


def head_center(frame):
    ax, _ = anchor(frame)
    return ax


def with_part(walk, stand, piece, shift, front):
    """El fotograma de andar con una pieza del reposo, alineando cabezas y desplazada `shift`."""
    margin = 40
    canvas = Image.new('RGBA', (walk.width + 2 * margin, walk.height + 2 * margin), (0, 0, 0, 0))
    canvas.alpha_composite(walk, (margin, margin))
    dx = margin + head_center(walk) - head_center(stand) + shift[0]
    dy = margin + head_top(walk) - head_top(stand) + shift[1]
    layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    layer.alpha_composite(piece, (dx, dy))
    if front:
        canvas.alpha_composite(layer)
        return canvas.crop(canvas.getbbox())
    layer.alpha_composite(canvas)
    return layer.crop(layer.getbbox())


def arm_walk(who, frames):
    stand = frames['stand'][0]
    if who == 'lu':
        staff = connected_staff(stand)
        for i, walk in enumerate(frames['walk']):
            # El palo pasa por la mano de delante (lo más a la derecha del cuerpo, a media altura),
            # por detrás del cuerpo: así la mano lo agarra.
            a = walk.load()
            rows = range(head_top(walk) + 31, head_top(walk) + 39)
            hand = max(x for y in rows for x in range(walk.width) if a[x, y][3])
            shaft = LU_SHAFT[0][0] + (LU_SHAFT[1][0] - LU_SHAFT[0][0]) * 0.55
            shift = (hand + 1 - head_center(walk)) - (round(shaft) - head_center(stand))
            frames['walk'][i] = with_part(walk, stand, staff, (shift, 0), front=False)
    else:
        sword = part(stand, lambda x, y, c: near_segment(x, y, MOS_BLADE, 3.5))
        shield = part(stand, lambda x, y, c: inside(x, y, MOS_SHIELD))
        for i, walk in enumerate(frames['walk']):
            # La espada en la mano de atrás (algo más arriba: el brazo va doblado al andar),
            # y el escudo por delante, un poco más pegado al cuerpo.
            armed = with_part(walk, stand, sword, (0, -4), front=False)
            frames['walk'][i] = with_part(armed, stand, shield, (-3, 0), front=True)


def anchor(img):
    """Pies: la última fila con cuerpo. Centro: el de la cabeza (las filas anchas de arriba)."""
    w, h = img.size
    a = img.load()
    counts = [sum(1 for x in range(w) if a[x, y][3]) for y in range(h)]
    bottom = max(y for y in range(h) if counts[y] >= 4)
    centers = []
    for y in range(h):
        best, run, start = (0, 0), 0, 0
        for x in range(w + 1):
            if x < w and a[x, y][3]:
                if run == 0:
                    start = x
                run += 1
            else:
                if run > best[0]:
                    best = (run, start)
                run = 0
        if best[0] >= 12:
            centers.append(best[1] + best[0] / 2)
        if len(centers) == 8:
            break
    return round(sum(centers) / len(centers)), bottom + 1


def bounds(img):
    box = img.getbbox()
    return box if box else (0, 0, 1, 1)


def save_indexed(img, path):
    """Guarda en modo paleta (hay menos de 256 colores): pesa mucho menos y los colores son exactos."""
    colors = sorted({p[:3] for p in img.get_flattened_data() if p[3]})
    assert len(colors) < 256, f'demasiados colores: {len(colors)}'
    index = {c: i + 1 for i, c in enumerate(colors)}
    out = Image.new('P', img.size, 0)
    out.putpalette([0, 0, 0] + [v for c in colors for v in c])
    out.putdata([index[p[:3]] if p[3] else 0 for p in img.get_flattened_data()])
    out.save(path, optimize=True, transparency=0)


def main():
    sheet = {}
    cells = {}
    for who in ['lu', 'mos']:
        frames = extract(who)
        placed = []
        for anim in ANIMS:
            for f in frames[anim]:
                ax, ay = anchor(f)
                x0, y0, x1, y1 = bounds(f)
                placed.append((anim, f, ax, ay, (x0, y0, x1, y1)))
        left = max(ax - b[0] for _, _, ax, _, b in placed)
        right = max(b[2] - ax for _, _, ax, _, b in placed)
        up = max(ay - b[1] for _, _, _, ay, b in placed)
        down = max(max(0, b[3] - ay) for _, _, _, ay, b in placed)
        cw, ch = left + right, up + down
        cells[who] = {'w': cw, 'h': ch, 'ax': left, 'ay': up, 'frames': placed}
    width = max(len(c['frames']) * c['w'] for c in cells.values())
    height = sum(c['h'] for c in cells.values())
    atlas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    y = 0
    for who, c in cells.items():
        offsets = {anim: [] for anim in ANIMS}
        tips = []
        for i, (anim, f, ax, ay, _) in enumerate(c['frames']):
            cx = i * c['w']
            atlas.alpha_composite(f, (cx + c['ax'] - ax, y + c['ay'] - ay))
            offsets[anim].append(cx)
            if who == 'lu' and anim == 'action':
                k = len(offsets[anim]) - 1
                at = CAST_CRESCENT_AT[k]
                # Centro de la media luna, relativo al ancla (los pies).
                tips.append((at[0] + (CRESCENT[2] - CRESCENT[0]) // 2 - ax, at[1] + PAD + (CRESCENT[3] - CRESCENT[1]) // 2 - ay))
        sheet[who] = {'y': y, 'w': c['w'], 'h': c['h'], 'ax': c['ax'], 'ay': c['ay'], 'frames': offsets, 'tips': tips}
        y += c['h']
    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    save_indexed(atlas, OUT_PNG)

    def frames_ts(offsets):
        return ', '.join(f"{anim}: [{', '.join(str(v) for v in offsets[anim])}]" for anim in ANIMS)

    lines = [
        '// Generado por tools/sprites/convertir.py a partir de la hoja de sprites del diseño.',
        '// No editar a mano: vuelve a ejecutar el script.',
        '',
        "import type { PlayerId } from '../game/types';",
        '',
        'export interface SheetEntry {',
        '  /** Fila de la hoja (y) y tamaño de cada celda. */',
        '  y: number;',
        '  w: number;',
        '  h: number;',
        '  /** Ancla (centro de los pies) dentro de la celda, mirando a la derecha. */',
        '  ax: number;',
        '  ay: number;',
        '  /** x de cada fotograma de cada animación. */',
        '  frames: { stand: number[]; walk: number[]; action: number[]; hurt: number[] };',
        '  /** Centro de la media luna en cada fotograma del hechizo, relativo al ancla (solo Lu). */',
        '  tips: [number, number][];',
        '}',
        '',
        f'export const SHEET_SIZE = {{ w: {width}, h: {height} }};',
        '',
        'export const SHEET: Record<PlayerId, SheetEntry> = {',
    ]
    for who in ['lu', 'mos']:
        e = sheet[who]
        tips = ', '.join(f'[{tx}, {ty}]' for tx, ty in e['tips'])
        lines.append(
            f"  {who}: {{ y: {e['y']}, w: {e['w']}, h: {e['h']}, ax: {e['ax']}, ay: {e['ay']}, "
            f"frames: {{ {frames_ts(e['frames'])} }}, tips: [{tips}] }},"
        )
    lines += ['};', '']
    OUT_TS.write_text('\n'.join(lines), encoding='utf-8', newline='\n')
    print(f'{OUT_PNG.relative_to(ROOT)}: {width} × {height}')
    for who in ['lu', 'mos']:
        e = sheet[who]
        print(f"  {who}: celda {e['w']} × {e['h']}, ancla ({e['ax']}, {e['ay']})")


if __name__ == '__main__':
    main()
