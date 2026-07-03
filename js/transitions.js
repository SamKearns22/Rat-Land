// transitions.js — entering/exiting interiors as the player walks around.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.checkTransitions = function (game) {
  var ts = RatLand.TILE_SIZE;
  var cx = game.player.x + game.player.size / 2;
  var cy = game.player.y + game.player.size / 2;
  var col = Math.floor(cx / ts);
  var row = Math.floor(cy / ts);

  if (game.mode === 'overworld') {
    var loc = RatLand.locationAt(col, row);
    if (loc && loc.hasInterior) {
      RatLand.enterInterior(game, loc);
    }
  } else if (game.mode === 'interior') {
    var interior = RatLand.INTERIORS[game.currentInteriorId];
    if (col === interior.doorCol && row === interior.doorRow) {
      RatLand.exitInterior(game);
    }
  }
};

RatLand.enterInterior = function (game, loc) {
  var interior = RatLand.INTERIORS[loc.interiorId];
  var ts = RatLand.TILE_SIZE;

  game.mode = 'interior';
  game.currentInteriorId = loc.interiorId;
  // Where to place the player when they later walk back out.
  game.returnTile = { col: loc.col, row: loc.row + 1 };

  // Spawn just inside the door, facing into the room.
  game.player.x = interior.doorCol * ts + (ts - game.player.size) / 2;
  game.player.y = (interior.doorRow - 1) * ts + (ts - game.player.size) / 2;
  game.player.facing = 'up';

  RatLand.hideDialogue();
  RatLand.saveGame(game);
};

RatLand.exitInterior = function (game) {
  var ts = RatLand.TILE_SIZE;
  var tile = game.returnTile || { col: 6, row: 6 };

  game.mode = 'overworld';
  game.currentInteriorId = null;
  game.player.x = tile.col * ts + (ts - game.player.size) / 2;
  game.player.y = tile.row * ts + (ts - game.player.size) / 2;
  game.player.facing = 'down';

  RatLand.saveGame(game);
};
