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
// and tap-burst smart zoom each get blocked directly.
//
// Two hard-won details from real-device reports:
//
// 1. Smart zoom triggers on TRIPLE/QUADRUPLE tap bursts, not just neat
//    tap pairs -- an earlier version of this guard only preventDefaulted
//    the second tap of a rapid pair, which still let a longer burst
//    present iOS with a clean unprevented pair. Every touchend is now
//    preventDefaulted instead, so no tap pair ever exists for smart
//    zoom to latch onto, no matter the burst length or rhythm. The one
//    exception is the top-right HUD cluster: Reset Save is the single
//    control in the game driven by a native `click` (its confirm()
//    flow), and preventDefault on touchend is exactly what suppresses
//    click synthesis. Everything gameplay-critical (D-pad, Talk, move
//    buttons, dialogue cancel/pagination, mute) is pointerdown-driven,
//    and pointer events are not suppressed by touchend preventDefault
//    (only the mouse-compatibility click path is), so rapid
//    double/triple-tapping a move button -- the select-then-confirm
//    flow itself -- keeps working identically.
//
// 2. Every guard stands down while the page is ALREADY zoomed
//    (visualViewport.scale > 1): the same gestures being blocked here
//    are the only way iOS lets a user ESCAPE a zoom (pinch out /
//    double-tap out). Blocking them unconditionally would turn an
//    accidentally-zoomed page -- e.g. one zoomed before this guard
//    shipped, or via any path that still slips through -- into a trap
//    with a reload as the only way out. At scale 1 nothing is lost by
//    blocking, and above scale 1 nothing is gained.
RatLand.initZoomGuards = function () {
  function atNormalZoom() {
    return !window.visualViewport || !window.visualViewport.scale || window.visualViewport.scale <= 1.001;
  }

  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (atNormalZoom()) e.preventDefault();
    }, { passive: false });
  });

  document.addEventListener('touchmove', function (e) {
    if (atNormalZoom() && e.touches && e.touches.length > 1 && e.cancelable) e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchend', function (e) {
    if (!atNormalZoom() || !e.cancelable) return;
    var t = e.target;
    if (t && t.closest && t.closest('#hud-top-right')) return; // Reset Save's click flow
    e.preventDefault();
  }, { passive: false });

  // macOS/iPadOS trackpad smart zoom arrives as dblclick rather than a
  // touch sequence; same conditional stand-down applies.
  window.addEventListener('dblclick', function (e) {
    if (atNormalZoom()) e.preventDefault();
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
      RatLand.showDialogue(line.speakerName, line.text, target);
    } else if (target.fightable) {
      RatLand.openPreBattleMenu(game, target);
    } else {
      RatLand.showDialogue(target.name, RatLand.getNpcLine(target), target);
    }
  } else {
    RatLand.hideDialogue();
  }
};
