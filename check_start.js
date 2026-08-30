const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('  [PAGEERROR]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('  [CONSOLE.ERROR]', m.text()); });
  await page.setViewport({ width: 900, height: 900 });
  const shapes = [['0', '圆'], ['1', '三角'], ['2', '方']];
  for (const [idx, name] of shapes) {
    await page.setCacheEnabled(false);
    await page.goto('file:///D:/专注力项目/color-spiral-connect.html', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#grpSpiral .seg-btn', { timeout: 5000 });
    await page.click(`#grpSpiral .seg-btn[data-shape="${idx}"]`);
    await new Promise(r => setTimeout(r, 400));
    const data = await page.evaluate(() => {
      const C = window.__csc;
      const pts = C.getPts();
      const poly = C.getSpiralPolyline();
      const geom = C.getGeom();
      const targets = pts.filter(p => p.isTarget);
      // 用顶点数反推真实形状：圆=[]，三角=13，方=17
      const verts = C.getSpiralVerts();
      const trueShape = verts.length === 0 ? 'circle(0)' : (verts.length === 13 ? 'triangle(1)' : (verts.length === 17 ? 'square(2)' : 'verts=' + verts.length));
      // 当前激活按钮（DOM 实际状态）
      const activeBtn = document.querySelector('#grpSpiral .seg-btn.active');
      const activeShape = activeBtn ? activeBtn.getAttribute('data-shape') : 'none';
      // 螺旋折线里离中心最远的点（理论最外端）
      let outer = null, outerD = -1;
      for (const p of poly) {
        const d = Math.hypot(p.x - geom.cx, p.y - geom.cy);
        if (d > outerD) { outerD = d; outer = p; }
      }
      // 每个目标球离中心距离，按连接顺序(i)
      const seq = targets.map(t => ({
        x: Math.round(t.x), y: Math.round(t.y),
        d: Math.round(Math.hypot(t.x - geom.cx, t.y - geom.cy))
      }));
      const t0 = seq[0];
      const maxTgtD = Math.max(...seq.map(s => s.d));
      const minTgtD = Math.min(...seq.map(s => s.d));
      return {
        trueShape, activeShape,
        cx: Math.round(geom.cx), cy: Math.round(geom.cy),
        outerEnd: { x: Math.round(outer.x), y: Math.round(outer.y), d: Math.round(outerD) },
        t0, maxTgtD, minTgtD,
        t0IsOutermostOfTargets: (t0.d === maxTgtD),
        t0DistToTrueOuterEnd: Math.round(Math.hypot(t0.x - outer.x, t0.y - outer.y)),
        seq: seq.slice(0, 4).concat([{ '...': '...' }]).concat(seq.slice(-2))
      };
    });
    console.log(`\n===== ${name} (shape=${idx}) =====`);
    console.log(JSON.stringify(data, null, 2));
  }
  await browser.close();
})();
