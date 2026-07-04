// rendering.js — canvas drawing: camera, tiles, locations, rat sprites, labels.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.createCamera = function () {
  return { x: 0, y: 0 };
};

// Ground textures: a mossy/damp tile for the sewer floor, and a cracked
// brick tile for walls and paths. Images load in the background; until
// they're ready (and if they ever fail), tiles just use their flat
// TILE_COLORS fallback, so the game never blocks on assets.
RatLand.assets = {
  mossy: new Image(),
  brick: new Image(),
  fenwicket: new Image(),
};
RatLand.assets.mossy.src = 'assets/tile-mossy-damp.png';
RatLand.assets.brick.src = 'assets/tile-cracked-brick.png';
RatLand.assets.fenwicket.src = 'assets/fenwicket-sprite.png';

RatLand._mossyPattern = null;
RatLand._brickPattern = null;

function ensureGroundPatterns(ctx) {
  if (!RatLand._mossyPattern && RatLand.assets.mossy.complete && RatLand.assets.mossy.naturalWidth) {
    RatLand._mossyPattern = ctx.createPattern(RatLand.assets.mossy, 'repeat');
  }
  if (!RatLand._brickPattern && RatLand.assets.brick.complete && RatLand.assets.brick.naturalWidth) {
    RatLand._brickPattern = ctx.createPattern(RatLand.assets.brick, 'repeat');
  }
}

// Which fill to use for a given overworld tile: textured where we have a
// loaded pattern for it, otherwise its plain TILE_COLORS fallback.
function overworldFillFor(tile) {
  var TILE = RatLand.TILE;
  if (tile === TILE.GROUND && RatLand._mossyPattern) return RatLand._mossyPattern;
  if ((tile === TILE.WALL || tile === TILE.PATH || tile === TILE.PATH_WORN) && RatLand._brickPattern) {
    return RatLand._brickPattern;
  }
  return RatLand.TILE_COLORS[tile];
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

RatLand.updateCamera = function (camera, player, viewW, viewH) {
  var worldW = RatLand.OVERWORLD_COLS * RatLand.TILE_SIZE;
  var worldH = RatLand.OVERWORLD_ROWS * RatLand.TILE_SIZE;
  var targetX = player.x + player.size / 2 - viewW / 2;
  var targetY = player.y + player.size / 2 - viewH / 2;

  camera.x = worldW <= viewW ? -(viewW - worldW) / 2 : clamp(targetX, 0, worldW - viewW);
  camera.y = worldH <= viewH ? -(viewH - worldH) / 2 : clamp(targetY, 0, worldH - viewH);
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

// Draws one NPC from the roster: base rat (or mouse) body shared with the
// player, a body-level treatment if any, then hat/eyewear/neckwear/prop/pin
// accessories layered on top in a sensible order. `highlight` marks this
// as the character the player is currently close enough to talk to.
//
// If spec.spriteAsset names a loaded RatLand.assets image, that image is
// drawn instead of the procedural body — used for the one-off hand-picked
// sprite swap on Fen Wicket. Falls back to the procedural rat while the
// image is still loading, same graceful-degradation pattern as the tile
// textures.
RatLand.drawNpcRat = function (ctx, x, y, size, spec, facing, highlight) {
  if (spec.spriteAsset) {
    var img = RatLand.assets[spec.spriteAsset];
    if (img && img.complete && img.naturalWidth) {
      drawImageSprite(ctx, x, y, size, img, highlight);
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

  ensureGroundPatterns(ctx);

  var startCol = Math.max(0, Math.floor(cam.x / ts));
  var endCol = Math.min(RatLand.OVERWORLD_COLS - 1, Math.ceil((cam.x + viewW) / ts));
  var startRow = Math.max(0, Math.floor(cam.y / ts));
  var endRow = Math.min(RatLand.OVERWORLD_ROWS - 1, Math.ceil((cam.y + viewH) / ts));

  // Draw everything in world coordinates so the tiled textures line up
  // seamlessly as the camera scrolls, instead of swimming per-frame.
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  for (var row = startRow; row <= endRow; row++) {
    for (var col = startCol; col <= endCol; col++) {
      var tile = RatLand.overworldGrid[row][col];
      ctx.fillStyle = overworldFillFor(tile);
      ctx.fillRect(col * ts, row * ts, ts, ts);
      if (isPathTileType(tile)) {
        paintPathContrast(ctx, tile, row, col, ts);
      }
    }
  }

  RatLand.LOCATIONS.forEach(function (loc) {
    var wx = loc.col * ts, wy = loc.row * ts;
    ctx.fillStyle = loc.color;
    ctx.fillRect(wx, wy, ts, ts);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx + 0.5, wy + 0.5, ts - 1, ts - 1);
    RatLand.drawLabel(ctx, loc.name, wx + ts / 2, wy - 4);
  });

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

  var crier = RatLand.townCrier;
  var crierX = crier.col * ts, crierY = crier.row * ts;
  RatLand.drawRat(ctx, crierX, crierY, ts, crier.color, 'down', talkTarget === crier);
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

  RatLand.drawRat(ctx, game.player.x, game.player.y, game.player.size, '#9a9a9a', game.player.facing);

  ctx.restore();
};

RatLand.renderInterior = function (ctx, game, viewW, viewH) {
  var interior = RatLand.INTERIORS[game.currentInteriorId];
  var ts = RatLand.TILE_SIZE;
  var worldW = interior.cols * ts;
  var worldH = interior.rows * ts;
  var offsetX = Math.floor((viewW - worldW) / 2);
  var offsetY = Math.floor((viewH - worldH) / 2);

  for (var row = 0; row < interior.rows; row++) {
    for (var col = 0; col < interior.cols; col++) {
      var tile = interior.grid[row][col];
      ctx.fillStyle = tile === RatLand.TILE.PROP ? interior.propColor : RatLand.TILE_COLORS[tile];
      ctx.fillRect(offsetX + col * ts, offsetY + row * ts, ts, ts);
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
  ctx.fillText(interior.title, viewW / 2, Math.max(24, offsetY - 12));

  RatLand.drawRat(ctx, offsetX + game.player.x, offsetY + game.player.y, game.player.size, '#9a9a9a', game.player.facing);
};
