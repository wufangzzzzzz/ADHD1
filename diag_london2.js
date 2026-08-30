const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8155/B10-tower-of-london.html';

async function tapSel(page, sel) {
  const el = await page.$(sel);
  if (!el) return { err: 'no element ' + sel };
  const box = await el.boundingBox();
  if (!box) return { err: 'no box ' + sel };
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  return { ok: true };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.emulate({
    viewport: { width: 768, height: 1024 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    hasTouch: true, isMobile: true,
  });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await tapSel(page, '#diff-medium .diff-btn');
  await new Promise(r => setTimeout(r, 200));
  console.log('1 开始前选中级:', JSON.stringify(await page.evaluate(() => ({
    active: [...document.querySelectorAll('.diff-btn.active')].map(b => b.textContent),
    feedback: document.getElementById('feedback').textContent,
  }))));

  await tapSel(page, '#start-btn');
  await new Promise(r => setTimeout(r, 400));
  console.log('2 开始:', JSON.stringify(await page.evaluate(() => ({
    btn: document.getElementById('start-btn').textContent,
    towers: document.querySelectorAll('.tower').length,
  }))));

  await tapSel(page, '.tower');
  await new Promise(r => setTimeout(r, 200));
  console.log('3 点塔:', JSON.stringify(await page.evaluate(() => ({
    selected: document.querySelectorAll('.tower.selected').length,
    feedback: document.getElementById('feedback').textContent,
  }))));

  await tapSel(page, '#diff-hard .diff-btn');
  await new Promise(r => setTimeout(r, 300));
  console.log('4 运行中选高级:', JSON.stringify(await page.evaluate(() => ({
    active: [...document.querySelectorAll('.diff-btn.active')].map(b => b.textContent),
    btn: document.getElementById('start-btn').textContent,
    resultDisplay: getComputedStyle(document.getElementById('result-card')).display,
  }))));

  await tapSel(page, '#start-btn');
  await new Promise(r => setTimeout(r, 300));
  await tapSel(page, '#start-btn');
  await new Promise(r => setTimeout(r, 400));
  console.log('5 停止后:', JSON.stringify(await page.evaluate(() => ({
    btn: document.getElementById('start-btn').textContent,
    resultDisplay: getComputedStyle(document.getElementById('result-card')).display,
  }))));

  await tapSel(page, '#diff-expert .diff-btn');
  await new Promise(r => setTimeout(r, 300));
  console.log('6 停止后选专家:', JSON.stringify(await page.evaluate(() => {
    const btn = document.getElementById('start-btn');
    const box = btn.getBoundingClientRect();
    const topEl = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return {
      active: [...document.querySelectorAll('.diff-btn.active')].map(b => b.textContent),
      btn: btn.textContent,
      resultDisplay: getComputedStyle(document.getElementById('result-card')).display,
      startBtnTop: topEl ? (topEl.id || topEl.className || topEl.tagName) : 'null',
      startBtnClickable: topEl === btn || btn.contains(topEl),
    };
  })));

  console.log('ERRORS:', JSON.stringify(errors));
  await page.screenshot({ path: 'D:/专注力项目/london_verify.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
