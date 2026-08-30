const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/G2-echo.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 768, height: 1024 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try {
    await page.waitForFunction(() => {
      const o = document.getElementById('loadingOverlay');
      return o && o.style.display === 'none';
    }, { timeout: 25000 });
  } catch (e) { console.log('loading 未隐藏'); }

  const info = await page.evaluate(() => {
    const lvl = document.querySelector('.level-btn[data-level="primary"]');
    const start = document.getElementById('startGameBtn');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 && r.height > 0, display: getComputedStyle(el).display };
    };
    return { lvl: rect(lvl), start: rect(start), vh: window.innerHeight, vw: window.innerWidth };
  });
  console.log('按钮位置:', JSON.stringify(info, null, 2));

  // 用 evaluate 直接调用，验证函数本身是否可用
  await page.evaluate(() => selectLevel('intermediate'));
  console.log('selectLevel后 level =', await page.evaluate(() => state.level));
  await page.evaluate(() => selectLevel('primary'));
  await page.evaluate(() => startNewGame());
  console.log('startNewGame后 questions =', await page.evaluate(() => state.questions.length), ' q0 =', await page.evaluate(() => state.questions[0]));

  await browser.close();
})();
