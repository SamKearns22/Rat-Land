# Credits

Third-party art assets used (or under evaluation for use) in Rat Land,
beyond the game's own original code, world-building text, and
AI-generated character sprites.

## roguelikeCity_magenta.png

- **Title:** Roguelike/Modern City Pack (magenta-keyed export)
- **Artist:** Kenney (kenney.nl)
- **Source:** https://kenney.nl/assets/roguelike-modern-city
- **License:** CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
- **Note:** The copy provided already carries a proper alpha channel
  (binary 0/255, confirmed by full-sheet pixel scan) — the sheet's
  magenta key color isn't actually present as opaque pixels anywhere in
  this export, so no color-keying step was needed.
- **In use as:** a stepped/ziggurat roofline piece cropped for Rat Town
  Hall's roof cap. Measured avg. nearest-color distance 28.5 against the
  game's 13-color Muck-and-Grime-13 reference palette before retinting
  (pixel-sampled, same method used for the ruins/sewer tilesets) — close
  enough that only a light blend (15% toward each pixel's nearest
  palette color) was applied, landing at 23.7. More pieces to follow as
  the rest of the named locations' exteriors are built.

## city_extension.png

- **Title:** city_extension (building exterior sheet)
- **Artist:** JVBot Inc.
- **Source:** provided directly by the repository owner
- **License:** CC0 1.0, per the person who provided this file
- **Note:** Several tiles in the lower-right of the sheet carry a
  repeated "JVBot Inc." text watermark. A full-sheet pixel scan for the
  watermark's saturated blue found it confined to y=594–734 (of a
  736px-tall sheet); that entire row band is treated as off-limits and
  nothing has been (or will be) cropped from it, watermarked or not.
- **In use as:** a wall-facade texture and an arched door, both
  assembled into Rat Town Hall's exterior. Measured avg. nearest-color
  distance 36.6 (facade) and 52.5 (door) against the Muck-and-Grime-13
  palette before retinting — both moderate enough to need it — and
  landed at 25.7 and 26.6 respectively after a 30%/50% blend toward
  each pixel's nearest palette color. More pieces to follow as the rest
  of the named locations' exteriors are built.

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
  Hall, The Rusty Pipe) and `assets/tile-sewer-water.png` (the
  overworld Sewer River tile, replacing its old flat fill). The stone
  crop was already close to the game's existing palette and used
  unretouched. The water crop's ripple/bubble detail is the original
  sheet's, but recolored from clean teal to a murky sickly-green sludge
  (hue retargeted, saturation/value scaled down, contrast preserved) to
  read as stagnant polluted water rather than a clean tunnel stream.
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
