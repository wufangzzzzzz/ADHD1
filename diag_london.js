const puppeteer = require('puppeteer-core');

const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/B10-tower-of-london.html';

async function tapSel(page, sel) {
  const el = await page.$(sel);
  if (!el) return { err: 'no element ' + sel };
  const box = await el.boundingBox();
  if (!box) return { err: 'no box ' + sel };
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.touchscreen.tap(x, y);
  return { ok: true, x: Math.round(x), y: Math.round(y) };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new', args: ['--no-sandbox'],
  });

  const devs = [
    { name: 'ipad', w: 768, h: 1024, ua: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
    { name: 'android-tab', w: 800, h: 1280, ua: 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36' },
  ];

  for (const dev of devs) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    await page.emulate({
      viewport: { width: dev.w, height: dev.h },
      userAgent: dev.ua,
      hasTouch: true,
      isMobile: true,
    });
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const base = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.diff-btn')];
      return {
        diffBtnCount: btns.length,
        diffBtnOnclick: btns.map(b => typeof b.onclick),
        towerCount: document.querySelectorAll('.tower').length,
        startBtnText: document.getElementById('start-btn').textContent,
        innerW: window.innerWidth,
        innerH: window.innerHeight,
      };
    });

    const tapDiff = await tapSel(page, '#diff-easy .diff-btn');
    await new Promise(r => setTimeout(r, 250));
    const diffActive = await page.evaluate(() =>
      [...document.querySelectorAll('.diff-btn.active')].map(b => b.textContent));

    const tapStart = await tapSel(page, '#start-btn');
    await new Promise(r => setTimeout(r, 450));
    const afterStart = await page.evaluate(() => ({
      startBtnText: document.getElementById('start-btn').textContent,
      towerCount: document.querySelectorAll('.tower').length,
      goalCount: document.querySelectorAll('.goal-tower').length,
      feedback: document.getElementById('feedback').textContent,
    }));

    const tapTower = await tapSel(page, '.tower');
    await new Promise(r => setTimeout(r, 300));
    const afterTower = await page.evaluate(() => ({
      selected: document.querySelectorAll('.tower.selected').length,
      steps: document.getElementById('hud-steps').textContent,
    }));

    // 运行中点难度（应被锁，观察是否真的无反应）
    const tapDiffDuring = await tapSel(page, '#diff-hard .diff-btn');
    await new Promise(r => setTimeout(r, 200));
    const activeDuring = await page.evaluate(() =>
      [...document.querySelectorAll('.diff-btn.active')].map(b => b.textContent));

    // 停止
    const tapStop = await tapSel(page, '#start-btn');
    await new Promise(r => setTimeout(r, 400));
    const afterStop = await page.evaluate(() => ({
      startBtnText: document.getElementById('start-btn').textContent,
      resultDisplay: getComputedStyle(document.getElementById('result-card')).display,
    }));

    // 停止后选难度
    const tapDiffAfter = await tapSel(page, '#diff-expert .diff-btn');
    await new Promise(r => setTimeout(r, 200));
    const activeAfter = await page.evaluate(() =>
      [...document.querySelectorAll('.diff-btn.active')].map(b => b.textContent));

    console.log(`\n===== ${dev.name} (${dev.w}x${dev.h}) =====`);
    console.log('BASE        ', JSON.stringify(base));
    console.log('ERRORS      ', JSON.stringify(errors));
    console.log('TAP_DIFF    ', JSON.stringify(tapDiff), '-> active=', JSON.stringify(diffActive));
    console.log('TAP_START   ', JSON.stringify(tapStart), '->', JSON.stringify(afterStart));
    console.log('TAP_TOWER   ', JSON.stringify(tapTower), '->', JSON.stringify(afterTower));
    console.log('TAP_DIFF_RUN', JSON.stringify(tapDiffDuring), '-> active=', JSON.stringify(activeDuring));
    console.log('TAP_STOP    ', JSON.stringify(tapStop), '->', JSON.stringify(afterStop));
    console.log('TAP_DIFF_AFT', JSON.stringify(tapDiffAfter), '-> active=', JSON.stringify(activeAfter));

    await page.screenshot({ path: `D:/专注力项目/london_${dev.name}.png` });
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
