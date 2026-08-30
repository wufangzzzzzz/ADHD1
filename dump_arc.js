const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  await page.setViewport({ width: 900, height: 900 });
  await page.goto('file:///D:/专注力项目/color-spiral-connect.html', { waitUntil: 'networkidle0' });
  await sleep(400);
  await page.evaluate(() => { document.querySelector('#grpSpiral .seg-btn[data-shape="1"]').click(); }, '1');
  await sleep(400);
  const info = await page.evaluate(() => {
    const C = window.__csc;
    const geom = C.getGeom();
    const poly = C.getSpiralPolyline();
    const cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i-1] + Math.hypot(poly[i].x-poly[i-1].x, poly[i].y-poly[i-1].y));
    const rows = poly.map((p, i) => ({ i, d: Math.round(Math.hypot(p.x-geom.cx, p.y-geom.cy)), cum: Math.round(cum[i]) }));
    // 模拟当前代码的 arcOuter / arcInner
    const Vsh = 3;
    const edgeMargin = (cum[Vsh] - cum[0]) * 0.08;
    const arcOuter = cum[cum.length - 2] - edgeMargin;
    const arcInner = cum[Vsh] + edgeMargin;
    return { rows, edgeMargin: Math.round(edgeMargin), arcOuter: Math.round(arcOuter), arcInner: Math.round(arcInner), cumLast: Math.round(cum[cum.length-1]) };
  });
  console.log('三角顶点明细 (i: d离中心, cum累积弧长):');
  info.rows.forEach(r => console.log('  idx' + r.i + '  d=' + r.d + '  cum=' + r.cum));
  console.log('\n代码里的: edgeMargin=' + info.edgeMargin + '  arcOuter=' + info.arcOuter + '  arcInner=' + info.arcInner + '  cumLast=' + info.cumLast);
  // 找 arcOuter 对应哪个顶点
  let near = -1;
  for (let i = 0; i < info.rows.length; i++) if (Math.abs(info.rows[i].cum - info.arcOuter) < (near<0?1e9:Math.abs(info.rows[near].cum-info.arcOuter))) near = i;
  console.log('arcOuter 落在 idx' + near + ' (d=' + info.rows[near].d + ')  ← 但真正最外是 idx11 d=266');
  await browser.close();
})();
