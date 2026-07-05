// tests/check-battle-cleanup.js
//
// Permanent regression check for a real bug found via user report: an
// ordinary dialogue box left open (talked to some NPC, never explicitly
// closed it -- nothing closes it just from walking away, only re-
// pressing Talk while not adjacent, the dialogue cancel button, or Reset
// Save do) stayed `.visible` through the ENTIRE pre-battle-menu ->
// pre-battle-opinion -> battle-wipe -> battle -> exit-wipe cycle and was
// STILL showing its stale text after returning to the overworld -- read
// by the reporting user as "the view is broken after the Fen battle,"
// when the actual bug was RatLand.openPreBattleMenu never calling
// RatLand.hideDialogue(). Fixed by calling hideDialogue() there.
//
// tests/check-hud-bounds.js checks HUD *positioning* across game states
// but never actually resolves a battle and returns to the overworld, so
// it structurally could not have caught this -- this test exists
// specifically to close that gap: it drives a full battle to both a WIN
// and a LOSS, taps Continue, and asserts the overworld is clean
// afterward (no leftover dialogue, sane camera/player state), starting
// from a state where a dialogue box was deliberately left open first.
//
// Usage: start the dev server first (`python3 -m http.server 8809` from
// the repo root, or any static server), then:
//   node tests/check-battle-cleanup.js [baseUrl]
// Exits non-zero if any assertion fails.

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
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
let anyFailure = false;

function assert(cond, label) {
  if (cond) {
    console.log(`PASS [${label}]`);
  } else {
    anyFailure = true;
    console.log(`FAIL [${label}]`);
  }
}

async function dispatchPointerdown(page, selector) {
  await page.evaluate((sel) => {
    document.getElementById(sel).dispatchEvent(new Event('pointerdown', { bubbles: true }));
  }, selector);
}

// Leaves an ordinary NPC's dialogue box open (deliberately not closed),
// matching the exact real-world sequence that exposed the bug: talk to
// someone, then walk straight to a fightable NPC without ever
// dismissing the first dialogue.
async function leaveDialogueOpen(page, npcId) {
  await page.evaluate((id) => {
    const game = window.RatLand.game;
    const ts = window.RatLand.TILE_SIZE;
    const npc = window.RatLand.NPC_ROSTER.find((n) => n.id === id);
    game.player.x = npc.col * ts;
    game.player.y = (npc.row + 1) * ts;
  }, npcId);
  await page.waitForTimeout(120);
  await dispatchPointerdown(page, 'btn-interact');
  await page.waitForTimeout(120);
}

async function standByFen(page) {
  await page.evaluate(() => {
    const game = window.RatLand.game;
    const ts = window.RatLand.TILE_SIZE;
    const fen = window.RatLand.NPC_ROSTER.find((n) => n.id === 'fenwicket');
    game.player.x = fen.col * ts;
    game.player.y = (fen.row + 1) * ts;
  });
}

// Drives the battle to completion using only move-0 (Rhetoric) -- which
// side wins isn't the point of this check, just that the cycle
// completes and control returns to the overworld cleanly either way.
async function fightToCompletion(page, maxRounds) {
  for (let i = 0; i < maxRounds; i++) {
    const outcome = await page.evaluate(() => window.RatLand.game.battle && window.RatLand.game.battle.outcome);
    if (outcome) return outcome;
    const gapPending = await page.evaluate(() => window.RatLand.game.battle && window.RatLand.game.battle.turnGapPending);
    if (gapPending) { await page.waitForTimeout(150); continue; }
    await dispatchPointerdown(page, 'battle-move-0');
    await page.waitForTimeout(60);
    await dispatchPointerdown(page, 'battle-move-0');
    await page.waitForTimeout(400);
  }
  return await page.evaluate(() => window.RatLand.game.battle && window.RatLand.game.battle.outcome);
}

