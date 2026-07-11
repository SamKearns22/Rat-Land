const { chromium } = require('playwright');
const OUT = '.';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ts = 32, cols = 32, rows = 24;
  const W = cols * ts, H = rows * ts;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8809/');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.RatLand.CAMERA_ZOOM = 1;
    var g = window.RatLand.game;
    g.player.x = -1000; g.player.y = -1000;
  });
  await page.waitForTimeout(300);
  const canvasEl = await page.$('#game');
  await canvasEl.screenshot({ path: `preview-map.png` });
  console.log('page errors:', errors);
  await browser.close();
})();
