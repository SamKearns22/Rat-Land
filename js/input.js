// input.js — keyboard (arrow keys / WASD) and on-screen touch controls.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

RatLand.input = { up: false, down: false, left: false, right: false };

RatLand.initKeyboard = function () {
  var keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  };
  var interactKeys = { Space: true, Enter: true, KeyE: true };

  window.addEventListener('keydown', function (e) {
    var dir = keyMap[e.code];
    if (dir) {
      RatLand.input[dir] = true;
      e.preventDefault();
    } else if (interactKeys[e.code] && !e.repeat) {
      RatLand.onInteractPressed();
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', function (e) {
    var dir = keyMap[e.code];
    if (dir) {
      RatLand.input[dir] = false;
      e.preventDefault();
    }
  });
};

RatLand.initTouchControls = function () {
  function bindHold(id, dir) {
    var el = document.getElementById(id);
    if (!el) return;
    var setTrue = function (e) { RatLand.input[dir] = true; e.preventDefault(); };
    var setFalse = function (e) { RatLand.input[dir] = false; if (e) e.preventDefault(); };
    el.addEventListener('pointerdown', setTrue);
    el.addEventListener('pointerup', setFalse);
    el.addEventListener('pointerleave', setFalse);
    el.addEventListener('pointercancel', setFalse);
  }

  bindHold('btn-up', 'up');
  bindHold('btn-down', 'down');
  bindHold('btn-left', 'left');
  bindHold('btn-right', 'right');

  var interactBtn = document.getElementById('btn-interact');
  if (interactBtn) {
    interactBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      RatLand.onInteractPressed();
    });
  }
};

// Talk to whichever NPC (Town Crier or any of the 31 NPC_ROSTER
// characters) is adjacent, otherwise close any open dialogue. Fightable
// NPCs (see RatLand.NPC_ROSTER's `fightable` flag) open the Talk/Fight/
// Walk Away menu instead of going straight to dialogue (COMBAT_DESIGN.md §8).
RatLand.onInteractPressed = function () {
  var game = RatLand.game;
  if (!game) return;
  // Menu/battle selection is handled by their own dedicated buttons, not
  // this Talk button, while either is open.
  if (game.mode === 'battle-menu' || game.mode === 'battle') return;
  if (game.mode !== 'overworld') return;

  var ts = RatLand.TILE_SIZE;
  var col = Math.floor((game.player.x + game.player.size / 2) / ts);
  var row = Math.floor((game.player.y + game.player.size / 2) / ts);

  var target = RatLand.findTalkTarget(col, row);
  if (target) {
    if (target.fightable) {
      RatLand.openPreBattleMenu(game, target);
    } else {
      RatLand.showDialogue(target.name, RatLand.getNpcLine(target));
    }
  } else {
    RatLand.hideDialogue();
  }
};
