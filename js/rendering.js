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
};
RatLand.assets.mossy.src = 'assets/tile-mossy-damp.png';
RatLand.assets.brick.src = 'assets/tile-cracked-brick.png';

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
RatLand.drawRat = function (ctx, x, y, size, color, facing) {
  var cx = x + size / 2;
  var cy = y + size / 2;
  var r = size / 2;

  var tailDX = facing === 'left' ? 1 : facing === 'right' ? -1 : 0;
  var tailDY = facing === 'up' ? 1 : facing === 'down' ? -1 : 0;
  if (tailDX === 0 && tailDY === 0) tailDY = 1;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + tailDX * r * 1.6, cy + tailDY * r * 1.6);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - r * 0.5, cy - r * 0.6, r * 0.28, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.5, cy - r * 0.6, r * 0.28, 0, Math.PI * 2);
  ctx.fill();

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

RatLand.render = function (ctx, game, viewW, viewH) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, viewW, viewH);

  if (game.mode === 'overworld') {
    RatLand.renderOverworld(ctx, game, viewW, viewH);
  } else {
    RatLand.renderInterior(ctx, game, viewW, viewH);
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
      // Worn paths keep their grimy tint layered on top of the brick texture.
      if (tile === TILE.PATH_WORN) {
        ctx.fillStyle = 'rgba(55, 40, 20, 0.35)';
        ctx.fillRect(col * ts, row * ts, ts, ts);
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

  var crier = RatLand.townCrier;
  var crierX = crier.col * ts, crierY = crier.row * ts;
  RatLand.drawRat(ctx, crierX, crierY, ts, crier.color, 'down');
  RatLand.drawLabel(ctx, crier.name, crierX + ts / 2, crierY - 4);

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
