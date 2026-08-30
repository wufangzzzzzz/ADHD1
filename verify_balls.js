// 无头实测：游戏里 圆/三角/方 的球分布是否达标
// 判定：0 压线（球圆与折线相交）、0 落中心空洞（三角/方内臂以内）、0 超最外臂
const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
function distToPolyline(px, py, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const d = distToSeg(px, py, poly[i].x, poly[i].y, poly[i + 1].x, poly[i + 1].y);
    if (d < best) best = d;
  }
  return best;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800 });
  page.on('console', m => { if (m.type() === 'error') console.log('  [page error]', m.text()); });
  await page.goto('http://127.0.0.1:8123/color-spiral-connect.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  const shapes = [['圆', 0], ['三角', 1], ['方', 2]];
  const report = [];

  for (const [name, sh] of shapes) {
    // 真实点击 UI 按钮切换形状（触发 regenPoints）
    await page.click(`#grpSpiral .seg-btn[data-shape="${sh}"]`);
    await new Promise(r => setTimeout(r, 200));

    const data = await page.evaluate(() => {
      const csc = window.__csc;
      const pts = csc.getPts();
      const poly = csc.getSpiralPolyline();
      const geom = csc.getGeom();
      const verts = csc.getSpiralVerts();
      return {
        pts: pts.map(p => ({ x: p.x, y: p.y, rad: p.rad, isTarget: p.isTarget })),
        poly: poly.map(p => ({ x: p.x, y: p.y })),
        geom, verts: verts.map(v => ({ x: v.x, y: v.y }))
      };
    });

    const { pts, poly, geom, verts } = data;
    const cx = geom.cx, cy = geom.cy;
    // 内臂最小半径 / 最外臂最大半径（仅三角/方有 verts）
    let innerMinR = Infinity, outerMaxR = 0;
    if (verts.length) {
      for (const v of verts) {
        const d = Math.hypot(v.x - cx, v.y - cy);
        if (d < innerMinR) innerMinR = d;
        if (d > outerMaxR) outerMaxR = d;
      }
    }

    let onLine = 0, onLineTouch = 0, inHole = 0, outOuter = 0;
    let minLineDist = Infinity, maxHoleD = 0, maxOuterD = 0;
    let tgt = 0, obs = 0;
    for (const p of pts) {
      if (p.isTarget) tgt++; else obs++;
      const dl = distToPolyline(p.x, p.y, poly);
      if (dl < minLineDist) minLineDist = dl;
      if (dl < p.rad) onLine++;                 // 球圆与折线相交（压线）
      if (dl < p.rad + 4) onLineTouch++;        // 仅贴边
      const dc = Math.hypot(p.x - cx, p.y - cy);
      if (verts.length) {
        if (dc < innerMinR) { inHole++; if (dc > maxHoleD) maxHoleD = dc; }   // 落中心空洞（内臂以内）
        if (dc > outerMaxR) { outOuter++; if (dc > maxOuterD) maxOuterD = dc; } // 超最外臂
      }
    }
    report.push({ name, sh, total: pts.length, tgt, obs,
      onLine, onLineTouch, inHole, outOuter,
      minLineDist, innerMinR: verts.length ? innerMinR : null,
      outerMaxR: verts.length ? outerMaxR : null, maxHoleD, maxOuterD });
  }

  await browser.close();

  console.log('\n===== 球分布实测（圆/三角/方）=====');
  for (const r of report) {
    console.log(`\n【${r.name}】 总球=${r.total}（目标${r.tgt} / 障碍${r.obs}）`);
    console.log(`  压线(球圆∩折线): ${r.onLine}  个`);
    console.log(`  仅贴边(<rad+4): ${r.onLineTouch}  个   最小到线距离=${r.minLineDist.toFixed(2)}px`);
    if (r.sh !== 0) {
      console.log(`  落中心空洞(内臂以内): ${r.inHole}  个   最内臂半径=${r.innerMinR.toFixed(2)}px  空洞内最远球=${r.maxHoleD.toFixed(2)}px`);
      console.log(`  超最外臂: ${r.outOuter}  个   最外臂半径=${r.outerMaxR.toFixed(2)}px  臂外最远球=${r.maxOuterD.toFixed(2)}px`);
    }
  }
  console.log('\n===== 结论 =====');
  for (const r of report) {
    const lineOk = r.onLine === 0;
    const holeOk = (r.sh === 0) ? true : (r.inHole === 0);
    const outerOk = (r.sh === 0) ? true : (r.outOuter === 0);
    console.log(`${r.name}: 压线${lineOk ? 'OK' : '✗' + r.onLine} | 中心空洞${holeOk ? 'OK' : '✗' + r.inHole} | 超最外臂${outerOk ? 'OK' : '✗' + r.outOuter}`);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
