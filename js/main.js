// main.js — wires map/player/npc/rendering/transitions together and runs the loop.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dialogueBox = document.getElementById('dialogue-box');
  var dialogueName = document.getElementById('dialogue-name');
  var dialogueText = document.getElementById('dialogue-text');
  var reputationEl = document.getElementById('reputation');
  var resetSaveBtn = document.getElementById('reset-save');

  RatLand.showDialogue = function (name, text) {
    dialogueName.textContent = name;
    dialogueText.textContent = text;
    dialogueBox.classList.add('visible');
  };

  RatLand.hideDialogue = function () {
    dialogueBox.classList.remove('visible');
  };

  var game = {
    mode: 'overworld', // 'overworld' | 'interior'
    currentInteriorId: null,
    returnTile: null,
    player: RatLand.createPlayer(5, 6),
    camera: RatLand.createCamera(),
    reputation: 0,
    unlockedMoves: [], // combat comes later; the save format already carries this
  };
  RatLand.game = game;

  function updateReputationDisplay() {
    if (reputationEl) reputationEl.textContent = 'Reputation: ' + game.reputation;
  }

  // Load automatically on page open. A missing/corrupt save just leaves
  // the freshly-created defaults above in place.
  RatLand.applySaveData(game, RatLand.loadSaveData());
  updateReputationDisplay();

  if (resetSaveBtn) {
    resetSaveBtn.addEventListener('click', function () {
      if (window.confirm('Reset your save? This clears your position, Reputation, and unlocked moves.')) {
        RatLand.resetSave(game);
        RatLand.hideDialogue();
        updateReputationDisplay();
      }
    });
  }

  // Auto-save every 30 seconds, in addition to the transition-triggered
  // saves in transitions.js.
  window.setInterval(function () { RatLand.saveGame(game); }, 30000);
  // Best-effort save if the tab closes between 30-second ticks.
  window.addEventListener('pagehide', function () { RatLand.saveGame(game); });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  resizeCanvas();

  RatLand.initKeyboard();
  RatLand.initTouchControls();

  var lastTime = null;

  function frame(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    var dt = Math.min(0.05, (timestamp - lastTime) / 1000); // clamp to avoid big jumps on tab switch
    lastTime = timestamp;

    var isSolidFn;
    if (game.mode === 'overworld') {
      isSolidFn = RatLand.isOverworldBlocked;
    } else {
      var interior = RatLand.INTERIORS[game.currentInteriorId];
      isSolidFn = function (col, row) { return RatLand.isSolidInteriorTile(interior, col, row); };
    }

    RatLand.updatePlayer(game.player, RatLand.input, dt, isSolidFn);
    RatLand.checkTransitions(game);

    if (game.mode === 'overworld') {
      RatLand.updateCamera(game.camera, game.player, canvas.width, canvas.height);
    }

    RatLand.render(ctx, game, canvas.width, canvas.height);
    updateReputationDisplay();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
