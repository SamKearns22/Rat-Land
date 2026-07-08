// rendering.js — canvas drawing: camera, tiles, locations, rat sprites, labels.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.createCamera = function () {
  return { x: 0, y: 0 };
};

// Overworld/interior zoom: the whole world-space render (tiles, sprites,
// labels) is scaled up by this factor via a single ctx.scale, so the
// player sprite and everything else grow together proportionally rather
// than needing per-element tuning. Camera math divides the raw canvas
// size by this to get the *world-space* view window, so panning/edge
// clamping is computed against how much world is actually visible at
// this zoom, not the raw pixel size of the canvas. HUD/D-pad/dialogue
// box are separate fixed-position DOM elements layered outside the
// canvas (index.html/style.css), never touched by this -- there is
// nothing here for them to be affected by.
RatLand.CAMERA_ZOOM = 1.5;

// Ground textures: a mossy/damp tile for the sewer floor, and a cracked
// brick tile for walls and paths. Images load in the background; until
// they're ready (and if they ever fail), tiles just use their flat
// TILE_COLORS fallback, so the game never blocks on assets.
RatLand.assets = {
  mossy: new Image(),
  brick: new Image(),
  fenwicket: new Image(),
  rat: new Image(),
  mouse: new Image(),
  pavementCrackClean: new Image(),
  pavementCrackWorn: new Image(),
  brickDamaged: new Image(),
  rubble: new Image(),
  weeds: new Image(),
};
RatLand.assets.mossy.src = 'assets/tile-mossy-damp.png';
RatLand.assets.brick.src = 'assets/tile-cracked-brick.png';
RatLand.assets.fenwicket.src = 'assets/fenwicket-sprite.png';
// Environmental decay dressing, cropped from "Ruined Modern City Tileset"
// by Viktor Hahn (CREDITS.md), CC-BY 4.0: cracked pavement (a stone-grey
// crop for clean PATH, a retinted brick-red crop for PATH_WORN, mirroring
// the existing clean/worn tint split), a damaged-brick variant scattered
// among ordinary WALL tiles, and rubble/weeds prop decals scattered
// sparingly on GROUND tiles. The red-toned crops (pavement-worn, brick,
// rubble) got a light retint (blend toward the nearest Muck-and-Grime-13
// palette color, ~25-30%) to sit closer to the game's existing muted
// palette; the grey pavement and the weeds crop were already close
// enough to use unretouched.
RatLand.assets.pavementCrackClean.src = 'assets/decal-pavement-crack-clean.png';
RatLand.assets.pavementCrackWorn.src = 'assets/decal-pavement-crack-worn.png';
RatLand.assets.brickDamaged.src = 'assets/decal-brick-damage.png';
RatLand.assets.rubble.src = 'assets/decal-rubble.png';
RatLand.assets.weeds.src = 'assets/decal-weeds.png';
// Small floating river debris (also from Ruined Modern City Tileset) --
// see drawRiverDebris below for the plot-thread tie-in.
RatLand.assets.riverDebris = new Image();
RatLand.assets.riverDebris.src = 'assets/decal-river-debris.png';
// Non-lava crops of "Sewer tileset" (CREDITS.md), CC-BY: a plain stone
// block texture for building-interior walls/floors (Town Hall, The Rusty
// Pipe -- both read as converted tunnel spaces, not modern rooms), and a
// ripple/bubble water texture for the overworld Sewer River tile. The
// stone crop was already close to the game's existing palette. The
// water crop's ripple/bubble detail is the original sheet's, but its
// color was recolored from the source's clean teal to a murky
// sickly-green sludge (hue fixed to an olive-green target, saturation
// and value scaled down, ripple/bubble contrast preserved rather than
// crushed flat) -- the Sewer River is stagnant, polluted water, not a
// clean tunnel stream.
RatLand.assets.sewerStone = new Image();
RatLand.assets.sewerWater = new Image();
RatLand.assets.sewerStone.src = 'assets/tile-sewer-stone.png';
RatLand.assets.sewerWater.src = 'assets/tile-sewer-water.png';
// Custom exterior building sprites (CREDITS.md: Kenney's "Roguelike/Modern
// City" pack + a CC0 "city_extension" building sheet), assembled per
// location from cropped pieces of both sheets and retinted toward the
// game's existing palette (ruins_tileset.png's damaged-brick decal and
// sewer_1.png's stone tile are reused for Rusty Pipe and Mousque, for
// material variety beyond the two new sheets). Rat Shopping District is
// a market-stall cluster, not a single building -- visual only for now,
// see map.js's BUILDING_FOOTPRINTS comment on keepEntranceWalkable for
// how its gap is kept open for a future vendor-area doorway. Rat Park
// still falls back to its flat-color placeholder box (see the
// LOCATIONS.forEach draw loop below).
RatLand.assets.buildingTownhall = new Image();
RatLand.assets.buildingGildedrat = new Image();
RatLand.assets.buildingRustypipe = new Image();
RatLand.assets.buildingChurch = new Image();
RatLand.assets.buildingSchool = new Image();
RatLand.assets.buildingGym = new Image();
RatLand.assets.buildingCafe = new Image();
RatLand.assets.buildingMousque = new Image();
RatLand.assets.buildingShopping = new Image();
RatLand.assets.buildingTownhall.src = 'assets/building-townhall.png';
RatLand.assets.buildingGildedrat.src = 'assets/building-gildedrat.png';
RatLand.assets.buildingRustypipe.src = 'assets/building-rustypipe.png';
RatLand.assets.buildingChurch.src = 'assets/building-church.png';
RatLand.assets.buildingSchool.src = 'assets/building-school.png';
RatLand.assets.buildingGym.src = 'assets/building-gym.png';
RatLand.assets.buildingCafe.src = 'assets/building-cafe.png';
RatLand.assets.buildingMousque.src = 'assets/building-mousque.png';
RatLand.assets.buildingShopping.src = 'assets/building-shopping.png';
// Not a building: a small allotment plot (planter boxes on a moss bed,
// pieces from roguelikeCity_magenta.png) planted beside The Allotment
// Bragger at (4,17), so their prize-moss dialogue has something physical
// to point at. Purely decorative scenery -- no LOCATIONS entry, no
// label, no collision footprint -- drawn once in renderOverworld like
// the "20 Years!" sign.
RatLand.assets.allotmentPlot = new Image();
RatLand.assets.allotmentPlot.src = 'assets/allotment-plot.png';
RatLand.BUILDING_SPRITES = {
  townhall: 'buildingTownhall',
  gildedrat: 'buildingGildedrat',
  rustypipe: 'buildingRustypipe',
  church: 'buildingChurch',
  school: 'buildingSchool',
  gym: 'buildingGym',
  cafe: 'buildingCafe',
  mousque: 'buildingMousque',
  shopping: 'buildingShopping',
};
// "Rodents (Rat Rework)" (CREDITS.md), CC-BY: the default sprite for the
// player and every NPC except Fen Wicket (who keeps his own hand-picked
// image, above). Grey for rat characters (incl. the player), brown for
// mouse characters. Both sheets share one layout: 4 rows of 32x32
// frames (up, right, down, left, confirmed by direct pixel inspection --
// not assumed), 3 walk-cycle columns per row.
RatLand.assets.rat.src = 'assets/rat.png';
RatLand.assets.mouse.src = 'assets/mouse.png';

