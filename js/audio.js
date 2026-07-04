// audio.js — battle sound effects and the mute toggle.
//
// The four clips in assets/sfx/ are locally-synthesized PLACEHOLDERS (see
// gen_sfx note in the commit that added them) standing in for specific
// files from the free CC0 "80 CC0 RPG SFX" pack (opengameart.org/content/
// 80-cc0-rpg-sfx) that this environment couldn't fetch (network policy
// blocks that host). Swap the four .wav files for the real pack's
// "hurt" / "book"(page-flip) / "spell" / "spell(fire)" files whenever
// they're available — the filenames and trigger wiring below don't need
// to change.
var RatLand = window.RatLand || {};
window.RatLand = RatLand;

(function () {
  var SFX_FILES = {
    rhetoric: 'assets/sfx/rhetoric.wav', // "hurt" category
    consideration: 'assets/sfx/consideration.wav', // "book"/page-flip category
    fact: 'assets/sfx/fact.wav', // "spell" (non-fire) category
    feeling: 'assets/sfx/feeling.wav', // "spell (fire)" category
  };

  var MUTE_KEY = 'ratland_audio_muted';

  RatLand.audio = {};
  Object.keys(SFX_FILES).forEach(function (key) {
    var el = new Audio(SFX_FILES[key]);
    el.preload = 'auto';
    RatLand.audio[key] = el;
  });

  function loadMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  RatLand.audioMuted = loadMuted();

  function saveMuted() {
    try {
      localStorage.setItem(MUTE_KEY, RatLand.audioMuted ? '1' : '0');
    } catch (e) {
      // ignore -- nothing to persist if storage isn't available
    }
  }

  // Plays a short SFX by key ('rhetoric' | 'consideration' | 'fact' |
  // 'feeling'), restarting it from the top if it's still playing from a
  // very recent trigger. Silently no-ops if muted, the key is unknown, or
  // playback fails for any reason (e.g. autoplay restrictions) -- sound
  // is flavor, never something a move's resolution should be blocked on.
  RatLand.playSfx = function (key) {
    if (RatLand.audioMuted) return;
    var el = RatLand.audio[key];
    if (!el) return;
    try {
      el.currentTime = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {
      // ignore
    }
  };

  function updateMuteButton() {
    var btn = document.getElementById('mute-toggle');
    if (!btn) return;
    btn.textContent = RatLand.audioMuted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', RatLand.audioMuted ? 'Unmute sound' : 'Mute sound');
  }

  RatLand.initAudioToggle = function () {
    updateMuteButton();
    var btn = document.getElementById('mute-toggle');
    if (!btn) return;
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      RatLand.audioMuted = !RatLand.audioMuted;
      saveMuted();
      updateMuteButton();
    });
  };
})();
