// tests/check-hud-bounds.js
//
// Permanent regression check for the HUD-clipping class of bug fixed
// twice already (safe-area-inset wiring, then the #hud-top-right/#dpad
// consolidation -- see git history on style.css/index.html around those
// fixes). Verifies every fixed-position HUD element stays fully inside
// the viewport:
//   (a) at zero safe-area-inset, across the standard mobile widths this
//       project already tests at (375/390/414px) -- catches ordinary
//       CSS/layout regressions.
//   (b) under a SIMULATED non-zero safe-area-inset via Chromium's
//       Emulation.setSafeAreaInsetsOverride CDP method -- catches the
//       specific bug class (a) can never catch, since headless/emulated
//       browsers don't simulate physical device insets on their own.
// Both were required to actually reproduce the original bug; checking
// only (a) is why earlier isolated fixes didn't catch it the first time.
//
// Also walks the HUD across every game state that can be reached without
// leaving the HUD mounted (overworld, the pre-battle Talk/Debate menu,
// the Debate opinion-confirmation screen, the battle screen, and the
// battle Rules overlay), since the HUD persists across all of them and a
// future overlay could just as easily reintroduce clipping/overlap in
// one state without affecting the others.
//
// Usage: start the dev server first (`python3 -m http.server 8809` from
// the repo root, or any static server), then:
//   node tests/check-hud-bounds.js [baseUrl]
// Exits non-zero if any HUD element overflows the viewport in any
// checked condition -- safe to wire into a pre-commit/CI gate later if
// this project ever adds one.

const path = require('path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    // This environment doesn't have a local node_modules/playwright
    // (no package.json/build tooling in this project at all) -- fall
    // back to the sandbox's globally-installed copy. Adjust this path
    // (or just `npm install playwright` locally) if running elsewhere.
    return require('/opt/node22/lib/node_modules/playwright');
  }
}

function chromiumLaunchOptions() {
  const fs = require('fs');
  const sandboxChromium = '/opt/pw-browsers/chromium';
  if (fs.existsSync(sandboxChromium)) return { executablePath: sandboxChromium };
  return {};
}

const BASE_URL = process.argv[2] || 'http://localhost:8809';

// Every fixed-position (or fixed-container-child) HUD element that has
// been the subject of a clipping/overlap bug before. Add to this list
// whenever a new always-on-screen fixed element is introduced.
const HUD_SELECTORS = [
  '#hud-top-right', '#reputation', '#reset-save', '#mute-toggle', '#help',
  '#dpad', '#btn-up', '#btn-down', '#btn-left', '#btn-right', '#btn-interact',
];

let anyFailure = false;

async function checkBounds(page, label) {
  const viewport = page.viewportSize();
  const failures = [];
  for (const sel of HUD_SELECTORS) {
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      if (getComputedStyle(el).display === 'none') return 'HIDDEN';
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }, sel);
    if (box === null) { failures.push(`${sel}: MISSING FROM DOM`); continue; }
    if (box === 'HIDDEN') continue; // not rendered in this state -- nothing to check
    const overflowRight = box.right - viewport.width;
    const overflowLeft = -box.left;
    const overflowTop = -box.top;
    const overflowBottom = box.bottom - viewport.height;
    const tolerance = 0.5; // sub-pixel rounding noise, not a real overflow
    if (overflowRight > tolerance || overflowLeft > tolerance || overflowTop > tolerance || overflowBottom > tolerance) {
      failures.push(
        `${sel}: overflow R:${overflowRight.toFixed(1)} L:${overflowLeft.toFixed(1)} ` +
        `T:${overflowTop.toFixed(1)} B:${overflowBottom.toFixed(1)} (rect=${JSON.stringify(box)}, viewport=${viewport.width}x${viewport.height})`
      );
    }
  }
  if (failures.length) {
    anyFailure = true;
    console.log(`FAIL [${label}]`);
    failures.forEach((f) => console.log('  ' + f));
  } else {
    console.log(`PASS [${label}]`);
  }
}

async function standByFen(page) {
  await page.evaluate(() => {
    const game = window.RatLand.game;
    const ts = window.RatLand.TILE_SIZE;
    const fen = window.RatLand.NPC_ROSTER.find((n) => n.id === 'fenwicket');
    game.player.x = (fen.col - 1) * ts + (ts - game.player.size) / 2;
    game.player.y = fen.row * ts + (ts - game.player.size) / 2;
  });
}

async function walkGameStatesAndCheck(page, labelPrefix) {
  await page.goto(BASE_URL + '/index.html');
  await page.waitForTimeout(250);
  await checkBounds(page, `${labelPrefix} / overworld`);

  await standByFen(page);
  await page.evaluate(() => window.RatLand.onInteractPressed());
  await page.waitForTimeout(150);
  await checkBounds(page, `${labelPrefix} / prebattle-menu`);

  await page.evaluate(() => document.getElementById('prebattle-debate').dispatchEvent(new Event('pointerdown', { bubbles: true })));
  await page.waitForTimeout(150);
  await checkBounds(page, `${labelPrefix} / prebattle-opinion`);

  await page.evaluate(() => document.getElementById('prebattle-opinion-debate').dispatchEvent(new Event('pointerdown', { bubbles: true })));
  await page.waitForFunction(() => !!window.RatLand.game.battle, { timeout: 3000 });
  await page.waitForTimeout(700);
  await checkBounds(page, `${labelPrefix} / battle-screen`);

  await page.evaluate(() => document.getElementById('battle-rules-open').dispatchEvent(new Event('pointerdown', { bubbles: true })));
  await page.waitForTimeout(150);
  await checkBounds(page, `${labelPrefix} / battle-rules-overlay`);
}

async function run() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(chromiumLaunchOptions());

  console.log('=== Zero-inset check across standard mobile widths ===');
  for (const width of [375, 390, 414]) {
    const page = await browser.newPage({ viewport: { width, height: 812 } });
    await walkGameStatesAndCheck(page, `zero-inset @ ${width}px`);
    await page.close();
  }

  console.log('');
  console.log('=== Simulated non-zero safe-area-inset (CDP) ===');
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const client = await page.context().newCDPSession(page);

    // Notch/Dynamic-Island-style: top + bottom home-indicator inset.
    await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, right: 0, bottom: 34, left: 0 } });
    await walkGameStatesAndCheck(page, 'inset top:47 bottom:34');

    // Side insets (e.g. rotated notch / camera housing on the long edge).
    await client.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, right: 47, bottom: 21, left: 47 } });
    await walkGameStatesAndCheck(page, 'inset left:47 right:47 bottom:21');

    await page.close();
  }

  await browser.close();

  console.log('');
  if (anyFailure) {
    console.log('RESULT: FAIL -- one or more HUD elements overflow the viewport. See failures above.');
    process.exitCode = 1;
  } else {
    console.log('RESULT: PASS -- all HUD elements stayed within viewport bounds in every checked condition.');
  }
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exitCode = 1;
});