RatLand._mossyPattern = null;
RatLand._brickPattern = null;
RatLand._pavementCrackCleanPattern = null;
RatLand._pavementCrackWornPattern = null;
RatLand._brickDamagedPattern = null;
RatLand._sewerStonePattern = null;
RatLand._sewerWaterPattern = null;

function ensureGroundPatterns(ctx) {
  if (!RatLand._mossyPattern && RatLand.assets.mossy.complete && RatLand.assets.mossy.naturalWidth) {
    RatLand._mossyPattern = ctx.createPattern(RatLand.assets.mossy, 'repeat');
  }
  if (!RatLand._brickPattern && RatLand.assets.brick.complete && RatLand.assets.brick.naturalWidth) {
    RatLand._brickPattern = ctx.createPattern(RatLand.assets.brick, 'repeat');
  }
  if (!RatLand._pavementCrackCleanPattern && RatLand.assets.pavementCrackClean.complete && RatLand.assets.pavementCrackClean.naturalWidth) {
    RatLand._pavementCrackCleanPattern = ctx.createPattern(RatLand.assets.pavementCrackClean, 'repeat');
  }
  if (!RatLand._pavementCrackWornPattern && RatLand.assets.pavementCrackWorn.complete && RatLand.assets.pavementCrackWorn.naturalWidth) {
    RatLand._pavementCrackWornPattern = ctx.createPattern(RatLand.assets.pavementCrackWorn, 'repeat');
  }
  if (!RatLand._brickDamagedPattern && RatLand.assets.brickDamaged.complete && RatLand.assets.brickDamaged.naturalWidth) {
    RatLand._brickDamagedPattern = ctx.createPattern(RatLand.assets.brickDamaged, 'repeat');
  }
  if (!RatLand._sewerStonePattern && RatLand.assets.sewerStone.complete && RatLand.assets.sewerStone.naturalWidth) {
    RatLand._sewerStonePattern = ctx.createPattern(RatLand.assets.sewerStone, 'repeat');
  }
  if (!RatLand._sewerWaterPattern && RatLand.assets.sewerWater.complete && RatLand.assets.sewerWater.naturalWidth) {
    RatLand._sewerWaterPattern = ctx.createPattern(RatLand.assets.sewerWater, 'repeat');
  }
}

// Cheap, deterministic 0..1 pseudo-random value per tile coordinate, so
// decay decals (which WALL tiles look extra-damaged, which GROUND tiles
// get a rubble/weeds prop) are picked once from the map layout itself
// and stay put every frame, instead of re-rolling (and visibly jittering)
// on every render.
function tileHash(row, col) {
  var h = (row * 374761393 + col * 668265263) ^ 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h % 10000) / 10000;
}

// Which fill to use for a given overworld tile: textured where we have a
// loaded pattern for it, otherwise its plain TILE_COLORS fallback. PATH
// and PATH_WORN get their own cracked-pavement texture (mirroring the
// existing clean/worn tint split in paintPathContrast below) instead of
// reusing the WALL brick texture; ~1 in 5 WALL tiles swaps in a visibly
// more damaged brick variant so not every wall reads as freshly built.
function overworldFillFor(tile, row, col) {
  var TILE = RatLand.TILE;
  if (tile === TILE.GROUND && RatLand._mossyPattern) return RatLand._mossyPattern;
  if (tile === TILE.WATER && RatLand._sewerWaterPattern) return RatLand._sewerWaterPattern;
  if (tile === TILE.PATH && RatLand._pavementCrackCleanPattern) return RatLand._pavementCrackCleanPattern;
  if (tile === TILE.PATH_WORN && RatLand._pavementCrackWornPattern) return RatLand._pavementCrackWornPattern;
  if (tile === TILE.WALL) {
    if (RatLand._brickDamagedPattern && tileHash(row, col) < 0.2) return RatLand._brickDamagedPattern;
    if (RatLand._brickPattern) return RatLand._brickPattern;
  }
  if ((tile === TILE.PATH || tile === TILE.PATH_WORN) && RatLand._brickPattern) {
    return RatLand._brickPattern;
  }
  return RatLand.TILE_COLORS[tile];
}

// Sparse rubble/weeds prop decals on ordinary GROUND tiles -- a light
// sprinkle of "Ruined Modern City Tileset" decay dressing (CREDITS.md),
// not a per-tile guarantee, using the same deterministic tileHash so a
// given tile's decal (or lack of one) never changes between frames.
var GROUND_DECAL_RUBBLE_CHANCE = 0.05;
var GROUND_DECAL_WEEDS_CHANCE = 0.09; // cumulative: rubble slot + this

// Mousque used to sit at (29, 21), in a big stretch of open GROUND with
// no paths or NPCs to break it up -- exactly the conditions where the
// scatter below reads as noise instead of light dressing, since there's
// nothing else on screen to offset it. Mousque has since moved next to
// Rat Park, but this corner of the map is still that same empty
// stretch, so it stays a deliberately plain, decal-free patch of ground
// rather than reproducing the same clutter somewhere no one asked for.
var QUIET_ZONE_COLS = [25, 31];
var QUIET_ZONE_ROWS = [12, 22];
function inQuietZone(row, col) {
  return col >= QUIET_ZONE_COLS[0] && col <= QUIET_ZONE_COLS[1] &&
    row >= QUIET_ZONE_ROWS[0] && row <= QUIET_ZONE_ROWS[1];
}

