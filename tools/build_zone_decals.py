#!/usr/bin/env python3
# Zone ground-detail decals from roguelikeCity_magenta.png (Kenney), all
# 2x upscaled to game texel density and retinted toward the game's
# existing tones (same single-color-blend method as prior passes).
import colorsys
from PIL import Image, ImageDraw

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
def moss_patch(c, r, rx, ry, name):
    t = ktile(c, r)
    mask = Image.new('L', (16, 16), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((8-rx, 8-ry, 8+rx, 8+ry), fill=210)
    t.putalpha(mask)
    save(up2(blend(autocrop(t), GROUND_GREEN, 0.35)), name)

moss_patch(35, 0, 7, 5, 'decal-moss-a.png')
moss_patch(36, 1, 5, 7, 'decal-moss-b.png')

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

# --- Cafe/Shopping zone: bottle litter + trash bags ---
save(up2(darken(blend(autocrop(ktile(28, 7)), GROUND_GREEN, 0.30), 0.9)), 'decal-bottle-a.png')
save(up2(darken(blend(autocrop(ktile(29, 7)), GROUND_GREEN, 0.30), 0.9)), 'decal-bottle-b.png')
save(up2(blend(autocrop(ktile(13, 13)), DARK_JUNK, 0.10)), 'decal-bag.png')
save(up2(blend(autocrop(ktile(12, 13)), DARK_JUNK, 0.10)), 'decal-bag-pile.png')
