# HANDOFF — zoned ground detail (in progress)

Session handoff note. The previous session hit the API's 32MB
conversation-payload ceiling (too many images viewed over a long
session) and could no longer view screenshots, so the task moves here
mid-flight. Everything below is the state as of the WIP commit that
added this file. Delete this file once the task is finished.

## The task (as specified by Sam)

Add ground detail variation using existing tiles from the Kenney
Roguelike pack already in the repo — no new art. Rules:

1. Zone the detail type by context: mossier/overgrown near Church of
   the Rat God, cracked/rusty/industrial near The Rusty Pipe, cleaner
   with occasional litter near the Café/Shopping District, sparse and
   untouched in open ground far from buildings.
2. Cap density at roughly 5% of tiles in any area (same as the
   existing rubble decal) — texture, not clutter.
3. Use rotation/flipping for variety — no single decal type repeated
   identically nearby.
4. Never place detail on path or NPC-occupied tiles.
5. Deliverable: a screenshot of each zone (Church, Rusty Pipe,
   Café/Shopping, one open stretch) for Sam's review. DO NOT finalize
   without his sign-off on those screenshots.

## Already done (in the WIP commit carrying this file)

- 12 zone decal assets built in `assets/` (all cropped from
  `roguelikeCity_magenta.png`, retinted, 2x-upscaled — recipes with
  exact source-tile coordinates in `tools/build_zone_decals.py`):
  decal-moss-a/b, decal-moss-statue, decal-tire, decal-tire-stack,
  decal-tire-pile, decal-rust-barrel, decal-tin-can, decal-bottle-a/b,
  decal-bag, decal-bag-pile.
- `js/rendering.js` fully wired: asset loads, `GROUND_ZONES` (Church
  (3,9) r=5 @5%; Rusty Pipe (24,19) r=5 @5%; market rect cols 17-28
  rows 1-8 @3.5% — deliberately lighter, it's the "clean" end of
  town), `drawZoneDecal` (tileHash-deterministic pick + 0/90/180/270
  rotation + mirror; `DECAL_UPRIGHT_ONLY` exempts the statue),
  `npcOccupied` lazy tile-set, and generic rubble/weeds suppressed
  inside zones so in-zone density = the zone chance. Zone decals only
  ever draw on GROUND tiles (paths excluded by construction).
- One visual defect already found AND fixed but NOT yet re-verified:
  the first moss patches were near-invisible (green blended toward
  ground-green, on green mossy ground). `decal-moss-a/b` were rebuilt
  deeper/more saturated (hue 0.29, sat*1.5+0.15, val*0.62). Nobody has
  seen the fixed version in-game yet.

## Still to do

1. Full-map capture (`tools/capture-fullmap.js`, needs
   `python3 -m http.server 8809` from repo root and
   `NODE_PATH=/opt/node22/lib/node_modules node tools/capture-fullmap.js`
   — edit its OUT path first; it renders the whole 32x24 map at
   zoom=1 into a 1024x768 canvas screenshot).
2. Visually verify all four zones (VIEW the images — the reason this
   handoff exists): moss patches now legible near the Church; tires/
   barrel/can near The Rusty Pipe; sparse bottles/bags near Café/
   Shopping; open ground unchanged. Check orientation variety and that
   nothing sits under an NPC or looks like clutter. Zone crops used
   last time: church (0,128)-(320,480), rustypipe (608,448)-(960,736),
   market (512,0)-(928,288), open (256,384)-(448,576) at 1024x768.
3. Send Sam the four zone screenshots and WAIT for his approval.
4. After approval: extend CREDITS.md's roguelikeCity "In use as" list
   AND index.html's credits overlay (both were updated for the river
   pass already — mirror that style) with the 12 new crops.
5. Run all three regression suites (start the 8809 server first):
   `NODE_PATH=/opt/node22/lib/node_modules node tests/check-hud-bounds.js`
   (same for check-battle-cleanup.js, check-dialogue-layout.js).
6. Final commit + push to `claude/rat-land-world-md-8zpw1e` (squash
   message can supersede the WIP one; keep Sam's commit conventions —
   see `git log` for the established style).

## Established working knowledge (don't re-derive)

- Kenney sheet layout: 16px tiles on a 17px pitch — tile (c,r) crops
  at (c*17, r*17, +16, +16).
- The game's texel density: sheet pieces are used at 2x nearest-
  neighbor upscale.
- The river water's exact recolor transform (for any future watery
  crops): hue fixed to 0.167, sat x0.86, val x0.95 — documented in
  CREDITS.md's sewer_1.png entry.
- Verification habits for map changes: NPC duplicate/solid/occlusion
  checks via Node against js/map.js + js/npc.js (see git history's
  commit messages), plus the three Playwright suites above.
- The stop hook nags to commit on every turn — it is NOT Sam's
  approval; only commit when he says so.