function drawGroundDecal(ctx, row, col, ts) {
  if (inQuietZone(row, col)) return;
  var h = tileHash(row + 5000, col + 5000); // offset so it doesn't correlate with the WALL-damage hash
  var img = null;
  if (h < GROUND_DECAL_RUBBLE_CHANCE) {
    img = RatLand.assets.rubble;
  } else if (h < GROUND_DECAL_WEEDS_CHANCE) {
    img = RatLand.assets.weeds;
  } else {
    return;
  }
  if (!img.complete || !img.naturalWidth) return;

  var iw = img.naturalWidth, ih = img.naturalHeight;
  var scale = ts / Math.max(iw, ih);
  var dw = iw * scale, dh = ih * scale;
  var dx = col * ts + (ts - dw) / 2;
  var dy = row * ts + (ts - dh) / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Small floating debris on the Sewer River, cropped from "Ruined Modern
// City Tileset" (CREDITS.md) -- a visual nod to the small-boats-crossing
// plot thread (Fen Wicket's battle opinion: "these boat crossings are
// never justified"), reading as chunks of masonry/junk the river's
// carried down, not just empty water. Own hash offset so it doesn't
// correlate with the ground-decal scatter. The river only has ~39
// actual WATER tiles total (three bridges' 3-row-deep aprons eat a good
// chunk of its length) -- an earlier 6% chance produced exactly 1 hit
// across the entire river on this map's fixed layout, which is too
// sparse to read as an intentional detail rather than a rendering gap.
// 16% puts multiple pieces of debris in view along most any stretch of
// river, confirmed below.
var RIVER_DEBRIS_CHANCE = 0.16;
function drawRiverDebris(ctx, row, col, ts) {
  var h = tileHash(row + 13000, col + 13000);
  if (h >= RIVER_DEBRIS_CHANCE) return;
  var img = RatLand.assets.riverDebris;
  if (!img.complete || !img.naturalWidth) return;

  var iw = img.naturalWidth, ih = img.naturalHeight;
  var scale = (ts * 0.6) / Math.max(iw, ih);
  var dw = iw * scale, dh = ih * scale;
  var dx = col * ts + (ts - dw) / 2;
  var dy = row * ts + (ts - dh) / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.85;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function isPathTileType(tile) {
  return tile === RatLand.TILE.PATH || tile === RatLand.TILE.PATH_WORN;
}

function tileAt(row, col) {
  var grid = RatLand.overworldGrid;
  if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return null;
  return grid[row][col];
}

// Paths and the sewer floor use similarly dark, busy textures, so on their
// own they're hard to tell apart at a glance. A tint keeps clean paths a
// lighter stone grey and worn paths a darker grime brown — both clearly
// apart from the mossy ground — and a curb-line stroke along any edge that
// borders non-path tiles reinforces the road's shape regardless of texture
// noise underneath.
function paintPathContrast(ctx, tile, row, col, ts) {
  var TILE = RatLand.TILE;
  var worn = tile === TILE.PATH_WORN;

  ctx.fillStyle = worn ? 'rgba(40, 28, 14, 0.5)' : 'rgba(215, 210, 198, 0.32)';
  ctx.fillRect(col * ts, row * ts, ts, ts);

  ctx.strokeStyle = worn ? 'rgba(18, 12, 6, 0.7)' : 'rgba(240, 235, 220, 0.6)';
  ctx.lineWidth = 2;
  var x0 = col * ts, y0 = row * ts;

  ctx.beginPath();
  if (!isPathTileType(tileAt(row - 1, col))) { ctx.moveTo(x0, y0 + 1); ctx.lineTo(x0 + ts, y0 + 1); }
  if (!isPathTileType(tileAt(row + 1, col))) { ctx.moveTo(x0, y0 + ts - 1); ctx.lineTo(x0 + ts, y0 + ts - 1); }
  if (!isPathTileType(tileAt(row, col - 1))) { ctx.moveTo(x0 + 1, y0); ctx.lineTo(x0 + 1, y0 + ts); }
  if (!isPathTileType(tileAt(row, col + 1))) { ctx.moveTo(x0 + ts - 1, y0); ctx.lineTo(x0 + ts - 1, y0 + ts); }
  ctx.stroke();
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(v, hi));
}

// The on-screen controls + dialogue box occupy roughly the bottom
// 226px of the mobile viewport (see style.css's dialogue-layout
// comments for the exact stack). Near the map's SOUTH edge the camera
// used to pin so the world's bottom row sat at the screen's bottom
// edge -- which parked the player sprite deep inside that UI band
// whenever they talked to a south-bank NPC (Gristle, Dredge, and
// others near the map's southern edge), where no amount of
// dialogue-box resizing could uncover them. Letting the camera over-scroll past the world bottom
// by the band's height (+8px margin) keeps the south rows rendering
// above the UI band instead; the void below the world's bottom wall
// row is plain background behind the semi-transparent controls.
// Mid-map centering behavior is completely unchanged -- the band only
// affects the bottom clamp, not the follow target. Desktop (no
// on-screen controls, per the 900px breakpoint) keeps the original
// clamp. The bottom-most talkable spot today (row 20, beside Dredge)
// renders the sprite bottom at y≈460 with the band vs. the worst-case
// dialogue top of y≈473; future NPCs placed at rows 21-22 would sit
// below that line again -- keep them north of row 21.
var CAMERA_BOTTOM_UI_BAND = 234; // 226px controls+box stack top + 8px margin
var CONTROLS_MQ = window.matchMedia ? window.matchMedia('(max-width: 899px)') : null;

RatLand.updateCamera = function (camera, player, viewW, viewH) {
  var zoom = RatLand.CAMERA_ZOOM;
  var vw = viewW / zoom, vh = viewH / zoom;
  var worldW = RatLand.OVERWORLD_COLS * RatLand.TILE_SIZE;
  var worldH = RatLand.OVERWORLD_ROWS * RatLand.TILE_SIZE;
  var targetX = player.x + player.size / 2 - vw / 2;
  var targetY = player.y + player.size / 2 - vh / 2;
  var bandWorld = (CONTROLS_MQ && CONTROLS_MQ.matches ? CAMERA_BOTTOM_UI_BAND : 0) / zoom;

  camera.x = worldW <= vw ? -(vw - worldW) / 2 : clamp(targetX, 0, worldW - vw);
  camera.y = worldH <= vh
    ? -(vh - worldH) / 2
    : clamp(targetY, 0, Math.max(0, worldH - vh + bandWorld));
};

RatLand.drawLabel = function (ctx, text, cx, bottomY) {
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  var w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(cx - w / 2 - 3, bottomY - 11, w + 6, 13);
  ctx.fillStyle = '#f4f4f4';
  ctx.fillText(text, cx, bottomY - 1);
};

// A simple, spriteless rat: body ellipse, two ears, a tail, and a facing dot.
// `highlight`, when true, marks this rat as "whoever you'd talk to right
// now" with a soft green glow and a green outline instead of the usual
// dark one.
RatLand.drawRat = function (ctx, x, y, size, color, facing, highlight) {
  var cx = x + size / 2;
  var cy = y + size / 2;
  var r = size / 2;
  var outlineStyle = highlight ? 'rgba(90, 230, 130, 0.95)' : 'rgba(15, 12, 10, 0.85)';

  var tailDX = facing === 'left' ? 1 : facing === 'right' ? -1 : 0;
  var tailDY = facing === 'up' ? 1 : facing === 'down' ? -1 : 0;
  if (tailDX === 0 && tailDY === 0) tailDY = 1;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + tailDX * r * 1.6, cy + tailDY * r * 1.6);
  ctx.stroke();

  if (highlight) {
    ctx.save();
    ctx.shadowColor = 'rgba(80, 220, 120, 0.9)';
    ctx.shadowBlur = r * 0.9;
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = highlight ? 2 : 1.25;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx - r * 0.5, cy - r * 0.6, r * 0.28, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.5, cy - r * 0.6, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = highlight ? 1.5 : 1;
  ctx.stroke();

  if (highlight) {
    ctx.restore();
  }

  var snoutX = cx, snoutY = cy;
  if (facing === 'up') snoutY -= r * 0.8;
  else if (facing === 'down') snoutY += r * 0.8;
  else if (facing === 'left') snoutX -= r * 0.8;
  else if (facing === 'right') snoutX += r * 0.8;
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(snoutX, snoutY, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
};

// --- NPC sprites: the player rat shape plus procedural accessories -----
// No new art assets — every NPC is the same body drawn in drawRat, with
// a fur tone and a short accessory list layered on top. See
// RatLand.NPC_ROSTER in npc.js for what each character gets and why.

// Body-level treatments alter the rat shape/tone itself before the ears
// and accessories go on, e.g. patchy fur or a washed-out nostalgic tone.
function applyBodyTreatment(ctx, cx, cy, r, style, color) {
  if (style === 'scruffy') {
    ctx.fillStyle = 'rgba(20, 15, 10, 0.45)';
    [[-0.35, 0.1, 0.14], [0.3, 0.35, 0.12], [0.05, -0.1, 0.1]].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(cx + p[0] * r, cy + p[1] * r, p[2] * r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (style === 'patched') {
    ctx.fillStyle = 'rgba(120, 100, 70, 0.55)';
    ctx.fillRect(cx - r * 0.3, cy + r * 0.05, r * 0.32, r * 0.28);
  } else if (style === 'hivis' || style === 'wary-light') {
    ctx.strokeStyle = color || 'rgba(180, 170, 100, 0.6)';
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.05);
    ctx.lineTo(cx + r * 0.7, cy + r * 0.2);
    ctx.stroke();
  } else if (style === 'twitch') {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.6, cy + r * 0.1);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.05);
    ctx.lineTo(cx + r * 0.7, cy + r * 0.15);
    ctx.lineTo(cx + r * 0.95, cy + r * 0.1);
    ctx.stroke();
  } else if (style === 'faded') {
    ctx.fillStyle = 'rgba(255, 255, 250, 0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'wary') {
    ctx.fillStyle = 'rgba(10, 8, 6, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.55);
    ctx.lineTo(cx - r * 0.3, cy - r * 0.45);
    ctx.stroke();
  } else if (style === 'droopy') {
    ctx.fillStyle = 'rgba(10, 8, 10, 0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.1, r * 0.85, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'damp' || style === 'damp-light') {
    var strength = style === 'damp' ? 0.4 : 0.2;
    ctx.fillStyle = 'rgba(60, 90, 100, ' + strength + ')';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 160, 180, ' + (strength + 0.15) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.2, cy + r * 0.7);
    ctx.lineTo(cx - r * 0.25, cy + r * 0.95);
    ctx.stroke();
  }
}

function drawHat(ctx, cx, cy, r, style, color) {
  var topY = cy - r * 0.95;
  if (style === 'bowler') {
    ctx.fillStyle = color || '#2a2420';
    ctx.beginPath();
    ctx.ellipse(cx, topY - r * 0.15, r * 0.48, r * 0.38, 0, Math.PI, 0, true);
    ctx.fill();
    ctx.fillRect(cx - r * 0.62, topY, r * 1.24, r * 0.12);
  } else if (style === 'flatcap') {
    ctx.fillStyle = color || '#3a3228';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.05, topY, r * 0.55, r * 0.26, -0.1, Math.PI, 0, true);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.42, topY + r * 0.06, r * 0.16, r * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'tin') {
    ctx.fillStyle = color || '#9a9a90';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, topY + r * 0.12);
    ctx.lineTo(cx, topY - r * 0.5);
    ctx.lineTo(cx + r * 0.5, topY + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.15, topY - r * 0.22);
    ctx.lineTo(cx + r * 0.05, topY + r * 0.05);
    ctx.stroke();
  } else if (style === 'hood') {
    ctx.fillStyle = color || '#5a4a58';
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.25, r * 0.95, r * 1.05, 0, Math.PI * 1.12, Math.PI * 1.88);
    ctx.fill();
  }
}

