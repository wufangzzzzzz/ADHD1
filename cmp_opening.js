const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
function dir(x,y,cx,cy){ var dx=x-cx, dy=y-cy; if(Math.abs(dx)>Math.abs(dy)) return dx>0?'右':'左'; return dy>0?'下':'上'; }
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  // 画板
  const p1 = await b.newPage();
  await p1.goto('file://'+path.resolve('D:/专注力项目/paint_square.html'), {waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,300));
  const pv = await p1.evaluate(() => {
    const vs = window.__paintVerts;
    const cx=300, cy=300;
    return {
      end: { x:Math.round(vs[vs.length-1].x), y:Math.round(vs[vs.length-1].y), d:Math.round(vs[vs.length-1].y-cy) },
      far: (()=>{ let f=vs[0],fd=-1; for(const q of vs){const d=Math.hypot(q.x-cx,q.y-cy); if(d>fd){fd=d;f=q;}} return {x:Math.round(f.x),y:Math.round(f.y)}; })()
    };
  });
  console.log('画板方形: 末端('+pv.end.x+','+pv.end.y+') → '+dir(pv.end.x,pv.end.y,300,300)+'  最外顶点('+pv.far.x+','+pv.far.y+') → '+dir(pv.far.x,pv.far.y,300,300));
  // 游戏
  const p2 = await b.newPage();
  await p2.goto('file://'+path.resolve('D:/专注力项目/color-spiral-connect.html'), {waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,300));
  const gv = await p2.evaluate(() => {
    document.querySelector('#grpSpiral .seg-btn[data-shape="2"]').click();
    const C=window.__csc, geom=C.getGeom(), poly=C.getSpiralPolyline();
    let far=poly[0],fd=-1; for(const q of poly){const d=Math.hypot(q.x-geom.cx,q.y-geom.cy); if(d>fd){fd=d;far=q;}}
    return { end:{x:Math.round(poly[poly.length-1].x),y:Math.round(poly[poly.length-1].y)}, far:{x:Math.round(far.x),y:Math.round(far.y)}, cx:Math.round(geom.cx), cy:Math.round(geom.cy) };
  });
  console.log('游戏方形: 末端('+gv.end.x+','+gv.end.y+') → '+dir(gv.end.x,gv.end.y,gv.cx,gv.cy)+'  最外顶点('+gv.far.x+','+gv.far.y+') → '+dir(gv.far.x,gv.far.y,gv.cx,gv.cy));
  console.log('末端方向一致:', dir(pv.end.x,pv.end.y,300,300)===dir(gv.end.x,gv.end.y,gv.cx,gv.cy) ? '是 ✓' : '否 ✗');
  await b.close();
})();
