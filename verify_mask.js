const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://127.0.0.1:8155/';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();

  const checks = [
    { file: 'G3-sonic-search.html', sel: '.feedback-overlay' },
    { file: 'color-sort.html', sel: '.win-animation' },
    { file: 'number-focus.html', sel: '.win-overlay' },
    { file: 'number-focus.html', sel: '.game-over-overlay' },
    { file: 'number-focus.html', sel: '.success-overlay' },
  ];

  for (const c of checks) {
    const errors = [];
    page.removeAllListeners('pageerror');
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + c.file, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 300));
    const pe = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return '（元素不存在）';
      return getComputedStyle(el).pointerEvents;
    }, c.sel).catch(e => '（查询失败: ' + e.message + '）');
    console.log(`${c.file}  ${c.sel}  ->  pointer-events: ${pe}  | 报错: ${errors.length ? errors.join(';') : '无'}`);
  }

  await browser.close();
})();