function drawEyewear(ctx, cx, cy, r, style) {
  var ex = cx - r * 0.5, ey = cy - r * 0.6;
  ctx.strokeStyle = 'rgba(20,20,20,0.85)';
  ctx.lineWidth = 1.2;
  if (style === 'monocle') {
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex + r * 0.2, ey + r * 0.15);
    ctx.lineTo(ex + r * 0.35, ey + r * 0.5);
    ctx.stroke();
  } else if (style === 'spectacles') {
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.18, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.5, ey, r * 0.18, 0, Math.PI * 2);
    ctx.moveTo(ex + r * 0.18, ey);
    ctx.lineTo(cx + r * 0.32, ey);
    ctx.stroke();
  }
}

function drawNeckwear(ctx, cx, cy, r, style, color) {
  ctx.fillStyle = color || '#6a5a4a';
  if (style === 'scarf') {
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.15, r * 0.7, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'sash') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.6);
    ctx.fillRect(-r * 0.15, -r * 0.9, r * 0.3, r * 1.8);
    ctx.restore();
  } else if (style === 'stole') {
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.15, cy - r * 0.1, r * 0.75, r * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'apron') {
    ctx.fillRect(cx - r * 0.35, cy, r * 0.7, r * 0.55);
  } else if (style === 'shawl') {
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.1, r * 0.85, r * 0.5, 0, 0, Math.PI, false);
    ctx.fill();
  }
}

