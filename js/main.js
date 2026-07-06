// main.js — wires map/player/npc/rendering/transitions together and runs the loop.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var dialogueBox = document.getElementById('dialogue-box');
  var dialogueName = document.getElementById('dialogue-name');
  var dialogueText = document.getElementById('dialogue-text');
  var dialoguePagination = document.getElementById('dialogue-pagination');
  var dialoguePagePrev = document.getElementById('dialogue-page-prev');
  var dialoguePageNext = document.getElementById('dialogue-page-next');
  var dialoguePageIndicator = document.getElementById('dialogue-page-indicator');
  var dialogueCancelBtn = document.getElementById('dialogue-cancel');
  var reputationEl = document.getElementById('reputation');
  var resetSaveBtn = document.getElementById('reset-save');

  // --- Dialogue pagination (strictly for one line too long to fit in the
  // box) -------------------------------------------------------------
  // Deliberately separate from RatLand.getNpcLine/getPairLine, which
  // cycle between an NPC's different lines each time Talk is pressed --
  // this only ever splits whatever single line is currently showing.
  // Word-wrap greedy split at a fixed character budget: no live DOM
  // measurement (font/box width can vary by device), just a budget
  // picked to comfortably wrap within the box at every supported width.
  // Crazy Joe (js/npc.js) is the standing regression check -- each of
  // his three lines is sized to land at exactly 3 pages under this
  // budget, exercising the prev-hidden/both-shown/next-hidden states.
  // 140 (was 240): a page must never exceed ~3.5 wrapped lines (~72px)
  // so the box's total height stays small enough to sit fully below the
  // camera-centered player sprite and fully above the lowered D-pad --
  // see style.css's dialogue-layout comments for the stacked math. A
  // side effect worth knowing: NPC lines between 141 and 240 characters
  // (several exist) now paginate where they used to fit one page.
  var DIALOGUE_MAX_CHARS_PER_PAGE = 140;

  function paginateDialogueText(text) {
    var words = text.split(' ');
    var pages = [];
    var current = '';
    words.forEach(function (w) {
      var candidate = current ? current + ' ' + w : w;
      if (candidate.length > DIALOGUE_MAX_CHARS_PER_PAGE && current) {
        pages.push(current);
        current = w;
      } else {
        current = candidate;
      }
    });
    pages.push(current);
    return pages;
  }

  var dialoguePages = [''];
  var dialoguePageIndex = 0;

  function renderDialoguePage() {
    dialogueText.textContent = dialoguePages[dialoguePageIndex];
    var multiPage = dialoguePages.length > 1;
    // Reserves the pagination row's height (style.css) only while actually
    // paginated, so an ordinary one-line NPC exchange keeps sizing tightly
    // to its content instead of always reserving room for a control row
    // most lines never use.
    dialogueBox.classList.toggle('multi-page', multiPage);
    if (dialoguePagination) dialoguePagination.style.display = multiPage ? 'flex' : 'none';
    if (dialoguePageIndicator) {
      dialoguePageIndicator.textContent = multiPage ? (dialoguePageIndex + 1) + '/' + dialoguePages.length : '';
    }
    if (dialoguePagePrev) dialoguePagePrev.style.visibility = dialoguePageIndex > 0 ? 'visible' : 'hidden';
    if (dialoguePageNext) {
      dialoguePageNext.style.visibility = dialoguePageIndex < dialoguePages.length - 1 ? 'visible' : 'hidden';
    }
  }

  RatLand.showDialogue = function (name, text) {
    dialogueName.textContent = name;
    dialoguePages = paginateDialogueText(text);
    dialoguePageIndex = 0;
    renderDialoguePage();
    dialogueBox.classList.add('visible');
  };

  RatLand.hideDialogue = function () {
    dialogueBox.classList.remove('visible');
  };

  RatLand.dialogueNextPage = function () {
    if (dialoguePageIndex >= dialoguePages.length - 1) return;
    dialoguePageIndex++;
    renderDialoguePage();
  };

  RatLand.dialoguePrevPage = function () {
    if (dialoguePageIndex <= 0) return;
    dialoguePageIndex--;
    renderDialoguePage();
  };

  if (dialoguePagePrev) {
    dialoguePagePrev.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      RatLand.dialoguePrevPage();
    });
  }
  if (dialoguePageNext) {
    dialoguePageNext.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      RatLand.dialogueNextPage();
    });
  }
  // Closes the dialogue outright, without needing to walk away first.
  // Lives inside #dialogue-box, governed only by its own .visible
  // toggle -- deliberately not folded into style.css's "hide #controls
  // while an overlay is open" rule, since that rule's whole purpose is
  // to NOT touch dialogue (a prior fix: hiding the D-pad/Talk button
  // while ordinary dialogue was open removed a touch-only player's only
  // way to close it, since dialogue doesn't freeze game.mode). Same
  // principle applies here in reverse -- this button must stay reachable
  // exactly when dialogue-box is visible, nothing more, nothing less.
  if (dialogueCancelBtn) {
    dialogueCancelBtn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      RatLand.hideDialogue();
    });
  }

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

  // Mobile Safari (and some other mobile browsers) can let the *layout*
  // viewport (window.innerWidth/innerHeight) diverge from the actual
  // *visible* area -- while the dynamic address-bar/toolbar is animating,
  // or with an on-screen keyboard open. Sizing the canvas (and everything
  // anchored to "the viewport") off innerWidth/innerHeight in that state
  // renders content wider/taller than what's actually on screen, which
  // reads as edge content being clipped. The VisualViewport API reports
  // the real visible area when available; fall back to
  // innerWidth/innerHeight on browsers without it.
  //
  // The × scale factor matters for the pinch-zoom case specifically:
  // visualViewport.width/height report the visible area in *visual* CSS
  // pixels, which SHRINK as the user pinch-zooms in (390 -> ~340 at a
  // ~15% zoom). The canvas's CSS box, though, is 100dvw/100dvh of the
  // *layout* viewport (style.css) and doesn't shrink -- so sizing the
  // backing store off the raw visual width during a zoom stretched ~340
  // backing pixels across a 390px CSS box, blurring the world and
  // scaling it up a second time on top of the OS-level zoom itself.
  // Multiplying by visualViewport.scale converts back to layout-viewport
  // units (scale is exactly 1 whenever no pinch-zoom is active, so
  // ordinary toolbar-tracking behavior is unchanged), keeping the
  // backing store matched to the box it's actually painted into no
  // matter what zoom state iOS leaves the page in. Guards in
  // style.css/input.js try to stop the zoom from ever engaging; this
  // keeps the canvas coherent if one slips through anyway.
  function viewportSize() {
    if (window.visualViewport) {
      var scale = window.visualViewport.scale || 1;
      return {
        width: window.visualViewport.width * scale,
        height: window.visualViewport.height * scale,
      };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  function resizeCanvas() {
    var size = viewportSize();
    canvas.width = size.width;
    canvas.height = size.height;
  }
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  // window's resize event doesn't reliably fire for every visualViewport
  // change (e.g. some pinch-zoom or toolbar-collapse cases) -- listen to
  // visualViewport directly too, when it exists.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
    window.visualViewport.addEventListener('scroll', resizeCanvas);
  }
  resizeCanvas();
  // visualViewport can plausibly still be settling (Safari's own
  // viewport-fit=cover geometry hasn't finished laying out yet) at the
  // exact moment this script runs synchronously on a fresh load, and if
  // nothing changes afterward (no orientation change, no pinch-zoom),
  // no later resize event ever fires to correct a bad initial read.
  // Re-checking one frame later catches that window without waiting on
  // a real viewport change; #game's CSS width/height is also now
  // explicitly capped (style.css) as the actual backstop, but correcting
  // the canvas's own intrinsic size too keeps its resolution sharp
  // rather than just visually clamped.
  window.requestAnimationFrame(resizeCanvas);

  RatLand.initKeyboard();
  RatLand.initTouchControls();
  RatLand.initZoomGuards();
  RatLand.initBattleUI();
  RatLand.initAudioToggle();

  var lastTime = null;

  function frame(timestamp) {
    if (lastTime === null) lastTime = timestamp;
    var dt = Math.min(0.05, (timestamp - lastTime) / 1000); // clamp to avoid big jumps on tab switch
    lastTime = timestamp;

    // The pre-battle menu and the battle itself freeze the overworld
    // underneath (COMBAT_DESIGN.md §8/§10) — no player movement, no
    // transitions, no camera follow, while either is open.
    if (game.mode === 'overworld' || game.mode === 'interior') {
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
    }

    RatLand.render(ctx, game, canvas.width, canvas.height);
    updateReputationDisplay();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
