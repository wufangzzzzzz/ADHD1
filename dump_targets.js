const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  await page.setViewport({ width: 900, height: 900 });

  const shapes = [['1', '三角'], ['2', '方']];
  for (const [idx, name] of shapes) {
    await page.goto('file:///D:/专注力项目/color-spiral-connect.html', { waitUntil: 'networkidle0' });
    await sleep(400);
    await page.evaluate((id) => {
      document.querySelector('#grpSpiral .seg-btn[data-shape="' + id + '"]').click();
    }, idx);
    await sleep(400);
    const info = await page.evaluate(() => {
      const C = window.__csc;
      const geom = C.getGeom();
      const poly = C.getSpiralPolyline();
      const d = poly.map(p => Math.hypot(p.x - geom.cx, p.y - geom.cy));
      // poly.len 是累积弧长，和 poly.pts 一一对应
      const dists = poly.map((p, i) => ({ i, d: Math.round(d[i]), len: Math.round(C.getSpiralPolyline().len ? 0 : 0) }));
      const pts = C.getPts();
      const targets = pts.filter(p => p.isTarget).map((t, i) => ({
        i,
        arc: t.arc == null ? null : Math.round(t.arc),
        d: Math.round(Math.hypot(t.x - geom.cx, t.y - geom.cy))
      }));
      // 折线累积弧长数组
      let lenArr = [];
      try { lenArr = C.getSpiralPolyline.__len || null; } catch (e) {}
      return {
        name,
        polyLen: poly.length,
        maxD: Math.round(Math.max(...d)),
        maxDIdx: d.indexOf(Math.max(...d)),
        minD: Math.round(Math.min(...d)),
        minDIdx: d.indexOf(Math.min(...d)),
        targets
      };
    });
    console.log('\n===== ' + name + ' =====');
    console.log('polyLen=' + info.polyLen + '  maxD=' + info.maxD + ' @idx' + info.maxDIdx + '  minD=' + info.minD + ' @idx' + info.minDIdx);
    console.log('targets (i: arc, d):');
    info.targets.forEach(t => console.log('  [' + t.i + '] arc=' + t.arc + '  d=' + t.d));
  }
  await browser.close();
})();
