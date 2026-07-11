#!/usr/bin/env python3
# Builds the river/bridge/grate assets for Rat Land from existing sheets:
#   - assets/tile-bridge-planks.png        32x32 plank deck texture
#   - assets/tile-bridge-planks-holed.png  32x32 knothole variant
#   - assets/bridge-rail.png               32x16 rail strip
#   - assets/river-grate.png               112x64 outfall grate + debris
#   - assets/water-flow-streak.png         10x32 current streak
#   - assets/water-foam-edge.png           8x32 bank-edge foam
#
# All watery recolors use the EXACT transform already applied to
# tile-sewer-water.png (verified against its source crop at (192,176)):
#   hue := 0.167 (olive), sat *= 0.86, val *= 0.95
import colorsys
from PIL import Image

ROOT = '/home/user/Rat-Land'
kenney = Image.open(f'{ROOT}/roguelikeCity_magenta.png').convert('RGBA')
sewer = Image.open(f'{ROOT}/sewer_1.png').convert('RGBA')

MURK_HUE, MURK_SAT, MURK_VAL = 0.167, 0.86, 0.95
BRIDGE_BROWN = (0x8a, 0x62, 0x40)  # TILE_COLORS[BRIDGE]
BRICK_MEAN = (55, 56, 48)          # tile-cracked-brick.png mean


def ktile(c, r):
    return kenney.crop((c*17, r*17, c*17+16, r*17+16))


def murk_px(r, g, b, val_boost=1.0):
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    h = MURK_HUE
    s *= MURK_SAT
    v = min(1.0, v * MURK_VAL * val_boost)
    return tuple(int(round(c*255)) for c in colorsys.hsv_to_rgb(h, s, v))


def murk_image(img, val_boost=1.0, only_teal=False, blend_other=None, blend_pct=0.0):
    """Recolor watery (teal) pixels with the murk transform. If only_teal,
    non-teal pixels are optionally blended toward blend_other instead."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
            is_teal = 0.30 <= h <= 0.68 and s > 0.10
            if is_teal or not only_teal:
                px[x, y] = murk_px(r, g, b, val_boost) + (a,)
            elif blend_other is not None:
                nr = int(r + (blend_other[0]-r)*blend_pct)
                ng = int(g + (blend_other[1]-g)*blend_pct)
                nb = int(b + (blend_other[2]-b)*blend_pct)
                px[x, y] = (nr, ng, nb, a)
    return out


def blend_toward(img, color, pct):
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            px[x, y] = (int(r+(color[0]-r)*pct), int(g+(color[1]-g)*pct),
                        int(b+(color[2]-b)*pct), a)
    return out


def up2(img):
    return img.resize((img.width*2, img.height*2), Image.NEAREST)


# --- 1. Bridge deck: clean plank strip (16,15) rotated to horizontal ---
plank = ktile(16, 15).rotate(-90)  # planks now run horizontally
plank = blend_toward(plank, BRIDGE_BROWN, 0.40)
deck = up2(plank)  # 32x32
deck.save(f'{ROOT}/assets/tile-bridge-planks.png')

# knothole variant from (22,15)
holed = ktile(22, 15).rotate(-90)
holed = blend_toward(holed, BRIDGE_BROWN, 0.40)
up2(holed).save(f'{ROOT}/assets/tile-bridge-planks-holed.png')

# --- 2. Rail strip: picket fence (21,14) top 8px -> 32x16 ---
rail = ktile(21, 14).crop((0, 0, 16, 8))
rail = blend_toward(rail, BRIDGE_BROWN, 0.40)
up2(rail).save(f'{ROOT}/assets/bridge-rail.png')

# --- 3. Outfall grate: sewer (168,80)-(224,112), 56x32 -> 112x64 ---
grate = sewer.crop((168, 80, 224, 112))
grate = murk_image(grate, only_teal=True, blend_other=BRICK_MEAN, blend_pct=0.25)
grate = up2(grate)  # 112x64

# debris caught at the bars: existing river-debris decal + a wood scrap
debris = Image.open(f'{ROOT}/assets/decal-river-debris.png').convert('RGBA')
debris_small = debris.resize((14, 14), Image.LANCZOS)
scrap = ktile(20, 16).crop((2, 10, 12, 15))       # 10x5 plank fragment
scrap = blend_toward(scrap, BRIDGE_BROWN, 0.40)
scrap = up2(scrap)                                # 20x10
grate.alpha_composite(debris_small, (30, 46))
grate.alpha_composite(scrap, (62, 50))
grate.save(f'{ROOT}/assets/river-grate.png')

# --- 4. Current streak: vertical foam edge (117,112)-(122,128) ---
streak = sewer.crop((117, 112, 122, 128))         # 5x16
streak = murk_image(streak, val_boost=1.25)
up2(streak).save(f'{ROOT}/assets/water-flow-streak.png')  # 10x32

# --- 5. Bank foam: bright lip (0,148)-(14,153) rotated vertical ---
foam = sewer.crop((0, 148, 14, 152))              # 14x4
foam = murk_image(foam, val_boost=1.15)
foam = foam.rotate(90, expand=True)               # 4x14
foam = up2(foam)                                  # 8x28
# tile vertically to 32
col = Image.new('RGBA', (8, 32), (0, 0, 0, 0))
col.alpha_composite(foam, (0, 0))
col.alpha_composite(foam.crop((0, 0, 8, 4)), (0, 28))
col.save(f'{ROOT}/assets/water-foam-edge.png')

print('built all assets')
for n in ['tile-bridge-planks', 'tile-bridge-planks-holed', 'bridge-rail',
          'river-grate', 'water-flow-streak', 'water-foam-edge']:
    im = Image.open(f'{ROOT}/assets/{n}.png')
    print(f'  {n}.png {im.size}')
