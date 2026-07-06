// tests/check-dialogue-layout.js
//
// Permanent regression check for the dialogue-box layout contract
// established after a real-device report (dialogue box covering the
// player's avatar mid-screen):
//
//   1. The box's height never exceeds one third of the viewport.
//   2. The on-screen controls (D-pad, Talk) sit fully BELOW the box.
//   3. The player sprite AND the NPC being talked to render fully ABOVE
//      the box's top edge -- checked at map locations covering all
//      three camera regimes, since each fails differently:
//        - north clamp (camera pinned at y=0, sprite above center),
//        - mid-map (camera centered on the player -- the canonical case),
//        - south clamp (camera over-scrolls past the world bottom by
//          the UI band, js/rendering.js CAMERA_BOTTOM_UI_BAND -- without
//          that band, south-bank sprites sat behind the controls and no
//          box sizing could fix it).
//   4. Crazy Joe's three lines still split to exactly 3 pages under the
//      current DIALOGUE_MAX_CHARS_PER_PAGE (his roster entry is
//      calibrated to the budget; a budget change without retrimming his
//      lines breaks the pagination demo this character exists for).
//   5. A short line still gets NO pagination row (the min-height /
//      always-reserved-space regression class).
//
// Usage: start a static server first (python3 -m http.server 8809 from
// the repo root), then: node tests/check-dialogue-layout.js [baseUrl]

function loadPlaywright() {
  try { return require('playwright'); }
  catch (e) { return require('/opt/node22/lib/node_modules/playwright'); }
}
function chromiumLaunchOptions() {
  const fs = require('fs');
  const p = '/opt/pw-browsers/chromium';
  return fs.existsSync(p) ? { executablePath: p } : {};
}

const BASE_URL = process.argv[2] || 'http://localhost:8809';
let anyFailure = false;
function assert(cond, label) {
  console.log((cond ? 'PASS' : 'FAIL') + ` [${label}]`);
  if (!cond) anyFailure = true;
}

// One spot per camera regime + the dedicated multi-page character.
const SPOTS = [
  { id: 'nutkin', label: 'north-clamp (Nutkin)' },
  { id: 'drainwatcher', label: 'mid-map centered (Drain-Watcher)' },
  { id: 'dredge', label: 'south-clamp (Dredge)' },
  { id: 'crazyjoe', label: 'multi-page (Crazy Joe)' },
];

async function measureSpot(page, id) {
  await page.evaluate((npcId) => {
    const g = window.RatLand.game;
    const npc = window.RatLand.NPC_ROSTER.find((n) => n.id === npcId);
    g.player.x = npc.col * 32 + (32 - g.player.size) / 2;
    g.player.y = (npc.row + 1) * 32 + (32 - g.player.size) / 2;
    window.RatLand.hideDialogue();
  }, id);
  await page.waitForTimeout(200); // camera settles
  await page.evaluate(() => window.RatLand.onInteractPressed());
  await page.waitForTimeout(200);
  return page.evaluate((npcId) => {
    const g = window.RatLand.game;
    const zoom = window.RatLand.CAMERA_ZOOM;
    const npc = window.RatLand.NPC_ROSTER.find((n) => n.id === npcId);
    const pCenterY = g.player.y + g.player.size / 2;
    const box = document.getElementById('dialogue-box').getBoundingClientRect();
    const dpad = document.getElementById('dpad').getBoundingClientRect();
    const talk = document.getElementById('btn-interact').getBoundingClientRect();
    return {
      H: window.innerHeight,
      boxTop: box.top, boxBottom: box.bottom, boxHeight: box.height,
      playerBottom: (pCenterY + 16 - g.camera.y) * zoom, // 32px-tall rat sprite (rat.png), centered on the player box
      npcBottom: (npc.row * 32 + 32 - g.camera.y) * zoom, // NPC tile's bottom edge (worst case)
      dpadTop: dpad.top, talkTop: talk.top,
      visible: document.getElementById('dialogue-box').classList.contains('visible'),
    };
  }, id);
}