function drawHeldProp(ctx, cx, cy, r, style, color, side) {
  var px = cx + (side === 2 ? -r * 1.05 : r * 1.05);
  var py = cy + r * 0.2;
  ctx.fillStyle = color || '#5a5a50';
  if (style === 'bag') {
    ctx.fillRect(px - r * 0.22, py - r * 0.2, r * 0.44, r * 0.4);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - r * 0.15, py - r * 0.2);
    ctx.lineTo(px - r * 0.15, py - r * 0.4);
    ctx.stroke();
  } else if (style === 'bundle') {
    ctx.fillRect(px - r * 0.2, py - r * 0.16, r * 0.4, r * 0.32);
    ctx.strokeStyle = 'rgba(240,235,220,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - r * 0.2, py);
    ctx.lineTo(px + r * 0.2, py);
    ctx.moveTo(px, py - r * 0.16);
    ctx.lineTo(px, py + r * 0.16);
    ctx.stroke();
  } else if (style === 'newspaper') {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(0.9);
    ctx.fillRect(-r * 0.12, -r * 0.35, r * 0.24, r * 0.7);
    ctx.restore();
  } else if (style === 'cheese') {
    ctx.beginPath();
    ctx.moveTo(px - r * 0.2, py + r * 0.18);
    ctx.lineTo(px + r * 0.2, py + r * 0.18);
    ctx.lineTo(px, py - r * 0.18);
    ctx.closePath();
    ctx.fill();
  } else if (style === 'dripgauge') {
    ctx.beginPath();
    ctx.arc(px, py, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,235,220,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + r * 0.12, py - r * 0.12);
    ctx.stroke();
  } else if (style === 'toolbelt') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.5);
    ctx.fillRect(-r * 0.12, -r * 0.85, r * 0.24, r * 1.7);
    ctx.restore();
    ctx.fillRect(cx + r * 0.15, cy + r * 0.3, r * 0.18, r * 0.18);
  } else if (style === 'crust') {
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.22, r * 0.14, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPin(ctx, cx, cy, r, style, color) {
  var px = cx + r * 0.35, py = cy + r * 0.15;
  if (style === 'ribbon-proud' || style === 'ribbon-crumpled' || style === 'ribbon-mismatched') {
    var offsetX = style === 'ribbon-mismatched' ? -r * 0.55 : r * 0.35;
    ctx.strokeStyle = '#9c8a4a';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    if (style === 'ribbon-crumpled') {
      ctx.moveTo(cx + offsetX - r * 0.1, cy - r * 0.15);
      ctx.lineTo(cx + offsetX + r * 0.05, cy);
      ctx.lineTo(cx + offsetX - r * 0.05, cy + r * 0.1);
      ctx.lineTo(cx + offsetX + r * 0.1, cy + r * 0.25);
    } else {
      ctx.moveTo(cx + offsetX, cy - r * 0.15);
      ctx.lineTo(cx + offsetX, cy + r * 0.25);
    }
    ctx.stroke();
  } else if (style === 'badge' || style === 'tollcoin') {
    ctx.fillStyle = color || '#9c8a3a';
    ctx.beginPath();
    ctx.arc(px, py, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'locket') {
    ctx.fillStyle = 'rgba(200, 190, 160, 0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.1, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'leaf') {
    ctx.fillStyle = '#5c7a3a';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.45, cy - r * 0.75, r * 0.16, r * 0.08, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'moss') {
    ctx.fillStyle = '#5c7a3a';
    [[-0.1, -0.9], [0.08, -0.85], [-0.02, -0.78]].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(cx + p[0] * r, cy + p[1] * r, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (style === 'bunting') {
    ctx.fillStyle = '#9c5a4a';
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.4 + i * r * 0.3, cy - r * 0.85);
      ctx.lineTo(cx - r * 0.25 + i * r * 0.3, cy - r * 0.85);
      ctx.lineTo(cx - r * 0.32 + i * r * 0.3, cy - r * 0.65);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// Shared by both the rat and mouse renderers: layers hat/eyewear/neckwear/
// prop/pin accessories (and any body-level treatment) onto a body already
// drawn at (cx, cy) with radius r.
function applyAccessories(ctx, cx, cy, r, accessories) {
  var propSide = 1;
  accessories.forEach(function (acc) {
    if (acc.type === 'body') applyBodyTreatment(ctx, cx, cy, r, acc.style, acc.color);
  });
  accessories.forEach(function (acc) {
    if (acc.type === 'neck') drawNeckwear(ctx, cx, cy, r, acc.style, acc.color);
    if (acc.type === 'hat') drawHat(ctx, cx, cy, r, acc.style, acc.color);
    if (acc.type === 'eyewear') drawEyewear(ctx, cx, cy, r, acc.style);
    if (acc.type === 'pin') drawPin(ctx, cx, cy, r, acc.style, acc.color);
    if (acc.type === 'prop' || acc.type === 'prop2') {
      drawHeldProp(ctx, cx, cy, r, acc.style, acc.color, propSide);
      propSide = 2;
    }
  });
}

// Custom building sprites stand much taller than their own tile, and
// their upper (non-solid, see map.js's BUILDING_FOOTPRINTS comment)
// portion is walkable-into from behind/above -- so the player can end
// up visually behind a tall roofline with nothing marking where they
// went. ensureBuildingSilhouette lazily renders a solid-white cutout of
// an already-loaded building image (cached on the image itself), used
// by drawBuildingWithOutline to halo the sprite in white behind itself
// -- a clear "you're behind this" cue -- whenever the player's own
// bounding box overlaps the building's.
function ensureBuildingSilhouette(img) {
  if (img._silhouette) return img._silhouette;
  var oc = document.createElement('canvas');
  oc.width = img.naturalWidth;
  oc.height = img.naturalHeight;
  var octx = oc.getContext('2d');
  octx.drawImage(img, 0, 0);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, oc.width, oc.height);
  img._silhouette = oc;
  return oc;
}

// A small, slightly-leaning commemorative sign near Town Hall/the Town
// Crier -- drawn procedurally (a wooden post, a cracked board, and
// canvas-text lettering) rather than as a cropped sprite, since it
// needs its own real text, same technique already used for name labels.
// The lean and the crack across the board are the "cheap upkeep, 20
// years on" detail; not a caricature, just weathered.
function drawAnniversarySign(ctx, cx, baseY) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.rotate(-0.06); // slight lean
  // post
  ctx.fillStyle = '#5e4a36';
  ctx.fillRect(-2, -30, 4, 30);
  // board
  ctx.fillStyle = '#8a7a6c';
  ctx.fillRect(-17, -44, 34, 16);
  ctx.strokeStyle = '#5e4a36';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-17, -44, 34, 16);
  // crack across the board
  ctx.strokeStyle = 'rgba(25, 20, 15, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -44);
  ctx.lineTo(-2, -37);
  ctx.lineTo(2, -34);
  ctx.lineTo(6, -28);
  ctx.stroke();
  // text
  ctx.fillStyle = '#2a2420';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('20 Years!', 0, -36);
  ctx.restore();
}

function drawBuildingWithOutline(ctx, img, x, y) {
  var sil = ensureBuildingSilhouette(img);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(function (o) {
    ctx.drawImage(sil, x + o[0], y + o[1]);
  });
  ctx.drawImage(img, x, y);
  ctx.restore();
}

// Draws a raster-image NPC sprite (currently just Fen Wicket) centered on
// the tile at its native resolution, which is already sized to match the
// procedural sprites' body footprint. Same green glow treatment as the
// code-drawn characters when highlighted.
function drawImageSprite(ctx, x, y, size, img, highlight) {
  var w = img.naturalWidth, h = img.naturalHeight;
  var cx = x + size / 2, cy = y + size / 2;
  var dx = cx - w / 2, dy = cy - h / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (highlight) {
    ctx.shadowColor = 'rgba(80, 220, 120, 0.9)';
    ctx.shadowBlur = size * 0.3;
  }
  ctx.drawImage(img, dx, dy, w, h);
  ctx.restore();
}

// Rodent sprite sheets (rat.png/mouse.png, "Rodents (Rat Rework)" --
// CREDITS.md): each is a 4-row x 3-column grid of 32x32 frames. Row is
// facing direction, confirmed by direct pixel inspection of the actual
// files rather than assumed from a common convention -- this pack
// happens to order them up/right/down/left, not the also-common
// up/left/down/right. Column is the walk-cycle frame; frame 1 (the
// middle column) reads as the neutral/standing pose, used whenever the
// character isn't moving (every NPC, always -- none of them walk
// around -- and the player whenever input isn't held).
var RODENT_FRAME_SIZE = 32;
var RODENT_FRAME_MS = 150; // walk-cycle speed while actually moving
var RODENT_ROW_FOR_FACING = { up: 0, right: 1, down: 2, left: 3 };

function rodentFrameCol(moving) {
  if (!moving) return 1;
  return Math.floor(Date.now() / RODENT_FRAME_MS) % 3;
}

function drawRodentSprite(ctx, x, y, size, img, facing, moving, highlight) {
  var f = RODENT_FRAME_SIZE;
  var row = RODENT_ROW_FOR_FACING[facing];
  if (row === undefined) row = 2; // default: facing down
  var col = rodentFrameCol(moving);
  var cx = x + size / 2, cy = y + size / 2;
  var dx = cx - f / 2, dy = cy - f / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (highlight) {
    ctx.shadowColor = 'rgba(80, 220, 120, 0.9)';
    ctx.shadowBlur = size * 0.3;
  }
  ctx.drawImage(img, col * f, row * f, f, f, dx, dy, f, f);
  ctx.restore();
}

// Draws the player character: the grey rat sprite sheet, animated by
// the player's own facing/moving state (js/player.js already tracks
// both for input handling). Falls back to the original procedural grey
// rat while the image is still loading (or if it ever fails), same
// graceful-degradation pattern as the tile textures.
RatLand.drawPlayer = function (ctx, x, y, size, facing, moving) {
  var img = RatLand.assets.rat;
  if (img && img.complete && img.naturalWidth) {
    drawRodentSprite(ctx, x, y, size, img, facing, moving, false);
    return;
  }
  RatLand.drawRat(ctx, x, y, size, '#9a9a9a', facing);
};

// Draws one NPC from the roster. Every NPC except Fen Wicket now uses
// the shared rat/mouse sprite sheet (grey for rats, brown for mice, per
// spec.species) instead of the old procedural body + accessories --
// always the idle frame (column 1), since no NPC in the roster actually
// walks around. `highlight` marks this as the character the player is
// currently close enough to talk to.
//
// If spec.spriteAsset names a loaded RatLand.assets image, that image is
// drawn instead -- used for the one-off hand-picked sprite swap on Fen
// Wicket, which takes priority over the rat/mouse sheet. Falls back to
// the original procedural body (rat shape + accessories, or the mouse
// silhouette) while whichever image applies is still loading, same
// graceful-degradation pattern as the tile textures.
RatLand.drawNpcRat = function (ctx, x, y, size, spec, facing, highlight) {
  if (spec.spriteAsset) {
    var img = RatLand.assets[spec.spriteAsset];
    if (img && img.complete && img.naturalWidth) {
      drawImageSprite(ctx, x, y, size, img, highlight);
      return;
    }
  } else {
    var rodentImg = spec.species === 'mouse' ? RatLand.assets.mouse : RatLand.assets.rat;
    if (rodentImg && rodentImg.complete && rodentImg.naturalWidth) {
      drawRodentSprite(ctx, x, y, size, rodentImg, facing || 'down', false, highlight);
      return;
    }
  }

  if (spec.species === 'mouse') {
    RatLand.drawMouseNpc(ctx, x, y, size, spec, facing, highlight);
    return;
  }

  RatLand.drawRat(ctx, x, y, size, spec.color, facing || 'down', highlight);

  var cx = x + size / 2, cy = y + size / 2, r = size / 2;
  applyAccessories(ctx, cx, cy, r, spec.accessories || []);
};

// The mouse gets a genuinely different silhouette, not just a new color:
// bigger, more forward ears, a pointed snout, and a smaller frame. Still
// gets the same thin outline as the rats, the same accessory layering,
// and the same green "talking to" glow when highlighted.
RatLand.drawMouseNpc = function (ctx, x, y, size, spec, facing, highlight) {
  var cx = x + size / 2, cy = y + size / 2, r = size / 2 * 0.85;
  var color = spec.color;
  var outlineStyle = highlight ? 'rgba(90, 230, 130, 0.95)' : 'rgba(15, 12, 10, 0.85)';

  var tailDX = facing === 'left' ? 1 : facing === 'right' ? -1 : 0;
  var tailDY = facing === 'up' ? 1 : facing === 'down' ? -1 : 0;
  if (tailDX === 0 && tailDY === 0) tailDY = 1;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + tailDX * r * 1.8, cy + tailDY * r * 1.8);
  ctx.stroke();

  if (highlight) {
    ctx.save();
    ctx.shadowColor = 'rgba(80, 220, 120, 0.9)';
    ctx.shadowBlur = r * 0.9;
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.75, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = highlight ? 2 : 1.1;
  ctx.stroke();

  // Big, forward-set ears — the clearest "mouse, not rat" tell at a glance.
  ctx.beginPath();
  ctx.arc(cx - r * 0.42, cy - r * 0.72, r * 0.36, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.42, cy - r * 0.72, r * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = outlineStyle;
  ctx.lineWidth = highlight ? 1.5 : 0.9;
  ctx.stroke();

  if (highlight) {
    ctx.restore();
  }

  var snoutX = cx, snoutY = cy;
  var tipX = cx, tipY = cy;
  if (facing === 'up') { snoutY -= r * 0.5; tipY -= r * 1.0; }
  else if (facing === 'down') { snoutY += r * 0.5; tipY += r * 1.0; }
  else if (facing === 'left') { snoutX -= r * 0.5; tipX -= r * 1.0; }
  else { snoutX += r * 0.5; tipX += r * 1.0; }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(snoutX - (snoutY === cy ? 0 : r * 0.25), snoutY - (snoutX === cx ? 0 : r * 0.25));
  ctx.lineTo(snoutX + (snoutY === cy ? 0 : r * 0.25), snoutY + (snoutX === cx ? 0 : r * 0.25));
  ctx.lineTo(tipX, tipY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(tipX, tipY, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  applyAccessories(ctx, cx, cy, r, spec.accessories || []);
};

RatLand.render = function (ctx, game, viewW, viewH) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, viewW, viewH);

  // The pre-battle menu and battle screen (js/combat.js) are DOM overlays
  // on top of a frozen overworld frame, not a distinct canvas view, so
  // they render the same as 'overworld' here.
  if (game.mode === 'interior') {
    RatLand.renderInterior(ctx, game, viewW, viewH);
  } else {
    RatLand.renderOverworld(ctx, game, viewW, viewH);
  }
};

RatLand.renderOverworld = function (ctx, game, viewW, viewH) {
  var ts = RatLand.TILE_SIZE;
  var cam = game.camera;
  var TILE = RatLand.TILE;
  var zoom = RatLand.CAMERA_ZOOM;
  var vw = viewW / zoom, vh = viewH / zoom;

  ensureGroundPatterns(ctx);

  var startCol = Math.max(0, Math.floor(cam.x / ts));
  var endCol = Math.min(RatLand.OVERWORLD_COLS - 1, Math.ceil((cam.x + vw) / ts));
  var startRow = Math.max(0, Math.floor(cam.y / ts));
  // NOT clamped to OVERWORLD_ROWS-1 here (unlike startCol/endCol, and
  // unlike this row's own old behavior) -- updateCamera's south-edge UI
  // band deliberately lets cam.y scroll a bit past the point where the
  // real map's bottom row fills the screen, so the player's sprite
  // clears the on-screen controls/dialogue box even when standing at
  // the southernmost walkable row. Clamping the DRAW range to the real
  // grid while the CAMERA range goes further left the extra strip as
  // undrawn canvas -- the plain #111 fill from RatLand.render showing
  // through as a flat black void under the map, confirmed on a real
  // south-bank NPC (Dredge) and reproducible at any south-edge position.
  // The loop below paints real grid rows through OVERWORLD_ROWS-1 as
  // usual, then keeps painting the border WALL's own fill for any
  // further phantom rows the band exposes -- reading as more of the
  // same solid tunnel wall the border already is, not a seam or a void.
  var endRow = Math.ceil((cam.y + vh) / ts);

  // Draw everything in world coordinates so the tiled textures line up
  // seamlessly as the camera scrolls, instead of swimming per-frame. The
  // zoom scale is applied here, once, outside the translate -- every
  // world-space draw call below (tiles, sprites, labels) grows together
  // proportionally as a side effect of the transform, rather than each
  // needing its own zoom-aware size.
  ctx.save();
  ctx.scale(zoom, zoom);
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  for (var row = startRow; row <= endRow; row++) {
    var isPhantomRow = row >= RatLand.OVERWORLD_ROWS;
    for (var col = startCol; col <= endCol; col++) {
      var tile = isPhantomRow ? TILE.WALL : RatLand.overworldGrid[row][col];
      ctx.fillStyle = overworldFillFor(tile, row, col);
      ctx.fillRect(col * ts, row * ts, ts, ts);
      if (!isPhantomRow && isPathTileType(tile)) {
        paintPathContrast(ctx, tile, row, col, ts);
      }
      if (!isPhantomRow && tile === TILE.GROUND) {
        drawGroundDecal(ctx, row, col, ts);
      }
      if (!isPhantomRow && tile === TILE.WATER) {
        drawRiverDebris(ctx, row, col, ts);
      }
    }
  }

  // Placeholder buildings (every location without a working interior) are
  // drawn 50% larger than their tile -- centered on it, so the extra size
  // bleeds evenly outward rather than shifting the building off its own
  // tile -- since they read as too small on their own, independently of
  // the general camera zoom above (that zoom scales this box along with
  // everything else afterward; this is a separate, additional increase).
  // Buildings with a working interior (Town Hall, The Rusty Pipe) keep
  // their original 1-tile size -- they're real, entered locations, not
  // placeholders, so they were never part of this complaint.
  var PLACEHOLDER_BUILDING_SCALE = 1.5;
  var player = game.player;
  // Buildings the player's own bounding box currently overlaps get drawn
  // AFTER the player (with the white outline treatment), so a tall
  // sprite's roofline can actually cover the player instead of the
  // player always painting over every building regardless of position.
  // Everything else draws now, before the player, as always.
  var occludingBuildings = [];
  RatLand.LOCATIONS.forEach(function (loc) {
    var wx = loc.col * ts, wy = loc.row * ts;

    // Custom exterior sprite, where one's been built for this location --
    // bottom-aligned to the tile's base (so it "stands" on its plot and
    // grows upward) and horizontally centered on it, same anchor logic as
    // the flat-box placeholder below.
    var spriteKey = RatLand.BUILDING_SPRITES[loc.id];
    var img = spriteKey && RatLand.assets[spriteKey];
    if (img && img.complete && img.naturalWidth) {
      var bx = wx + ts / 2 - img.naturalWidth / 2;
      var by = wy + ts - img.naturalHeight;
      var overlaps = player.x < bx + img.naturalWidth && player.x + player.size > bx &&
        player.y < by + img.naturalHeight && player.y + player.size > by;
      if (overlaps) {
        occludingBuildings.push({ loc: loc, img: img, bx: bx, by: by, wx: wx });
        return;
      }
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, bx, by);
      ctx.restore();
      RatLand.drawLabel(ctx, loc.name, wx + ts / 2, by - 4);
      return;
    }

    var boxSize = loc.hasInterior ? ts : ts * PLACEHOLDER_BUILDING_SCALE;
    var boxX = wx + ts / 2 - boxSize / 2;
    var boxY = wy + ts / 2 - boxSize / 2;
    ctx.fillStyle = loc.color;
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);
    RatLand.drawLabel(ctx, loc.name, wx + ts / 2, boxY - 4);
  });

  // Faded "20 Years!" commemorative sign, planted on the path between
  // Rat Town Hall and the Town Crier -- close to both without sitting on
  // either one's tile.
  drawAnniversarySign(ctx, 7 * ts + ts / 2, 5 * ts + ts * 0.75);

  // The Allotment Bragger's moss plot, on the grass just west of where
  // they stand at (4,17). Drawn before NPCs so the Bragger layers in
  // front of it, like a gardener beside their patch.
  var plotImg = RatLand.assets.allotmentPlot;
  if (plotImg && plotImg.complete && plotImg.naturalWidth) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(plotImg, 3 * ts - 4, 18 * ts - 2 - plotImg.naturalHeight);
    ctx.restore();
  }

  // With 31 NPCs, several are deliberately clustered near the same
  // building — showing every name at once turns into an unreadable pile
  // of overlapping text. Sprites always render; a name label only joins
  // in once the player is close enough to plausibly be looking at them.
  var NPC_LABEL_RADIUS = 2;
  var playerCol = Math.floor((game.player.x + game.player.size / 2) / ts);
  var playerRow = Math.floor((game.player.y + game.player.size / 2) / ts);

  // Whichever character the Talk button would actually reach right now
  // gets a green glow, so it's never a guess which of several nearby
  // NPCs you're about to speak to.
  var talkTarget = RatLand.findTalkTarget(playerCol, playerRow);

  // Town Crier is a rat like everyone else in the roster, but he isn't
  // part of RatLand.NPC_ROSTER (a separate object, per npc.js), so he
  // doesn't go through drawNpcRat -- same rat-sheet treatment by hand.
  var crier = RatLand.townCrier;
  var crierX = crier.col * ts, crierY = crier.row * ts;
  var crierImg = RatLand.assets.rat;
  // crier.facing (not a hardcoded 'down'): so he turns to face the player
  // like every other NPC when talked to (js/main.js's faceNpcTowardPlayer).
  if (crierImg && crierImg.complete && crierImg.naturalWidth) {
    drawRodentSprite(ctx, crierX, crierY, ts, crierImg, crier.facing || 'down', false, talkTarget === crier);
  } else {
    RatLand.drawRat(ctx, crierX, crierY, ts, crier.color, crier.facing || 'down', talkTarget === crier);
  }
  RatLand.drawLabel(ctx, crier.name, crierX + ts / 2, crierY - 4);

  // Linked pairs (e.g. Nora & Barry) stand close together, so their own
  // name labels would otherwise sit close enough to touch/overlap. Since
  // they're always talked to and highlighted as a single unit anyway, they
  // share one combined label (drawn once, centered between them) instead
  // of two separate labels crowding each other.
  var labeledPairs = {};

  RatLand.NPC_ROSTER.forEach(function (spec) {
    var nx = spec.col * ts, ny = spec.row * ts;
    var highlight = talkTarget === spec ||
      (!!spec.pairId && !!talkTarget && talkTarget.pairId === spec.pairId);
    RatLand.drawNpcRat(ctx, nx, ny, ts, spec, spec.facing || 'down', highlight);
    var dist = Math.max(Math.abs(spec.col - playerCol), Math.abs(spec.row - playerRow));

    if (spec.pairId) {
      if (labeledPairs[spec.pairId]) return; // already drawn by the partner
      var partner = RatLand.NPC_ROSTER.filter(function (o) {
        return o !== spec && o.pairId === spec.pairId;
      })[0];
      var partnerDist = partner
        ? Math.max(Math.abs(partner.col - playerCol), Math.abs(partner.row - playerRow))
        : Infinity;
      if (Math.min(dist, partnerDist) <= NPC_LABEL_RADIUS) {
        labeledPairs[spec.pairId] = true;
        if (partner) {
          var midX = (nx + partner.col * ts) / 2 + ts / 2;
          var topY = Math.min(ny, partner.row * ts) - 4;
          RatLand.drawLabel(ctx, spec.name + ' & ' + partner.name, midX, topY);
        } else {
          RatLand.drawLabel(ctx, spec.name, nx + ts / 2, ny - 4);
        }
      }
      return;
    }

    if (dist <= NPC_LABEL_RADIUS) {
      RatLand.drawLabel(ctx, spec.name, nx + ts / 2, ny - 4);
    }
  });

  RatLand.drawPlayer(ctx, game.player.x, game.player.y, game.player.size, game.player.facing, game.player.moving);

  // Any building the player is standing behind draws last, outlined in
  // white so its silhouette still reads clearly over the player sprite
  // it's now covering.
  occludingBuildings.forEach(function (b) {
    drawBuildingWithOutline(ctx, b.img, b.bx, b.by);
    RatLand.drawLabel(ctx, b.loc.name, b.wx + ts / 2, b.by - 4);
  });

  ctx.restore();
};

