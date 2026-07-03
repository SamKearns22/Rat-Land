// main.js — wires map/player/npc/rendering/transitions together and runs the loop.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dialogueBox = document.getElementById('dialogue-box');
  var dialogueName = document.getElementById('dialogue-name');
  var dialogueText = document.getElementById('dialogue-text');

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
  };
  RatLand.game = game;

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
      isSolidFn = RatLand.isSolidOverworldTile;
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

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
