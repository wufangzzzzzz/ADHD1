const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const shapes = [['0','圆'],['1','三角'],['2','方']];
  for (const [idx, name] of shapes) {
    const r = await page.evaluate((idx) => {
      document.querySelector('#grpSpiral .seg-btn[data-shape="'+idx+'"]').click();
      const C = window.__csc;
      const pts = C.getPts();
      const poly = C.getSpiralPolyline();
      const geom = C.getGeom();
      const seq = pts.filter(p=>p.isTarget).sort((a,b)=>b.arc-a.arc); // 外→内
      const t0 = seq[0];
      // 折线里离中心最远/最近的点
      let far=null,farD=-1,near=null,nearD=1e9;
      for (const p of poly){ const d=Math.hypot(p.x-geom.cx,p.y-geom.cy); if(d>farD){farD=d;far=p;} if(d<nearD){nearD=d;near=p;} }
      // target[0] 离最近折线点
      let bestPtD=1e9, bestPt=null;
      for (const p of poly){ const d=Math.hypot(p.x-t0.x,p.y-t0.y); if(d<bestPtD){bestPtD=d;bestPt=p;} }
      return {
        t0: { x: Math.round(t0.x), y: Math.round(t0.y), d: Math.round(Math.hypot(t0.x-geom.cx,t0.y-geom.cy)), rad: t0.rad },
        far: { x: Math.round(far.x), y: Math.round(far.y), d: Math.round(farD) },
        near: { d: Math.round(nearD) },
        t0ToLine: Math.round(bestPtD),
        seqD: seq.slice(0,8).map(s=>Math.round(Math.hypot(s.x-geom.cx,s.y-geom.cy))),
        seqLen: seq.length,
        cx: Math.round(geom.cx), cy: Math.round(geom.cy)
      };
    }, idx);
    console.log('--- '+name+' ---');
    console.log('  target[0]: ('+r.t0.x+','+r.t0.y+') d='+r.t0.d+' rad='+r.t0.rad);
    console.log('  折线最远点: ('+r.far.x+','+r.far.y+') d='+r.far.d+'   折线最近点 d='+r.near.d);
    console.log('  t0 离最近折线点: '+r.t0ToLine+'px');
    console.log('  序列前8个d: '+r.seqD.join(','));
    console.log('  中心: ('+r.cx+','+r.cy+')');
  }
  console.log('ERRORS:', errs.length?errs.join('|'):'none');
  await browser.close();
})();
