#!/usr/bin/env python3
# Zone ground-detail decals from roguelikeCity_magenta.png (Kenney), all
# 2x upscaled to game texel density and retinted toward the game's
# existing tones (same single-color-blend method as prior passes).
import colorsys
from PIL import Image, ImageDraw, ImageFilter

ROOT = '/home/user/Rat-Land'
k = Image.open(f'{ROOT}/roguelikeCity_magenta.png').convert('RGBA')

GROUND_GREEN = (0x6f, 0x7d, 0x4a)
DARK_JUNK = (0x3a, 0x3a, 0x34)
RUST = (0x8a, 0x5a, 0x2b)
STONE_GREY = (0x7a, 0x7a, 0x72)


def ktile(c, r):
    return k.crop((c*17, r*17, c*17+16, r*17+16))


def blend(img, color, pct):
    out = img.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            px[x, y] = (int(r+(color[0]-r)*pct), int(g+(color[1]-g)*pct),
                        int(b+(color[2]-b)*pct), a)
    return out


def darken(img, f):
    out = img.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            px[x, y] = (int(r*f), int(g*f), int(b*f), a)
    return out


def autocrop(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def up2(img):
    return img.resize((img.width*2, img.height*2), Image.NEAREST)


def save(img, name):
    img.save(f'{ROOT}/assets/{name}')
    print(f'{name} {img.size}')


# --- Church zone: moss patches (elliptically masked mossy tiles) + a
# mossy stone ornament (green background removed, statue kept) ---
# NOT called for decal-moss-a/b.png below -- those two were hand-tuned
# after the fact to a deeper, more saturated recipe (hue ~0.29, sat
# *1.5+0.15, val *0.62) because the plain blend() below read as
# near-invisible against the game's own mossy ground. That hand-tune
# lives only in the committed PNGs, not reproduced exactly here -- do
# NOT call moss_patch() for those two names, it'll silently regenerate
# the washed-out original and undo the fix (this happened once already).
def moss_patch(c, r, rx, ry, name):
    t = ktile(c, r)
    mask = Image.new('L', (16, 16), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((8-rx, 8-ry, 8+rx, 8+ry), fill=210)
    t.putalpha(mask)
    save(up2(blend(autocrop(t), GROUND_GREEN, 0.35)), name)

statue = ktile(35, 2).copy()
px = statue.load()
for y in range(16):
    for x in range(16):
        r, g, b, a = px[x, y]
        if a == 0: continue
        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        if 0.2 <= h <= 0.45 and s > 0.25:  # the grass backdrop
            px[x, y] = (0, 0, 0, 0)
save(up2(blend(autocrop(statue), STONE_GREY, 0.15)), 'decal-moss-statue.png')

# --- Rusty Pipe zone: tires, rusty barrel stack, tin can ---
save(up2(blend(autocrop(ktile(14, 13)), DARK_JUNK, 0.10)), 'decal-tire.png')
save(up2(blend(autocrop(ktile(13, 14)), DARK_JUNK, 0.10)), 'decal-tire-stack.png')
save(up2(blend(autocrop(ktile(14, 14)), DARK_JUNK, 0.10)), 'decal-tire-pile.png')
save(up2(darken(blend(autocrop(ktile(32, 3)), RUST, 0.30), 0.85)), 'decal-rust-barrel.png')
save(up2(darken(blend(autocrop(ktile(34, 3)), RUST, 0.20), 0.9)), 'decal-tin-can.png')

# --- Cafe/Shopping zone: small trash cans + trash bags. (28,7)/(29,7)
# were originally cropped here and labeled "bottle", but they're
# actually the market stall roof piece (see (24,3)-(26,3) awning
# crops used for Rat Shopping District) retinted -- there's no bottle
# sprite on this sheet. (17,13)/(18,13) are genuine small trash-can
# props, a better fit for street litter anyway. ---
save(up2(blend(autocrop(ktile(17, 13)), DARK_JUNK, 0.15)), 'decal-trash-can-a.png')
save(up2(blend(autocrop(ktile(18, 13)), DARK_JUNK, 0.15)), 'decal-trash-can-b.png')
save(up2(blend(autocrop(ktile(13, 13)), DARK_JUNK, 0.10)), 'decal-bag.png')
save(up2(blend(autocrop(ktile(12, 13)), DARK_JUNK, 0.10)), 'decal-bag-pile.png')

# --- One bigger focal piece per zone: a single guaranteed-visible larger
# grouping (not part of the random scatter pool), built by combining
# already-cropped pieces from above rather than any new source tile, so
# each zone reads as a distinct area at a glance instead of only small
# scattered tiles. ---
def side_by_side(left, right, overlap, name):
    h = max(left.height, right.height)
    canvas = Image.new('RGBA', (left.width + right.width - overlap, h), (0, 0, 0, 0))
    canvas.paste(left, (0, h - left.height), left)
    canvas.paste(right, (left.width - overlap, h - right.height), right)
    save(up2(canvas), name)

# Church: a wider, denser moss clump built from three overlapping
# blobs on one canvas (not two tiles glued edge to edge, which read as
# a hard-edged rectangle) -- irregular, feathered-edge masks so it
# still reads as organic overgrowth rather than a flat green tile.
def moss_focal():
    W, H = 30, 26
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    src = ktile(35, 0)
    src_tiled = Image.new('RGBA', (W, H))
    for xx in range(0, W, 16):
        for yy in range(0, H, 16):
            src_tiled.paste(src, (xx, yy))
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 4, 20, 24), fill=200)
    d.ellipse((10, 0, 29, 18), fill=200)
    d.ellipse((6, 10, 24, 26), fill=170)
    mask = mask.filter(ImageFilter.GaussianBlur(1.1))
    src_tiled.putalpha(mask)
    save(up2(blend(autocrop(src_tiled), GROUND_GREEN, 0.35)), 'decal-moss-focal.png')

moss_focal()

# The Rusty Pipe: the tire pile fused against the rust barrel -- a small
# dumped-junk cluster instead of one prop at a time.
tire_pile = blend(autocrop(ktile(14, 14)), DARK_JUNK, 0.10)
rust_barrel = darken(blend(autocrop(ktile(32, 3)), RUST, 0.30), 0.85)
side_by_side(rust_barrel, tire_pile, 6, 'decal-junk-focal.png')

# Cafe/Shopping: the trash bag pile fused against a small trash can --
# a small dumped-litter cluster rather than one item at a time.
bag_pile = blend(autocrop(ktile(12, 13)), DARK_JUNK, 0.10)
trash_can = blend(autocrop(ktile(17, 13)), DARK_JUNK, 0.15)
side_by_side(bag_pile, trash_can, 4, 'decal-litter-focal.png')
