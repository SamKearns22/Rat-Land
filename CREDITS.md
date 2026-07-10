# Credits

Third-party art assets used (or under evaluation for use) in Rat Land,
beyond the game's own original code, world-building text, and
AI-generated character sprites.

## Dev rule: pre-resize sprites before committing

Never commit an AI-generated (or otherwise large-source) sprite at its
raw generated resolution and let the engine's `drawImage` scale it down
live. The engine draws character images at their own native pixel
dimensions with no runtime resampling (`ctx.drawImage(img, dx, dy,
img.naturalWidth, img.naturalHeight)`) — whatever file you commit *is*
the in-game size, pixel for pixel. A large source scaled down casually
(or an editor's default resize, which is often nearest-neighbor) can
silently lose all fine detail, which is exactly what happened to Fen
Wicket's first sprite: a 1024x1024 source, naively downscaled, ended up
as an unreadable 29x24 purple blob with no visible ears, whiskers, or
paws — nobody caught it because it "looked fine" as a thumbnail in a
file browser.

Before committing any new AI-generated sprite:
1. Figure out the actual in-game display size first (check every place
   the image is drawn — Rat Land's Fen Wicket sprite, for example, is
   used both at native canvas size in the overworld *and* via a CSS
   `width` on the battle screen; both matter).
2. Resize from the original high-resolution source down to that exact
   size using a quality resampling filter — Lanczos or bicubic, not
   nearest-neighbor (nearest-neighbor is correct for *integer upscaling*
   of already-pixel-art assets, e.g. this game's `image-rendering:
   pixelated` CSS and `imageSmoothingEnabled = false` canvas setting,
   but wrong for downscaling a large source).
3. Zoom in on the result at actual pixel size (not a giant preview) and
   confirm the character's key identifying details — eyes, ears,
   whiskers/paws/hands, anything the design calls out — are still
   legible. If they're not, the target size is too small for that
   source's level of detail; increase the display size rather than
   accept an unreadable sprite.
4. Commit the pre-resized file, not the raw source.

## roguelikeCity_magenta.png

- **Title:** Roguelike/Modern City Pack (magenta-keyed export)
- **Artist:** Kenney (kenney.nl)
- **Source:** https://kenney.nl/assets/roguelike-modern-city
- **License:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Note:** The copy provided already carries a proper alpha channel
  (binary 0/255, confirmed by full-sheet pixel scan) — the sheet's
  magenta key color isn't actually present as opaque pixels anywhere in
  this export, so no color-keying step was needed.
- **In use as:** pieces assembled into all 9 named locations' custom
  exteriors (Rat Town Hall, The Gilded Rat, The Rusty Pipe, Church of
  the Rat God, Rat School, Rat Gymnasium, Rat Café, Mousque, Rat
  Shopping District), each measured (pixel-sampled avg. nearest-color
  distance against the game's 13-color Muck-and-Grime-13 palette, same
  method used for the ruins/sewer tilesets) and retinted only as far as
  that measurement called for:
  - Stepped/ziggurat roofline (Town Hall's roof cap): 28.5 → 23.7 (15%).
  - Tan window facade (The Gilded Rat's body): 13.2, already close —
    used unretouched.
  - Gold barrier-post finials (The Gilded Rat's roofline accent): 60.9
    → 47.4 (22%) — deliberately kept far short of a full palette match.
    "Gaudy gold trim" is the whole point of this piece; retinting it all
    the way to the muted palette would have defeated the request, so
    only a light grounding blend was applied and the rest of the gap is
    intentional, not an oversight.
  - Wooden barrel (The Rusty Pipe's exterior prop): 35.6 → 28.6 (20%).
  - Red brick facade (Church of the Rat God's body): 39.4 → 27.9 (30%).
  - Small 4-pane window (Town Hall/Gilded Rat/Rusty Pipe/School/Gym, each
    hue-shifted to that building's own facade color before retinting):
    50.6 raw → 22.7/25.6/18.2/21.0/29.3 respectively.
  - Trash bin (a small decay prop at the base of Rat Gymnasium): 17.5,
    already close — used unretouched.
  - Orange/white barrier stripe (Rat Café's awning): 50.8 → 32.9 (35%).
  - Striped awning (Rat Shopping District's 3 market stalls, hue-shifted
    to orange/blue/green before retinting, same source piece as Rat
    Café's awning above): 50.8 raw → 33.1/31.9/32.6 respectively (~35%).
  - Wooden picket/fence panel, reused as each stall's counter (Rat
    Shopping District): 46.3 → 25.5 (45%).
  - Wooden barrel (reused unmodified from The Rusty Pipe's crop above,
    placed beside the Shopping District's left stall): 35.6 → 28.6
    (20%, already applied).
  - Barrier-post trim (Rat School's roofline cap, same source piece as
    the awning above, desaturated then heavily retinted toward a
    neutral cornice grey rather than kept as a color accent, since a
    school's roofline should read as plain, not decorative): 50.8 →
    12.6 (roughly 90% blend after desaturation). The same grey cornice
    is reused on Rat Gymnasium's and Rat Café's rooflines.
  - Wooden picket fence panel (a short schoolyard fence run beside Rat
    School, desaturated from its original warm-brown and retinted
    toward grey-tan): 46.3 → 8.3.
  - Wall vent units, fan + grid pair (Rat Gymnasium's facade, fitting
    a sweaty hall that needs airing): 32.7/29.1 → 22.7/20.3 (30%).
  - Street-lamp post shaft, colorized to rust-brown and stacked into a
    segmented drainpipe (The Rusty Pipe's namesake pipe, run down the
    brick facade from under the shed roof): 32.4 → 28.0.
  - Wooden crate (small clutter props: by The Rusty Pipe's door and
    beside a Rat Shopping District stall): 41.7 → ~33 (20%).
  - Crate planter boxes, one leafy-green and one with produce
    (The Allotment Bragger's moss plot beside (4,17), the produce one
    desaturated first): 44.3/50.4 → 28.9/17.6 (35%).
  - Mossy green tile (the allotment plot's ground bed): 44.3 → ~29
    (35%).
  - Round bush and teardrop bush (Mousque's and Rat School's entrance
    greenery; the allotment plot): 70.2/71.9 → 27.8-42 (50-60% -- these
    two pieces start much further off-palette than anything else on
    this sheet, so they take the heaviest blends in the set).
  - Plank fence panels (the three river bridges): one full-tile panel
    rotated 90° into `assets/tile-bridge-planks.png`, the deck's
    horizontal plank texture (replacing the old flat brown BRIDGE
    fill); the knothole variant likewise rotated into
    `assets/tile-bridge-planks-holed.png`, scattered by tileHash with
    the knothole punched to a dark water-glimpse; and a picket panel's
    top strip as `assets/bridge-rail.png`, the side rails along each
    deck edge that faces open water. All blended 40% toward the game's
    bridge brown (#8a6240); the rail additionally darkened ~40% so it
    reads as a distinct railing against the deck rather than more of
    the same planking. A small fragment of the broken-panel variant is
    also baked into `assets/river-grate.png` (below) as a wood scrap
    caught against the grate's bars.

## city_extension.png

- **Title:** city_extension (building exterior sheet)
- **Artist:** JVBot Inc.
- **Source:** provided directly by the repository owner
- **License:** CC0 1.0, per the person who provided this file
- **Note:** Several tiles in the lower-right of the sheet carry a
  repeated "JVBot Inc." text watermark. A full-sheet pixel scan for the
  watermark's saturated blue found it confined to y=594–734 (of a
  736px-tall sheet); that entire row band was treated as off-limits and
  nothing was cropped from it, watermarked or not.
- **In use as:** pieces assembled into all 8 named locations' custom
  exteriors, same measure-then-retint-as-needed method as above:
  - Dark teal-blue window facade (Town Hall's body): 36.6 → 25.7 (30%).
  - Tan arched door (Town Hall's entrance): 52.5 → 26.6 (50%).
  - Grey arched door (The Gilded Rat, Mousque): 50.6 → 27.7 (45%).
  - Plain square door/window (The Rusty Pipe, Rat School, Rat Café):
    54.3 → 27.5 (50%).
  - Plain grey facade (Rat School's body): 24.2, already close → 21.7
    (a light 10% blend regardless, since it's used entirely
    unornamented and every pixel needed to read cleanly).
  - Lightest teal facade (Rat Gymnasium's body): 30.8 → 24.4 (20%).
  - Medium teal-green facade (Rat Café's body): 30.3 → 26.0 (15%).
  - Garage-door/shutter icon (Rat Gymnasium's gate): 35.4 → 24.8 (28%).
  - Large 6-pane window (Rat Gymnasium's upgraded windows, replacing
    its original small 4-panes): 37.5 → 25.9 (30%).
  - Small 4-pane grey window (Rat Café's upper-floor windows,
    hue-shifted toward the café's teal facade): 35.1 → 25.2 (30%).
  - Dark shutter-door interior (cropped small and framed as flat
    boards: Rat Café's menu chalkboard, Rat Town Hall's noticeboard,
    and The Gilded Rat's door sign -- the last with a gold trim strip
    in the building's own finial gold): 20.8 raw, 15-25% blends.

## buildings.png

- **Title:** Buildings (top view)
- **Artist:** Kutejnikov
- **Source:** https://opengameart.org/content/buildings-top-view
- **License:** CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
- **Note:** Originally created for the free game *Orkicidium*. 8 building
  variants, each with multiple damage/ruin states.

## cave.png

- **Title:** Cave tileset
- **Artist:** unconfirmed (see note below)
- **Source:** https://opengameart.org/content/cave-tileset
- **License:** CC-BY (per the person who provided this URL)
- **Note:** Part of the same commissioned tileset series as
  `sewer_1.png` (below) — search results describing that series were
  contradictory about the artist's exact username, so it's left
  unconfirmed here rather than risk a wrong name. Title/source/license
  above are otherwise settled.

## ruins_tileset.png

- **Title:** Ruined Modern City Tileset
- **Artist:** Viktor Hahn
- **Source:** https://opengameart.org/content/ruined-modern-city-tileset
- **License:** CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
- **In use as:** environmental decay dressing cropped from this sheet —
  `assets/decal-pavement-crack-clean.png` / `-worn.png` (cracked
  pavement, clean and grimy variants, layered under PATH/PATH_WORN
  tiles in place of the plain brick texture), `assets/decal-brick-
  damage.png` (a visibly damaged brick variant scattered among ordinary
  WALL tiles), `assets/decal-rubble.png` and `assets/decal-weeds.png`
  (sparse props scattered on GROUND tiles). The worn-pavement, brick,
  and rubble crops got a light retint (blended toward the game's
  existing Muck-and-Grime-13 palette, ~25-30%) since their original
  red tone sat noticeably off that palette; the clean pavement and
  weeds crops were already close enough to use unretouched.
  `assets/decal-brick-damage.png` is also reused (unmodified, already
  on-palette from the pass above) as The Rusty Pipe's exterior wall
  texture, and `assets/decal-weeds.png`'s round-bush shape is reused,
  hue-shifted from green to a warm stone-tan, as Mousque's dome. A small
  chunk of this sheet's rubble texture is separately cropped as
  `assets/decal-river-debris.png`, scattered sparingly on the Sewer
  River's WATER tiles as small floating debris (36.2 → 25.5 after a 30%
  retint) — a nod to the small-boats-crossing plot thread.

## sewer_1.png

- **Title:** Sewer tileset
- **Artist:** unconfirmed (see note below)
- **Source:** https://opengameart.org/content/sewer-tileset
- **License:** CC-BY (per the person who provided this URL)
- **Note:** Part 1 of a commissioned tileset series (sewer/cave/desert)
  that `cave.png` above also belongs to. Two independent searches for
  the series' artist gave contradictory answers — one confidently
  named a submitter that reads as an obvious mismatch for an
  OpenGameArt pixel-art credit, which is exactly the kind of
  unreliable result this file shouldn't repeat as fact. Title/source/
  license above come directly from the repository owner, not from
  that search, and are trustworthy; only the artist's name is pending.
- **In use as:** the sheet's non-lava stone/water region, cropped as
  `assets/tile-sewer-stone.png` (building interior walls/floors — Town
  Hall, The Rusty Pipe; also reused, unmodified, as Mousque's exterior
  body) and `assets/tile-sewer-water.png` (the overworld Sewer River
  tile, replacing its old flat fill). The stone crop was already close
  to the game's existing palette and used unretouched. The water crop's
  ripple/bubble detail is the original sheet's, but recolored from
  clean teal to a murky sickly-green sludge (hue retargeted,
  saturation/value scaled down, contrast preserved) to
  read as stagnant polluted water rather than a clean tunnel stream.
  Three further crops joined in the river-dressing pass, all recolored
  with the exact same transform as the water tile (hue fixed to 0.167
  olive, saturation ×0.86, value ×0.95 — verified by locating the water
  tile's own source crop on the sheet and measuring the applied change):
  - The barred outfall arch at (168,80)–(224,112), 2× upscaled as
    `assets/river-grate.png` — the metal grate set into the brick where
    the river meets the map's north wall, its teal pooling water
    murk-recolored and its masonry blended 25% toward the game's
    cracked-brick tone, with two debris pieces baked in at the
    waterline (the existing river-debris crop, plus a Kenney plank
    fragment — the stuff Fen Wicket says floats down).
  - A foam lip strip, rotated vertical as `assets/water-foam-edge.png`,
    drawn at low alpha where the river laps against its banks.
  - The same foam pixels thinned and sheared into
    `assets/water-flow-streak.png`, sparse pale current streaks
    (tileHash-scattered) drifting toward the grate.
  The sheet's lava tiles are excluded from this integration entirely —
  not used anywhere, recolored or otherwise.

## rat.png / mouse.png

- **Title:** Rodents (Rat Rework)
- **Source:** https://opengameart.org/content/rodents-rat-rework
- **License:** CC-BY
- **Note:** A rework of an original rat sprite by **Reemax**; the
  reworking artist's own username wasn't confirmable (WebFetch to the
  page itself is blocked in this environment, and search snippets
  didn't surface it). Grey variant (`rat.png`) used for all rat
  characters (including the player); brown variant (`mouse.png`) used
  for all mouse characters. Both original creator and reworking artist
  should be credited once the reworker's name is confirmed.

---

### Attribution status

**Confirmed independently** (not just taken on trust): `buildings.png`
— a web search surfaced a specific OpenGameArt page whose stated
submission date (2020-09-20) exactly matched the file's own embedded
XMP metadata (`ModifyDate: 2020-09-20T16:11:15+03:00`).

**Confirmed by the repository owner directly**: `cave.png`,
`ruins_tileset.png`, and `sewer_1.png`'s titles, source URLs, and
licenses. `ruins_tileset.png`'s artist (Viktor Hahn) is also confirmed
this way.

**Still open**: the artist name for `cave.png`/`sewer_1.png` (same
person, per the source), and the reworking artist's name for
`rat.png`/`mouse.png` (original sprite credited to Reemax, per search
results, but the rework's own author is unconfirmed). Search results
for the sewer/cave series' artist were inconsistent between attempts,
including one that named someone implausible for the role — not
repeated here as fact. If you have the artist usernames as shown
directly on those OpenGameArt pages, that's the last gap to close.
