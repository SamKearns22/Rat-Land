// rendering.js — canvas drawing: camera, tiles, locations, rat sprites, labels.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.createCamera = function () {
  return { x: 0, y: 0 };
};

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

  var startCol = Math.max(0, Math.floor(cam.x / ts));
  var endCol = Math.min(RatLand.OVERWORLD_COLS - 1, Math.ceil((cam.x + viewW) / ts));
  var startRow = Math.max(0, Math.floor(cam.y / ts));
  var endRow = Math.min(RatLand.OVERWORLD_ROWS - 1, Math.ceil((cam.y + viewH) / ts));

  for (var row = startRow; row <= endRow; row++) {
    for (var col = startCol; col <= endCol; col++) {
      var tile = RatLand.overworldGrid[row][col];
      ctx.fillStyle = RatLand.TILE_COLORS[tile];
      ctx.fillRect(Math.round(col * ts - cam.x), Math.round(row * ts - cam.y), ts, ts);
    }
  }

  RatLand.LOCATIONS.forEach(function (loc) {
    var sx = loc.col * ts - cam.x;
    var sy = loc.row * ts - cam.y;
    if (sx < -ts || sy < -ts || sx > viewW || sy > viewH) return;
    ctx.fillStyle = loc.color;
    ctx.fillRect(Math.round(sx), Math.round(sy), ts, ts);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, ts - 1, ts - 1);
    RatLand.drawLabel(ctx, loc.name, sx + ts / 2, sy - 4);
  });

  var crier = RatLand.townCrier;
  var crierX = crier.col * ts - cam.x;
  var crierY = crier.row * ts - cam.y;
  RatLand.drawRat(ctx, crierX, crierY, ts, crier.color, 'down');
  RatLand.drawLabel(ctx, crier.name, crierX + ts / 2, crierY - 4);

  RatLand.drawRat(ctx, game.player.x - cam.x, game.player.y - cam.y, game.player.size, '#9a9a9a', game.player.facing);
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
