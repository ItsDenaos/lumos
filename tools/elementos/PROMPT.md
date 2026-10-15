# Prompts para crear la piedra y los elementos de los niveles

Cómo usarlo:

1. Pega primero el **contexto común** y después **un prompt por elemento** (las IA de pixel art rinden mejor de uno en uno).
2. Si la herramienta acepta imágenes de referencia, adjunta:
   - `tools/sprites/hoja-original.webp`: el estilo de Lu y Mos;
   - `tools/fondos/bosque.webp`, `santuario.webp` y `observatorio.webp`: los fondos con los que tiene que combinar;
   - `tools/fondos/anteriores/nivel-5-santuario.png` y `nivel-2-bosque.png`: dónde va cada elemento y a qué tamaño (son los dibujos actuales).
3. Guarda lo que salga en esta carpeta (`tools/elementos/`) con los nombres de cada sección, y yo lo convierto y lo meto en el juego.

Las medidas están en **píxeles del juego**: la pantalla mide 1280 × 720 y cada baldosa 40 × 40. Si la herramienta solo genera más grande, vale una ampliación exacta (×2, ×4…) sin suavizar, y yo la reduzco.

---

## Contexto común (pegar siempre primero)

```
I am making "Lumos", a 2D side-view co-op puzzle platformer in pixel art. Two heroes: Mos, the sun (gold), and Lu, the moon (silver). Gold protects Mos and hurts Lu; silver protects Lu and hurts Mos. The world has three zones: Bosque del Alba (a forest at a frozen eclipse dawn), Santuario de los Astros (a night temple of purple stone with gold trims, sun and moon banners) and Observatorio (a night mountaintop with brass gears, telescopes and a great sky clock).

I need game assets (not illustrations) that sit in front of detailed pixel-art backgrounds:
- Crisp 16-bit pixel art, 1 pixel = 1 game pixel, no anti-aliasing, no blur, no soft glows outside the sprite.
- Side view (front-facing), light from the top-left, 1 px dark outline (#140C1E) on the outer edge.
- Limited palette per asset (max ~16 colors), consistent across all assets.
- Fully transparent background (PNG with alpha). If transparency is impossible, use flat magenta #FF00FF.
- No characters, no text, no UI, no background scenery inside the sprites.
- Assets must read clearly against busy backgrounds: stronger contrast and a bit more saturation than the backgrounds, solid shapes, clean silhouettes.
- Exact sizes and grid layouts as specified: sprites packed edge to edge in the grid, no margins, no labels.
```

---

## 1. Piedra de cada zona: `tileset-bosque.png`, `tileset-santuario.png`, `tileset-observatorio.png`

Pide uno por zona cambiando la última parte.

```
Create a side-view platformer TILESET of solid stone, 40x40 px per tile, laid out as a 4-column x 5-row grid (160x200 px total), tiles edge to edge, no gaps:
Row 1: top-left corner, top edge, top-right corner, top of a 1-tile-wide pillar
Row 2: left edge, center fill, right edge, middle of a 1-tile-wide pillar
Row 3: bottom-left corner, bottom edge, bottom-right corner, bottom of a 1-tile-wide pillar
Row 4: left end of a 1-tile-tall ledge, middle of a 1-tile-tall ledge, right end of a 1-tile-tall ledge, single isolated block
Row 5: three more center-fill variations (same style, slightly different bricks), and a "pool basin" tile: its top half is empty (transparent) and its bottom half is stone with a dark inner rim, to hold a liquid.
All pieces must tile seamlessly with each other in every direction; center fills must be seamless on all four sides. The walkable top edges must look clearly solid (a strong lit top rim). Bricks: roughly 20x10 px, offset rows, lighter top-left bevel, darker bottom-right shadow, dark mortar lines, a few small cracks and details.
```

- **Bosque del Alba:** `Earthy warm stone bricks (#7A6A58 with lights #9C8A72 and shadows #54473A, mortar #3A3029) with a lush grass rim on top edges (#4E9A2F, highlights #86CF4A, dark #2E6A22): small grass blades, a few hanging roots and moss patches on the sides. Must stand out against a dim green-and-purple forest background.`
- **Santuario de los Astros:** `Lilac temple stone blocks (#8A7EA6, lights #AB9FC7, shadows #5E5378, mortar #3A3152) with an ornate gold molding on top edges (#E9C46A, highlight #FFF0B0, shadow #A8822E) and tiny inlaid gold stars on a few bricks. Must stand out against a dark purple temple background.`
- **Observatorio:** `Cool blue-grey stone bricks (#3C4468, lights #566092, shadows #262C48, mortar #181C32) with a riveted brass trim on top edges (#C9A24A, highlight #F0D58A, shadow #7D6224). Must stand out against a dark night sky with brass gears.`

---

## 2. Charcos: `liquidos.png`

