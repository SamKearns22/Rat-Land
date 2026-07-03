// save.js — localStorage persistence: player position, current map,
// Reputation, and (for later) unlocked combat moves.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.SAVE_KEY = 'ratland_save_v1';

// The exact shape written to localStorage. `version` exists so a future
// save-format change has something to branch on; `unlockedMoves` is empty
// until combat exists, but the slot is here now so saves don't need a
// migration once it isn't.
RatLand.buildSaveData = function (game) {
  return {
    version: 1,
    savedAt: Date.now(),
    mode: game.mode,
    currentInteriorId: game.currentInteriorId,
    returnTile: game.returnTile,
    player: {
      x: game.player.x,
      y: game.player.y,
      facing: game.player.facing,
    },
    reputation: game.reputation,
    unlockedMoves: game.unlockedMoves,
  };
};

RatLand.saveGame = function (game) {
  try {
    localStorage.setItem(RatLand.SAVE_KEY, JSON.stringify(RatLand.buildSaveData(game)));
    return true;
  } catch (e) {
    // Private browsing / storage disabled / quota exceeded -- saving just
    // silently no-ops rather than breaking the game.
    return false;
  }
};

RatLand.loadSaveData = function () {
  try {
    var raw = localStorage.getItem(RatLand.SAVE_KEY);
    if (!raw) return null;
    var data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch (e) {
    return null;
  }
};

// Applies loaded save data onto a live game object. Missing/malformed
// fields fall back to the game's current (default) values instead of
// throwing, so a corrupted or partial save degrades gracefully.
RatLand.applySaveData = function (game, data) {
  if (!data) return;

  if (data.player) {
    if (typeof data.player.x === 'number') game.player.x = data.player.x;
    if (typeof data.player.y === 'number') game.player.y = data.player.y;
    if (typeof data.player.facing === 'string') game.player.facing = data.player.facing;
  }

  game.mode = data.mode === 'interior' ? 'interior' : 'overworld';
  game.currentInteriorId = (game.mode === 'interior' && RatLand.INTERIORS[data.currentInteriorId])
    ? data.currentInteriorId
    : null;
  game.returnTile = (data.returnTile && typeof data.returnTile.col === 'number' && typeof data.returnTile.row === 'number')
    ? { col: data.returnTile.col, row: data.returnTile.row }
    : null;

  // A save claiming "interior" mode with no valid interior id is corrupt;
  // fall back to the overworld rather than rendering a broken room.
  if (game.mode === 'interior' && !game.currentInteriorId) game.mode = 'overworld';

  game.reputation = typeof data.reputation === 'number' ? data.reputation : 0;
  game.unlockedMoves = Array.isArray(data.unlockedMoves) ? data.unlockedMoves : [];
};

// Clears the save and resets a live game object back to a fresh start.
RatLand.resetSave = function (game) {
  try {
    localStorage.removeItem(RatLand.SAVE_KEY);
  } catch (e) {
    // ignore -- nothing to clear if storage isn't available
  }

  var spawn = RatLand.createPlayer(5, 6);
  game.player.x = spawn.x;
  game.player.y = spawn.y;
  game.player.facing = 'down';
  game.mode = 'overworld';
  game.currentInteriorId = null;
  game.returnTile = null;
  game.reputation = 0;
  game.unlockedMoves = [];
};
