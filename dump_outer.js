const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  await page.setViewport({ width: 900, height: 900 });

  const shapes = [['0', '圆'], ['1', '三角'], ['2', '方']];
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
      const verts = C.getSpiralVerts ? C.getSpiralVerts() : null;
      const poly = C.getSpiralPolyline();
      // 真实 target 序列（已是连接顺序）
      const pts = C.getPts();
      const targets = pts.filter(p => p.isTarget);

      // 量每个折线点的离中心距离，找真正最远的点
      const distList = poly.map(p => Math.hypot(p.x - geom.cx, p.y - geom.cy));
      let maxD = -1, maxIdx = -1;
      for (let i = 0; i < distList.length; i++) if (distList[i] > maxD) { maxD = distList[i]; maxIdx = i; }
      let minD = Infinity, minIdx = 0;
      for (let i = 0; i < distList.length; i++) if (distList[i] < minD) { minD = distList[i]; minIdx = i; }

      // 把折线尾部若干点的索引/距离打出来，看最外端结构
      const tail = [];
      for (let i = Math.max(0, poly.length - 8); i < poly.length; i++) {
        tail.push({ i, d: Math.round(distList[i]) });
      }
      const t0 = targets[0];
      const t0d = Math.hypot(t0.x - geom.cx, t0.y - geom.cy);
      // target[0] 在折线上的最近点
      let bestJ = -1, bestJD = Infinity;
      for (let i = 0; i < poly.length; i++) {
        const dd = Math.hypot(poly[i].x - t0.x, poly[i].y - t0.y);
        if (dd < bestJD) { bestJD = dd; bestJ = i; }
      }
      return {
        name,
        polyLen: poly.length,
        maxD: Math.round(maxD), maxIdx,        // 折线里真正最远的点
        minD: Math.round(minD), minIdx,        // 最内的点（螺旋中心端）
        tail,
        t0: { x: Math.round(t0.x), y: Math.round(t0.y), d: Math.round(t0d), nearPolyIdx: bestJ, nearDist: Math.round(bestJD) },
        t0IsMax: (Math.round(t0d) === Math.round(maxD)),
        vertsCount: verts ? verts.length : -1
      };
    });
    console.log('\n===== ' + name + ' =====');
    console.log(JSON.stringify(info, null, 2));
  }
  await browser.close();
})();
