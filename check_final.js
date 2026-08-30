const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
  await page.setViewport({ width: 900, height: 900 });
  const shapes = [['0', '圆'], ['1', '三角'], ['2', '方']];
  for (const [idx, name] of shapes) {
    await page.goto('file:///D:/专注力项目/color-spiral-connect.html', { waitUntil: 'networkidle0' });
    await sleep(400);
    await page.evaluate((id) => { document.querySelector('#grpSpiral .seg-btn[data-shape="' + id + '"]').click(); }, idx);
    await sleep(400);
    const r = await page.evaluate(() => {
      const C = window.__csc; const geom = C.getGeom(); const poly = C.getSpiralPolyline();
      const maxD = Math.max(...poly.map(p => Math.hypot(p.x - geom.cx, p.y - geom.cy)));
      const pts = C.getPts();
      const t = pts.filter(p => p.isTarget); const o = pts.filter(p => !p.isTarget);
      const t0 = t[0]; const t0d = Math.hypot(t0.x - geom.cx, t0.y - geom.cy);
      return { tCount: t.length, oCount: o.length, maxD: Math.round(maxD), t0d: Math.round(t0d), t0IsOutermost: Math.round(t0d) === Math.round(maxD) };
    });
    console.log(name + ': 目标=' + r.tCount + ' 干扰=' + r.oCount + ' 最外顶点d=' + r.maxD + ' t0.d=' + r.t0d + ' t0=最外?' + r.t0IsOutermost);
  }
  console.log('PAGEERRORS: ' + (errs.length ? JSON.stringify(errs) : '无'));
  await browser.close();
})();
