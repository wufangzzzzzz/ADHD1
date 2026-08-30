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
    await page.waitForFunction(() => { const o = document.getElementById('loadingOverlay'); return o && o.style.display === 'none'; }, { timeout: 25000 });
  } catch (e) { console.log('loading 未隐藏'); }

  // 检查覆盖在 level-btn 和 startGameBtn 上方的元素
  const hit = await page.evaluate(() => {
    const lvl = document.querySelector('.level-btn[data-level="primary"]');
    const start = document.getElementById('startGameBtn');
    const lr = lvl.getBoundingClientRect();
    const sr = start.getBoundingClientRect();
    const at = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? (el.id || el.className || el.tagName) : 'null';
    };
    return {
      lvlCenter: at(lr.x + lr.width/2, lr.y + lr.height/2),
      startCenter: at(sr.x + sr.width/2, sr.y + sr.height/2)
    };
  });
  console.log('命中元素:', JSON.stringify(hit));

  // 真实 page.click 尝试
  await page.click('.level-btn[data-level="primary"]');
  await sleep(200);
  console.log('click level-btn 后 level =', await page.evaluate(() => state.level));
  await page.click('#startGameBtn');
  await sleep(300);
  console.log('click start 后 questions =', await page.evaluate(() => state.questions.length));

  await browser.close();
})();