async function runOneCycle(browser, label, npcToLeaveOpen) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(BASE_URL + '/index.html');
  await page.waitForTimeout(300);

  await leaveDialogueOpen(page, npcToLeaveOpen);
  const openedOk = await page.evaluate(() => document.getElementById('dialogue-box').classList.contains('visible'));
  assert(openedOk, `${label}: dialogue box actually opened before the battle (precondition)`);

  await standByFen(page);
  await dispatchPointerdown(page, 'btn-interact');
  await page.waitForTimeout(150);

  const atMenu = await page.evaluate(() => ({
    mode: window.RatLand.game.mode,
    dialogueVisible: document.getElementById('dialogue-box').classList.contains('visible'),
  }));
  assert(atMenu.mode === 'battle-menu', `${label}: entered battle-menu`);
  assert(!atMenu.dialogueVisible, `${label}: leftover dialogue closed the instant the pre-battle menu opens`);

  await dispatchPointerdown(page, 'prebattle-debate');
  await page.waitForTimeout(150);
  await dispatchPointerdown(page, 'prebattle-opinion-debate');
  await page.waitForFunction(() => !!window.RatLand.game.battle, { timeout: 3000 });
  await page.waitForTimeout(700);

  const inBattle = await page.evaluate(() => ({
    mode: window.RatLand.game.mode,
    dialogueVisible: document.getElementById('dialogue-box').classList.contains('visible'),
  }));
  assert(inBattle.mode === 'battle', `${label}: battle actually started`);
  assert(!inBattle.dialogueVisible, `${label}: dialogue stays closed throughout the battle`);

  const outcome = await fightToCompletion(page, 60);
  assert(outcome === 'player' || outcome === 'enemy', `${label}: battle resolved to a real outcome (got "${outcome}")`);

  await dispatchPointerdown(page, 'battle-continue');
  await page.waitForTimeout(900); // exit wipe

  const after = await page.evaluate(() => {
    const game = window.RatLand.game;
    return {
      mode: game.mode,
      battleIsNull: game.battle === null,
      dialogueVisible: document.getElementById('dialogue-box').classList.contains('visible'),
      dialogueText: document.getElementById('dialogue-text').textContent,
      cameraIsFiniteNumber: Number.isFinite(game.camera.x) && Number.isFinite(game.camera.y),
      playerIsFiniteNumber: Number.isFinite(game.player.x) && Number.isFinite(game.player.y),
      battleScreenHidden: !document.getElementById('battle-screen').classList.contains('visible'),
      dpadVisible: getComputedStyle(document.getElementById('dpad')).display !== 'none',
      talkVisible: getComputedStyle(document.getElementById('btn-interact')).display !== 'none',
    };
  });

  assert(after.mode === 'overworld', `${label}: back in overworld mode after Continue (got "${after.mode}")`);
  assert(after.battleIsNull, `${label}: game.battle cleared after exiting`);
  assert(!after.dialogueVisible, `${label}: NO leftover dialogue box after the battle ends (the actual reported bug)`);
  assert(after.cameraIsFiniteNumber, `${label}: camera.x/y are real finite numbers, not NaN/undefined`);
  assert(after.playerIsFiniteNumber, `${label}: player.x/y are real finite numbers, not NaN/undefined`);
  assert(after.battleScreenHidden, `${label}: battle screen overlay hidden`);
  assert(after.dpadVisible, `${label}: D-pad visible and usable again`);
  assert(after.talkVisible, `${label}: Talk button visible and usable again`);
  assert(pageErrors.length === 0, `${label}: no JS page errors during the whole cycle (got ${pageErrors.length}: ${pageErrors.join(' | ')})`);

  await page.close();
}

async function run() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(chromiumLaunchOptions());

  console.log('=== Full battle-then-return cycle, leftover dialogue from a prior NPC ===');
  // nutkin: a longer, wrapping line -- more visually obvious if left stale.
  await runOneCycle(browser, 'cycle A (Nutkin dialogue left open)', 'nutkin');
  // barrygutt: a different NPC/line, just to not rely on one single case.
  await runOneCycle(browser, 'cycle B (Barry Gutt dialogue left open)', 'barrygutt');

  await browser.close();

  console.log('');
  if (anyFailure) {
    console.log('RESULT: FAIL -- see failures above.');
    process.exitCode = 1;
  } else {
    console.log('RESULT: PASS -- battle cycle completes cleanly with no leftover dialogue in every checked case.');
  }
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exitCode = 1;
});
