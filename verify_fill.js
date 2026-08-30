const puppeteer = require('puppeteer-core');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/专注力项目/color-spiral-connect.html';
const shapes = [
  { id: '0', name: '圆' },
  { id: '1', name: '三角' },
  { id: '2', name: '方' },
];

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));

  await page.setCacheEnabled(false);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(500);

  for (const sh of shapes) {
    // 切形状
    await page.evaluate((sid) => {
      var btn = document.querySelector('#grpSpiral .seg-btn[data-shape="' + sid + '"]');
      if (btn) btn.click();
    }, sh.id);
    await sleep(400);

    const report = await page.evaluate(() => {
      function segDist(ax, ay, bx, by, px, py){
        var dx = bx - ax, dy = by - ay; var l2 = dx*dx + dy*dy;
        if (l2 === 0) return Math.hypot(px-ax, py-ay);
        var t = ((px-ax)*dx + (py-ay)*dy) / l2; t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (ax+dx*t), py - (ay+dy*t));
      }
      function distToPolyline(pts, px, py){
        var best = Infinity;
        for (var i=0;i<pts.length-1;i++){ var d = segDist(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y,px,py); if(d<best) best=d; }
        return best;
      }
      function inPoly(poly, x, y){
        var inside=false;
        for (var i=0,j=poly.length-1;i<poly.length;j=i++){
          var xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
          var inter=((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi);
          if(inter) inside=!inside;
        }
        return inside;
      }
      var C = window.__csc;
      var pts = C.getPts();
      var poly = C.getSpiralPolyline();
      var verts = C.getSpiralVerts();
      var geom = C.getGeom();
      var tgt = C.getTarget().seq;            // 已按连接顺序排好（外→内）
      var TURNS = geom.turns;
      // 反推形状：圆 verts=[]；三角 Vsh=3；方 Vsh=4
      var shape, Vsh;
      if (verts.length === 0) { shape = 0; Vsh = 0; }
      else { Vsh = (verts.length - 1) / TURNS; shape = (Vsh === 3) ? 1 : 2; }

      var targets = pts.filter(p=>p.isTarget);
      var obs = pts.filter(p=>!p.isTarget);

      // 目标球起始端：seq[0] 应是最外端（距中心最远）
      var dCenter = tgt.map(t=>Math.hypot(t.x-geom.cx, t.y-geom.cy));
      var startD = dCenter[0], endD = dCenter[dCenter.length-1];

      // 每个球到螺旋线的最小距离
      var tMin=Infinity,tMax=-Infinity,oMin=Infinity,oMax=-Infinity;
      var tTouch=0,oTouch=0;
      targets.forEach(t=>{ var d=distToPolyline(poly,t.x,t.y); if(d<tMin)tMin=d; if(d>tMax)tMax=d; if(d < t.rad+1) tTouch++; });
      obs.forEach(o=>{ var d=distToPolyline(poly,o.x,o.y); if(d<oMin)oMin=d; if(d>oMax)oMax=d; if(d < o.rad+1) oTouch++; });

      // 覆盖率：在包围盒内铺网格，统计“落在形状内且附近有球”的格子占比
      var bound, isDisc=false;
      if (shape === 0) { isDisc = true; }
      else {
        var outer = verts.slice((TURNS-1)*Vsh, TURNS*Vsh);
        var cx=0,cy=0; for(var i=0;i<outer.length;i++){cx+=outer[i].x;cy+=outer[i].y;} cx/=outer.length; cy/=outer.length;
        bound = outer.map(v=>({x:cx+(v.x-cx)*1.06, y:cy+(v.y-cy)*1.06}));
      }
      var x0=geom.cx-geom.maxR, y0=geom.cy-geom.maxR, x1=geom.cx+geom.maxR, y1=geom.cy+geom.maxR;
      var cell=14, insideCells=0, filledCells=0;
      function insideShape(gx,gy){
        if (isDisc) return Math.hypot(gx-geom.cx, gy-geom.cy) <= geom.maxR;
        return inPoly(bound, gx, gy);
      }
      for(var gx=x0; gx<=x1; gx+=cell){
        for(var gy=y0; gy<=y1; gy+=cell){
          var gcx=gx+cell/2, gcy=gy+cell/2;
          if(!insideShape(gcx,gcy)) continue;
          insideCells++;
          var has=false;
          for(var p=0;p<pts.length;p++){ if(Math.hypot(pts[p].x-gcx,pts[p].y-gcy)<=cell*0.95){has=true;break;} }
          if(has) filledCells++;
        }
      }
      var coverage = insideCells? (filledCells/insideCells*100):0;

      // 内/外半区障碍分布（按距中心半径中位数分）
      var radii = obs.map(o=>Math.hypot(o.x-geom.cx,o.y-geom.cy)).sort((a,b)=>a-b);
      var med = radii[Math.floor(radii.length/2)];
      var inner=obs.filter(o=>Math.hypot(o.x-geom.cx,o.y-geom.cy)<=med).length;
      var outerN=obs.length-inner;

      return {
        shape: shape, tCount: targets.length, oCount: obs.length,
        startOuterFar: startD >= endD, startD: Math.round(startD), endD: Math.round(endD),
        tTouch, oTouch, tMin:Math.round(tMin), tMax:Math.round(tMax), oMin:Math.round(oMin), oMax:Math.round(oMax),
        coverage: Math.round(coverage), insideCells, filledCells,
        obsInner: inner, obsOuter: outerN
      };
    });

    console.log('=== ' + sh.name + ' ===');
    console.log(JSON.stringify(report, null, 0));

    // 截图
    const box = await page.$('#canvasBox');
    if (box) await box.screenshot({ path: path.join('D:/专注力项目', 'shot_' + sh.name + '.png') });
    await sleep(100);
  }

  console.log('CONSOLE_ERRORS:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
