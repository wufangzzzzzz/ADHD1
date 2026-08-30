// 真实无头验证：当前 color-spiral-connect.html 的三角/方/圆螺旋几何 + 球分布
// 用法：NODE_PATH=.../node/workspace/node_modules node verify_csc_geom.js
const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'http://127.0.0.1:8123/color-spiral-connect.html';

function segDist(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  if (L2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distToPoly(poly, px, py) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = segDist(poly[i].x, poly[i].y, poly[i + 1].x, poly[i + 1].y, px, py);
    if (d < best) best = d;
  }
  return best;
}
// 多边形螺旋：相邻对应边（同方向）之间的垂直距离 = 圈距
function ringGap(verts, V) {
  const gaps = [];
  for (let i = 0; i < V; i++) {
    const A = verts[i], A2 = verts[i + 1];
    const B = verts[i + V], B2 = verts[i + V + 1];
    const dx = A2.x - A.x, dy = A2.y - A.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L; // 法向
    gaps.push(Math.abs((B.x - A.x) * nx + (B.y - A.y) * ny));
  }
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}
// 内角：顶点 j 的入射/出射向量夹角
function interiorAngles(verts) {
  const angs = [];
  for (let j = 1; j < verts.length - 1; j++) {
    const v0 = { x: verts[j - 1].x - verts[j].x, y: verts[j - 1].y - verts[j].y };
    const v1 = { x: verts[j + 1].x - verts[j].x, y: verts[j + 1].y - verts[j].y };
    const a = Math.atan2(v0.y, v0.x), b = Math.atan2(v1.y, v1.x);
    let d = Math.abs(a - b) * 180 / Math.PI;
    if (d > 180) d = 360 - d;
    angs.push(d);
  }
  return angs;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__csc && window.__csc.getGeom');
  await page.evaluate(() => { /* ensure idle */ });

  const shapes = [['0', '圆'], ['1', '三角'], ['2', '方']];
  for (const [sel, name] of shapes) {
    await page.click(`[data-shape="${sel}"]`);
    await new Promise(r => setTimeout(r, 250));
    const data = await page.evaluate(() => {
      const g = window.__csc.getGeom();
      const verts = window.__csc.getSpiralVerts();
      const poly = window.__csc.getSpiralPolyline();
      const pts = window.__csc.getPts();
      return { g, verts, poly, pts };
    });
    const { g, verts, poly, pts } = data;

    let angleReport = 'n/a (圆)';
    let gap = 'n/a';
    if (verts.length) {
      const V = (name === '三角') ? 3 : 4;
      const angs = interiorAngles(verts);
      const tgt = (V === 3) ? 60 : 90;
      const mn = Math.min(...angs), mx = Math.max(...angs);
      angleReport = `内角 目标${tgt}° 实测 min ${mn.toFixed(3)} / max ${mx.toFixed(3)} / spread ${(mx - mn).toFixed(3)}°`;
      gap = ringGap(verts, V).toFixed(1) + 'px';
    } else {
      gap = ((g.maxR - g.r0) / g.turns).toFixed(1) + 'px (极坐标)';
    }

    // 球分布
    const usePoly = verts.length ? verts : poly;
    let crossLine = 0, outside = 0, inHole = 0;
    // 中心空洞半径：中心到最内圈边的最小距离（圆用 r0）
    let Rin;
    if (verts.length) {
      Rin = Infinity;
      const V = (name === '三角') ? 3 : 4;
      for (let i = 0; i < V; i++) {
        const d = segDist(verts[i].x, verts[i].y, verts[i + 1].x, verts[i + 1].y, g.cx, g.cy);
        if (d < Rin) Rin = d;
      }
    } else {
      Rin = g.r0;
    }
    for (const p of pts) {
      const dl = distToPoly(usePoly, p.x, p.y);
      if (dl < p.rad) crossLine++;
      const dc = Math.hypot(p.x - g.cx, p.y - g.cy);
      if (dc > g.maxR + p.rad) outside++;
      if (dc < Rin - p.rad) inHole++;
    }
    const targets = pts.filter(p => p.isTarget).length;
    const obstacles = pts.length - targets;
    console.log(`\n=== ${name} (shape=${sel}) ===`);
    console.log(`几何：${angleReport}`);
    console.log(`圈距：${gap}`);
    console.log(`球总数 ${pts.length}（目标${targets}/障碍${obstacles}）`);
    console.log(`压线 ${crossLine} | 超出最外臂 ${outside} | 落中心空洞 ${inHole}`);
  }
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