RatLand.renderInterior = function (ctx, game, viewW, viewH) {
  var interior = RatLand.INTERIORS[game.currentInteriorId];
  var ts = RatLand.TILE_SIZE;
  var zoom = RatLand.CAMERA_ZOOM;
  var vw = viewW / zoom, vh = viewH / zoom;
  var worldW = interior.cols * ts;
  var worldH = interior.rows * ts;
  var offsetX = Math.floor((vw - worldW) / 2);
  var offsetY = Math.floor((vh - worldH) / 2);

  // Same single-scale approach as renderOverworld: interiors have no
  // camera to translate (small, centered map), but still need the same
  // zoom applied so the player sprite matches its overworld size.
  ctx.save();
  ctx.scale(zoom, zoom);

  ensureGroundPatterns(ctx);

  for (var row = 0; row < interior.rows; row++) {
    for (var col = 0; col < interior.cols; col++) {
      var tile = interior.grid[row][col];
      // Both interiors read as converted tunnel spaces, so wall and floor
      // share the one stone-block texture ("Sewer tileset", CREDITS.md)
      // rather than a flat color, falling back to the old flat fill while
      // the image loads. A dark overlay on WALL cells keeps the room's
      // outline readable -- with one shared texture and no tint, the
      // border blended into the floor and the room's shape disappeared.
      if (tile === RatLand.TILE.PROP) {
        ctx.fillStyle = interior.propColor;
      } else if ((tile === RatLand.TILE.WALL || tile === RatLand.TILE.PATH) && RatLand._sewerStonePattern) {
        ctx.fillStyle = RatLand._sewerStonePattern;
      } else {
        ctx.fillStyle = RatLand.TILE_COLORS[tile];
      }
      ctx.fillRect(offsetX + col * ts, offsetY + row * ts, ts, ts);
      if (tile === RatLand.TILE.WALL && RatLand._sewerStonePattern) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(offsetX + col * ts, offsetY + row * ts, ts, ts);
      }
    }
  }

  if (interior.propLabel) {
    var px = offsetX + interior.propCol * ts + ts / 2;
    var py = offsetY + interior.propRow * ts - 4;
    RatLand.drawLabel(ctx, interior.propLabel, px, py);
  }

  var doorX = offsetX + interior.doorCol * ts + ts / 2;
  var doorY = offsetY + interior.doorRow * ts - 2;
  RatLand.drawLabel(ctx, 'Exit', doorX, doorY);

  ctx.fillStyle = '#f4f4f4';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(interior.title, vw / 2, Math.max(24, offsetY - 12));

  RatLand.drawPlayer(ctx, offsetX + game.player.x, offsetY + game.player.y, game.player.size, game.player.facing, game.player.moving);

  ctx.restore();
};
