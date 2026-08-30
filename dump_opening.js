const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');
function dir(x,y,cx,cy){ var dx=x-cx, dy=y-cy; if(Math.abs(dx)>Math.abs(dy)*1.0) return dx>0?'右':'左'; return dy>0?'下':'上'; }
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 800, height: 800 });
  await p.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  for (const [idx, name] of [['0','圆'],['2','方']]) {
    const r = await p.evaluate((idx) => {
      document.querySelector('#grpSpiral .seg-btn[data-shape="'+idx+'"]').click();
      const C = window.__csc, geom = C.getGeom();
      const poly = C.getSpiralPolyline();
      const t0 = C.getPts().filter(x=>x.isTarget).sort((a,b)=>b.arc-a.arc)[0];
      let far=null, farD=-1, endP=poly[poly.length-1];
      for(const q of poly){ const d=Math.hypot(q.x-geom.cx,q.y-geom.cy); if(d>farD){farD=d;far=q;} }
      return {
        cx: Math.round(geom.cx), cy: Math.round(geom.cy),
        polyFar: { x:Math.round(far.x), y:Math.round(far.y), d:Math.round(farD) },
        polyEnd: { x:Math.round(endP.x), y:Math.round(endP.y) },
        t0: { x:Math.round(t0.x), y:Math.round(t0.y) }
      };
    }, idx);
    console.log('--- '+name+' (中心'+r.cx+','+r.cy+') ---');
    console.log('  折线最远点(开口): ('+r.polyFar.x+','+r.polyFar.y+') d='+r.polyFar.d+' → '+dir(r.polyFar.x,r.polyFar.y,r.cx,r.cy));
    console.log('  折线末端: ('+r.polyEnd.x+','+r.polyEnd.y+') → '+dir(r.polyEnd.x,r.polyEnd.y,r.cx,r.cy));
    console.log('  target[0]起点: ('+r.t0.x+','+r.t0.y+') → '+dir(r.t0.x,r.t0.y,r.cx,r.cy));
  }
  await b.close();
})();
