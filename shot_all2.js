const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/number-focus.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const vps = [
    { name: '手机竖屏', w: 375, h: 720 },
    { name: '平板竖屏', w: 768, h: 1024 },
    { name: '平板横屏', w: 1024, h: 768 },
    { name: '手机横屏', w: 667, h: 375 },
  ];
  for (const vp of vps) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof buildKeypad === 'function', { timeout: 10000 });
    await page.evaluate(() => { contentType='number'; generateItems(); canInput=true; hideItems(); buildKeypad(); setCursor(0); });
    await new Promise(r => setTimeout(r, 250));
    const m = await page.evaluate(() => {
      const kp = document.getElementById('keypad').getBoundingClientRect();
      const grid = document.getElementById('gridContainer').getBoundingClientRect();
      const ga = document.querySelector('.game-area').getBoundingClientRect();
      return {
        vh: window.innerHeight,
        gridLeft: Math.round(grid.left), gridRight: Math.round(grid.right),
        gridCenter: Math.round(grid.left + grid.width/2),
        kpLeft: Math.round(kp.left), kpRight: Math.round(kp.right),
        kpCenter: Math.round(kp.left + kp.width/2),
        keypadBottom: Math.round(kp.bottom),
        gridBottom: Math.round(grid.bottom),
        centered: Math.abs((grid.left+grid.width/2) - (kp.left+kp.width/2)) < 3,
        verticalStacked: kp.top >= grid.bottom - 1,
        overflow: kp.bottom > window.innerHeight,
        scrollable: getComputedStyle(document.body).overflowY
      };
    });
    console.log(`[${vp.name} ${vp.w}x${vp.h}]`, JSON.stringify(m));
  }
  await browser.close();
})();
