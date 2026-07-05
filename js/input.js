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

// JS-level zoom guards, layered on top of style.css's touch-action
// coverage (see the comment there for the real-device bug this pair
// fixes): iOS Safari ignores user-scalable=no/maximum-scale=1 in the
// viewport meta tag (deliberate accessibility override since iOS 10),
// and touch-action alone doesn't cover every gesture path on every iOS
// version -- so pinch (gesture* events are WebKit-specific and exactly
// the right hook there; harmless no-ops elsewhere), multi-touch drags,
// and double-tap smart zoom each get blocked directly. The double-tap
// guard only preventDefaults the SECOND tap of a rapid pair, so single
// taps still produce clicks (Reset Save's confirm() flow relies on
// click); all gameplay controls are pointerdown-driven and fire before
// touchend regardless, so rapid double-tapping a move button -- the
// select-then-confirm flow itself -- keeps working identically.
RatLand.initZoomGuards = function () {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    window.addEventListener(type, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1 && e.cancelable) e.preventDefault();
  }, { passive: false });
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd < 350 && e.cancelable) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
};

// Talk to whichever NPC (Town Crier or any of the 31 NPC_ROSTER
// characters) is adjacent, otherwise close any open dialogue. Fightable
// NPCs (see RatLand.NPC_ROSTER's `fightable` flag) open the Talk/Debate
// menu instead of going straight to dialogue (COMBAT_DESIGN.md §8).
RatLand.onInteractPressed = function () {
  var game = RatLand.game;
  if (!game) return;
  // Menu/battle selection is handled by their own dedicated buttons, not
  // this Talk button, while any of them is open.
  if (game.mode === 'battle-menu' || game.mode === 'battle-opinion' || game.mode === 'battle') return;
  if (game.mode !== 'overworld') return;

  var ts = RatLand.TILE_SIZE;
  var col = Math.floor((game.player.x + game.player.size / 2) / ts);
  var row = Math.floor((game.player.y + game.player.size / 2) / ts);

  var target = RatLand.findTalkTarget(col, row);
  if (target) {
    if (target.pairId) {
      // Linked conversational pair (e.g. Nora & Barry): one shared
      // exchange, advanced and alternated regardless of which of the two
      // NPCs the player is actually standing next to.
      var line = RatLand.getPairLine(target.pairId);
      RatLand.showDialogue(line.speakerName, line.text);
    } else if (target.fightable) {
      RatLand.openPreBattleMenu(game, target);
    } else {
      RatLand.showDialogue(target.name, RatLand.getNpcLine(target));
    }
  } else {
    RatLand.hideDialogue();
  }
};