```
Create 3 animated LIQUID strips for a side-view platformer, each strip 40x20 px (the top half of a 40x40 tile), seamless left-to-right so they can be repeated, 4 animation frames each for a gentle wave on the surface. Layout: 4 columns (frames) x 3 rows (liquids) = 160x60 px.
Row 1: molten GOLD (#F2B632, highlights #FFE27A, deep #C47F12) with tiny rising bubbles and a small SUN symbol (dark amber) in the middle of the strip.
Row 2: liquid SILVER (#CFD9EA, highlights #FFFFFF, deep #8E9FC2) with cold glints and a small crescent MOON symbol (dark blue-grey) in the middle.
Row 3: SHADOW ink (#2A0E3A, deep #160620) with a glowing violet edge (#7B2CBF) and a small X symbol (#C08BFF) in the middle, wisps of violet smoke.
The symbol must stay readable so colorblind players can tell the liquids apart. The surface line is the top 2-4 px; the liquid fills the rest of the strip.
```

---

## 3. Rejas de metal: `rejas.png`

```
Create METAL GATE tiles for a side-view platformer, 40x40 px each: vertical bars that one hero can pass through (transparent gaps between the bars). Two metals: GOLD (sun emblem) and SILVER (crescent moon emblem). Layout: 4 columns x 2 rows = 160x80 px.
Columns: top piece (with a top rail), middle piece (with the round emblem in the center), bottom piece (with a bottom rail), single piece (top and bottom rails and the emblem).
Row 1: gold (#F2B632, light #FFE27A, dark #C47F12, deep #9A5C08) with a sun emblem.
Row 2: silver (#CFD9EA, light #FFFFFF, dark #9FB0CC, deep #71809E) with a crescent moon emblem.
Pieces stack vertically without seams (top + middle + middle + bottom).
```

---

## 4. Puertas: `puertas.png`

```
Create two DOORS for a side-view platformer, each 56x80 px (standing on the floor, 2 tiles tall): an arched doorway with an ornate metal frame and an emblem at the keystone. Three states each, left to right: closed (dark empty doorway), opening (the doorway half filled with light from the bottom), open (the doorway fully glowing). Layout: 3 columns x 2 rows = 168x160 px.
Row 1: Mos's door, GOLD frame with a SUN emblem, warm golden light (#FFE27A).
Row 2: Lu's door, SILVER frame with a crescent MOON emblem, cool white-blue light (#E8EEF8).
The bottom row of pixels is the floor line; the door is centered horizontally.
```

---

## 5. Gemas: `gemas.png`

```
Create two collectible GEMS for a side-view platformer, 24x24 px each, 4 animation frames of a gentle shine/sparkle (the gem stays in place; the game makes it float). Layout: 4 columns x 2 rows = 96x48 px.
Row 1: a golden SUN gem for Mos (gold #F2B632, highlight #FFE27A, small rays).
Row 2: a silver crescent MOON gem for Lu (silver #CFD9EA, highlight #FFFFFF, a hint of blue #A9C8FF).
```

---

## 6. Botones: `botones.png`

```
Create PRESSURE PLATE buttons for a side-view platformer, 40x16 px each, sitting on the floor (the bottom pixel row is the floor line): a low stone base with a colored plate on top. Two states: raised (left column) and pressed (right column: plate flat and glowing). Four channel colors, one per row: green #4ADE80, pink #F472B6, cyan #22D3EE, white #F1F5F9. Layout: 2 columns x 4 rows = 80x64 px.
The colors must be exact and saturated: they link each button to its lever or platform.
```

---

## 7. Palancas: `palancas.png`

```
Create floor LEVERS for a side-view platformer, 40x40 px each, standing on the floor (the bottom pixel row is the floor line): a small stone base with a colored gem, and a wooden or metal handle with a colored round knob. Two states: off (handle tilted to the left, gem dim, left column) and on (handle tilted to the right, gem lit, right column). Four channel colors, one per row: green #4ADE80, pink #F472B6, cyan #22D3EE, white #F1F5F9. Layout: 2 columns x 4 rows = 80x160 px.
```

---

## 8. Plataformas móviles: `plataformas.png`

```
Create MOVING PLATFORM pieces for a side-view platformer, 40x40 px each: a carved stone-and-brass slab with a glowing colored light strip, built from 3-slice pieces so the game can make platforms of any length.
Columns: horizontal left end, horizontal middle, horizontal right end, vertical top end, vertical middle, vertical bottom end.
Rows: one per channel color for the light strip: green #4ADE80, pink #F472B6, cyan #22D3EE, white #F1F5F9.
Layout: 6 columns x 4 rows = 240x160 px. Horizontal pieces join seamlessly left-to-right; vertical pieces join seamlessly top-to-bottom. They must look different from the static stone (metal corners, rivets, the light strip) so players know they move.
```

---

## 9. Bloques empujables: `bloques.png`

```
Create PUSHABLE STONE BLOCKS for a side-view platformer, 40x40 px each, one per zone, side by side: 120x40 px.
1: warm earthy stone with moss (forest). 2: lilac temple stone with a gold edge (temple). 3: blue-grey stone with brass corners (observatory).
Each block has a carved STAR emblem in the center, a strong bevel and dark outline, and looks clearly movable and different from the wall tiles (lighter, chunkier, like a crate made of stone).
```

---

## Qué hago yo con lo que me pases

Recorto cada pieza por su rejilla, quito el fondo si hace falta, ajusto los colores a la paleta y lo meto en el juego. Lo que no llegue a tiempo (o no te guste) sigue dibujándose en código como ahora. Las animaciones de los charcos, las gemas y las puertas, y el brillo de botones y palancas, las monto yo con los fotogramas que vengan.
