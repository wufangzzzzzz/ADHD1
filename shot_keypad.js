const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/number-focus.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();

  for (const vp of [{ name: 'phone', w: 375, h: 720 }, { name: 'tablet', w: 768, h: 1024 }]) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => typeof buildKeypad === 'function', { timeout: 10000 });

    // 模拟进入输入态（跳过倒计时）
    await page.evaluate(() => {
      contentType = 'number';
      generateItems();
      canInput = true;
      hideItems();
      buildKeypad();
      setCursor(0);
    });
    await sleep(300);

    const m = await page.evaluate(() => {
      const kp = document.getElementById('keypad').getBoundingClientRect();
      const grid = document.getElementById('gridContainer').getBoundingClientRect();
      const cell0 = document.getElementById('cell0').getBoundingClientRect();
      return {
        vh: window.innerHeight,
        keypadBottom: Math.round(kp.bottom),
        keypadTop: Math.round(kp.top),
        keypadHeight: Math.round(kp.height),
        gridBottom: Math.round(grid.bottom),
        cursorVisible: getComputedStyle(document.getElementById('cell0')).borderColor,
        keypadOverflowsViewport: kp.bottom > window.innerHeight,
        overlapGridKeypad: kp.top < grid.bottom
      };
    });
    console.log(`[${vp.name} ${vp.w}x${vp.h}]`, JSON.stringify(m));
    await page.screenshot({ path: `D:/专注力项目/kp_${vp.name}.png`, fullPage: true });
  }

  await browser.close();
  console.log('截图已保存');
})();
