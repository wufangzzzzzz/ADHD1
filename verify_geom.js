const puppeteer = require('puppeteer-core');
const EXEC = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXEC, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8123/color-spiral-connect.html', { waitUntil: 'networkidle0' });
  await sleep(600);
  const shapes = [['0', 'circle'], ['1', 'triangle'], ['2', 'square']];
  for (const [ds, name] of shapes) {
    await page.click(`[data-shape="${ds}"]`);
    await sleep(450);
    const res = await page.evaluate((nm) => {
      const c = window.__csc;
      const verts = c.getSpiralPolyline();
      const geom = c.getGeom();
      const pts = c.getPts();
      const TURNS = 4;
      function segDist(ax, ay, bx, by, px, py) {
        const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy;
        let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
        const x = ax + t * dx, y = ay + t * dy; return Math.hypot(px - x, py - y);
      }
      function distToPoly(px, py) { let best = Infinity; for (let i = 0; i < verts.length - 1; i++) { const d = segDist(verts[i].x, verts[i].y, verts[i + 1].x, verts[i + 1].y, px, py); if (d < best) best = d; } return best; }
      const angs = [];
      if (nm !== 'circle') {
        for (let i = 1; i < verts.length - 1; i++) {
          const a = verts[i - 1], b = verts[i], d = verts[i + 1];
          const v0x = b.x - a.x, v0y = b.y - a.y;   // 段 a->b 方向
          const v1x = d.x - b.x, v1y = d.y - b.y;   // 段 b->d 方向
          let da = Math.atan2(v1y, v1x) - Math.atan2(v0y, v0x); da = Math.abs(da);
          if (da > Math.PI) da = 2 * Math.PI - da;
          angs.push((Math.PI - da) * 180 / Math.PI);
        }
      }
      let ringGap = null;
      if (nm !== 'circle') {
        const V = (nm === 'triangle') ? 3 : 4;
        const o0 = (TURNS - 1) * V;
        const A = verts[o0], B = verts[o0 + 1], C = verts[o0 - V];
        const ex = B.x - A.x, ey = B.y - A.y;
        ringGap = Math.abs((C.x - A.x) * ey - (C.y - A.y) * ex) / Math.hypot(ex, ey);
      }
      const gap = geom.k * 2 * Math.PI;
      const innerR = geom.r0;
      let crossLine = 0, outside = 0, inHole = 0;
      const samples = [];
      for (let pi = 0; pi < pts.length; pi++) {
        const p = pts[pi];
        const r = p.rad || 10;
        const dp = distToPoly(p.x, p.y);
        if (dp < r + 6) crossLine++;
        const dc = Math.hypot(p.x - geom.cx, p.y - geom.cy);
        if (dc > geom.maxR + 6) outside++;
        if (dc < innerR + r) inHole++;
        if (pi < 3) samples.push({ x: Math.round(p.x), y: Math.round(p.y), r, dp: +dp.toFixed(1), dc: +dc.toFixed(1) });
      }
      const tCount = pts.filter(p => p.isTarget).length;
      return { shape: nm, nVerts: verts.length, nPts: pts.length, target: tCount, obs: pts.length - tCount, angsMin: angs.length ? Math.min(...angs).toFixed(3) : null, angsMax: angs.length ? Math.max(...angs).toFixed(3) : null, angsStrict60_90: angs.length ? angs.every(a => Math.abs(a - (nm === 'triangle' ? 60 : 90)) < 0.1) : null, ringGap: ringGap ? +ringGap.toFixed(1) : null, circleGap: +gap.toFixed(1), maxR: Math.round(geom.maxR), crossLine, outside, inHole, samples };
    }, name);
    console.log(JSON.stringify(res));
  }
  await page.screenshot({ path: 'D:/专注力项目/shot_geom.png' });
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
