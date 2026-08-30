const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const shapes = [['0', '圆'], ['1', '三角'], ['2', '方']];
  const out = {};
  for (const [idx, name] of shapes) {
    const r = await page.evaluate((idx) => {
      document.querySelector('#grpSpiral .seg-btn[data-shape="' + idx + '"]').click();
      const C = window.__csc;
      const pts = C.getPts();
      const t = pts.filter(p => p.isTarget).length;
      const o = pts.length - t;
      return { t, o };
    }, idx);
    out[name] = r;
  }
  console.log('ERRORS:', errs.length ? errs.join(' | ') : 'none');
  console.log('COUNTS:', JSON.stringify(out));
  await browser.close();
})();