async function run() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(chromiumLaunchOptions());

  for (const size of [{ w: 390, h: 844 }, { w: 375, h: 812 }]) {
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h } });
    await page.goto(BASE_URL + '/index.html');
    await page.waitForTimeout(300);
    const tag = `${size.w}x${size.h}`;

    for (const spot of SPOTS) {
      const m = await measureSpot(page, spot.id);
      assert(m.visible, `${tag} / ${spot.label}: dialogue actually opened`);
      assert(m.boxHeight <= m.H / 3 + 0.5,
        `${tag} / ${spot.label}: box height ${m.boxHeight.toFixed(1)}px <= viewport/3 (${(m.H / 3).toFixed(1)}px)`);
      assert(m.playerBottom < m.boxTop,
        `${tag} / ${spot.label}: player sprite bottom (${m.playerBottom.toFixed(1)}) above box top (${m.boxTop.toFixed(1)})`);
      assert(m.npcBottom < m.boxTop,
        `${tag} / ${spot.label}: NPC tile bottom (${m.npcBottom.toFixed(1)}) above box top (${m.boxTop.toFixed(1)})`);
      assert(m.dpadTop >= m.boxBottom && m.talkTop >= m.boxBottom,
        `${tag} / ${spot.label}: D-pad top (${m.dpadTop.toFixed(1)}) and Talk top (${m.talkTop.toFixed(1)}) below box bottom (${m.boxBottom.toFixed(1)})`);
    }

    // Crazy Joe: exactly 3 pages per line, page indicator/arrows sane.
    await measureSpot(page, 'crazyjoe');
    for (let line = 0; line < 3; line++) {
      const ind = await page.evaluate(() => document.getElementById('dialogue-page-indicator').textContent);
      assert(ind === '1/3', `${tag} / Joe line ${line}: opens at exactly "1/3" (got "${ind}")`);
      // advance to the end
      for (let p = 0; p < 2; p++) {
        await page.evaluate(() => document.getElementById('dialogue-page-next').dispatchEvent(new Event('pointerdown', { bubbles: true })));
        await page.waitForTimeout(60);
      }
      const last = await page.evaluate(() => ({
        ind: document.getElementById('dialogue-page-indicator').textContent,
        nextVis: getComputedStyle(document.getElementById('dialogue-page-next')).visibility,
      }));
      assert(last.ind === '3/3' && last.nextVis === 'hidden',
        `${tag} / Joe line ${line}: ends at "3/3" with next hidden (got "${last.ind}", ${last.nextVis})`);
      // next Talk press -> next line
      await page.evaluate(() => window.RatLand.onInteractPressed());
      await page.waitForTimeout(120);
    }

    // Short line: no pagination row, compact box.
    await page.evaluate(() => {
      const g = window.RatLand.game;
      const crier = window.RatLand.townCrier;
      g.player.x = crier.col * 32; g.player.y = (crier.row + 1) * 32;
      window.RatLand.hideDialogue();
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.RatLand.onInteractPressed());
    await page.waitForTimeout(150);
    const shortState = await page.evaluate(() => ({
      pag: getComputedStyle(document.getElementById('dialogue-pagination')).display,
      h: document.getElementById('dialogue-box').getBoundingClientRect().height,
    }));
    assert(shortState.pag === 'none' && shortState.h < 120,
      `${tag} / short line: no pagination row, compact box (${shortState.h.toFixed(1)}px)`);

    // South-edge over-scroll must never expose empty canvas background.
    // The camera's south-edge UI band (js/rendering.js
    // CAMERA_BOTTOM_UI_BAND) intentionally scrolls past the point where
    // the map's real bottom row fills the screen, so a south-bank NPC's
    // sprite still clears the dialogue box -- but the DRAW loop has to
    // keep painting (phantom wall-textured rows) that whole exposed
    // strip, or it's a flat #111 void. Checked at the deepest walkable
    // row directly, not just at an existing NPC's position, since the
    // void is a function of camera geometry, not of any particular NPC.
    await page.evaluate(() => {
      const g = window.RatLand.game;
      const ts = window.RatLand.TILE_SIZE;
      window.RatLand.hideDialogue();
      g.player.x = 16 * ts;
      g.player.y = (window.RatLand.OVERWORLD_ROWS - 2) * ts; // deepest walkable row
    });
    await page.waitForTimeout(250);
    const voidCheck = await page.evaluate(() => {
      const canvas = document.getElementById('game');
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      const y = h - 3;
      const data = ctx.getImageData(0, y, w, 1).data;
      const bg = { r: 0x11, g: 0x11, b: 0x11 };
      for (let x = 0; x < w; x += 5) {
        const i = x * 4;
        if (Math.abs(data[i] - bg.r) > 4 || Math.abs(data[i + 1] - bg.g) > 4 || Math.abs(data[i + 2] - bg.b) > 4) {
          return { isVoid: false };
        }
      }
      return { isVoid: true };
    });
    assert(!voidCheck.isVoid,
      `${tag} / south-edge over-scroll: bottom canvas strip is real tile content, not the plain background fill`);

    await page.close();
  }

  await browser.close();
  console.log('');
  console.log(anyFailure
    ? 'RESULT: FAIL -- dialogue layout contract violated. See failures above.'
    : 'RESULT: PASS -- box <= 1/3 viewport, player+NPC visible above it, controls below it, in all camera regimes.');
  process.exitCode = anyFailure ? 1 : 0;
}

run().catch((e) => { console.error('FATAL:', e); process.exitCode = 1; });
