const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  for (const [idx, name] of [['2','方'],['1','三角']]) {
    const r = await page.evaluate((idx) => {
      document.querySelector('#grpSpiral .seg-btn[data-shape="'+idx+'"]').click();
      const C = window.__csc;
      const verts = C.getSpiralVerts();
      const geom = C.getGeom();
      const out = verts.map((v,i) => ({
        i: i,
        x: Math.round(v.x), y: Math.round(v.y),
        d: Math.round(Math.hypot(v.x-geom.cx, v.y-geom.cy))
      }));
      let maxD=-1, maxI=-1, minD=1e9, minI=-1;
      for (const o of out) { if (o.d>maxD){maxD=o.d;maxI=o.i;} if(o.d<minD){minD=o.d;minI=o.i;} }
      return { total: verts.length, last: out[out.length-1], maxD, maxI, minD, minI, all: out };
    }, idx);
    console.log('--- '+name+' (共'+r.total+'顶点) ---');
    console.log('  顶点0(中心): ('+r.all[0].x+','+r.all[0].y+') d='+r.all[0].d);
    console.log('  最远顶点 idx='+r.maxI+' d='+r.maxD+' ('+r.all[r.maxI].x+','+r.all[r.maxI].y+')');
    console.log('  最近顶点 idx='+r.minI+' d='+r.minD);
    console.log('  末端 idx='+(r.total-1)+' d='+r.last.d+' ('+r.last.x+','+r.last.y+')');
    console.log('  所有d: '+r.all.map(o=>o.d).join(','));
  }
  await browser.close();
})();
