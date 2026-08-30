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
      return {
        vh: window.innerHeight, vw: window.innerWidth,
        keypadTop: Math.round(kp.top), keypadBottom: Math.round(kp.bottom),
        gridRight: Math.round(grid.right), gridBottom: Math.round(grid.bottom),
        keypadOverflow: kp.bottom > window.innerHeight || kp.right > window.innerWidth,
        overlap: kp.top < grid.bottom && kp.left < grid.right
      };
    });
    console.log(`[${vp.name} ${vp.w}x${vp.h}]`, JSON.stringify(m));
  }
  await browser.close();
})();
