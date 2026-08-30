const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800 });
  await page.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  for (const [idx, name] of [['2','方'],['1','三角']]) {
    const r = await page.evaluate((idx) => {
      function segDist(ax,ay,bx,by,px,py){var dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(l2===0)return Math.hypot(px-ax,py-ay);var t=((px-ax)*dx+(py-ay)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));}
      function distToPolyline(pts,px,py){var best=Infinity;for(var i=0;i<pts.length-1;i++){var d=segDist(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y,px,py);if(d<best)best=d;}return best;}
      function inPoly(poly,x,y){var inside=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++){var xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;var inter=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);if(inter)inside=!inside;}return inside;}
      document.querySelector('#grpSpiral .seg-btn[data-shape="'+idx+'"]').click();
      const C = window.__csc;
      const pts = C.getPts();
      const verts = C.getSpiralVerts();
      const geom = C.getGeom();
      const Vsh = (idx==='1')?3:4;
      const TURNS = 4;
      const turnsB = (Vsh===3)?3:TURNS;
      const outerVerts = verts.slice((turnsB-1)*Vsh, turnsB*Vsh);
      var cxB=0,cyB=0; for(const v of outerVerts){cxB+=v.x;cyB+=v.y;} cxB/=outerVerts.length; cyB/=outerVerts.length;
      const bound106 = outerVerts.map(v=>({x:cxB+(v.x-cxB)*1.06,y:cyB+(v.y-cyB)*1.06}));
      const bound100 = outerVerts.map(v=>({x:cxB+(v.x-cxB)*1.0,y:cyB+(v.y-cyB)*1.0}));
      const bound094 = outerVerts.map(v=>({x:cxB+(v.x-cxB)*0.94,y:cyB+(v.y-cyB)*0.94}));
      const obs = pts.filter(p=>!p.isTarget);
      const tgt = pts.filter(p=>p.isTarget).sort((a,b)=>b.arc-a.arc);
      let out106=0, out100=0, out094=0;
      const outPts = [];
      for (const o of obs) {
        const in106 = inPoly(bound106, o.x, o.y);
        const in100 = inPoly(bound100, o.x, o.y);
        const in094 = inPoly(bound094, o.x, o.y);
        if (!in106) out106++;
        if (!in100) { out100++; if (outPts.length<5) outPts.push({x:Math.round(o.x),y:Math.round(o.y),d:Math.round(Math.hypot(o.x-geom.cx,o.y-geom.cy))}); }
        if (!in094) out094++;
      }
      const poly = C.getSpiralPolyline();
      const arcs = tgt.map(t=>Math.round(t.arc));
      const tDists = tgt.map(t=>Math.round(distToPolyline(poly,t.x,t.y)));
      let maxArc=-1,minArc=1e9; for(const a of arcs){if(a>maxArc)maxArc=a;if(a<minArc)minArc=a;}
      return {
        obsCount: obs.length, out106, out100, out094, outPts,
        t0ToLine: Math.round(distToPolyline(poly,tgt[0].x,tgt[0].y)),
        t0: { x: Math.round(tgt[0].x), y: Math.round(tgt[0].y), d: Math.round(Math.hypot(tgt[0].x-geom.cx,tgt[0].y-geom.cy)) },
        tArcRange: [minArc, maxArc],
        tDists: tDists.slice(0,8)
      };
    }, idx);
    console.log('--- '+name+' ---');
    console.log('  障碍球: '+r.obsCount+'  出界(扩1.06): '+r.out106+'  出界(=最外圈1.0): '+r.out100+'  出界(缩0.94): '+r.out094);
    console.log('  出界球样例: '+JSON.stringify(r.outPts));
    console.log('  目标球弧长范围: ['+r.tArcRange[0]+','+r.tArcRange[1]+']  t0离线: '+r.t0ToLine+'px  t0位置('+r.t0.x+','+r.t0.y+') d='+r.t0.d);
    console.log('  目标球离线距离前8: '+r.tDists.join(','));
  }
  await browser.close();
})();
