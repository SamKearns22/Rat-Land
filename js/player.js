// player.js — player state, movement, and tile collision.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.createPlayer = function (tileCol, tileRow) {
  var ts = RatLand.TILE_SIZE;
  var size = 22;
  return {
    x: tileCol * ts + (ts - size) / 2,
    y: tileRow * ts + (ts - size) / 2,
    size: size,
    speed: 140, // px/sec
    facing: 'down',
    moving: false,
  };
};

// Checks whether a size x size box at (x, y) overlaps any solid tile,
// using the supplied isSolidFn(col, row) for the current mode (overworld/interior).
RatLand.checkCollision = function (x, y, size, isSolidFn) {
  var ts = RatLand.TILE_SIZE;
  var corners = [
    [x, y],
    [x + size - 1, y],
    [x, y + size - 1],
    [x + size - 1, y + size - 1],
  ];
  for (var i = 0; i < corners.length; i++) {
    var col = Math.floor(corners[i][0] / ts);
    var row = Math.floor(corners[i][1] / ts);
    if (isSolidFn(col, row)) return true;
  }
  return false;
};

RatLand.updatePlayer = function (player, input, dt, isSolidFn) {
  var dx = 0, dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    var len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    if (dx < 0) player.facing = 'left';
    else if (dx > 0) player.facing = 'right';
    else if (dy < 0) player.facing = 'up';
    else if (dy > 0) player.facing = 'down';
  }

  var moveX = dx * player.speed * dt;
  var moveY = dy * player.speed * dt;

  if (moveX !== 0) {
    var newX = player.x + moveX;
    if (!RatLand.checkCollision(newX, player.y, player.size, isSolidFn)) {
      player.x = newX;
    }
  }
  if (moveY !== 0) {
    var newY = player.y + moveY;
    if (!RatLand.checkCollision(player.x, newY, player.size, isSolidFn)) {
      player.y = newY;
    }
  }
};
