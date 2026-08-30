const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 800, height: 800 });
  await p.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const r = await p.evaluate(() => {
    document.querySelector('#grpSpiral .seg-btn[data-shape="2"]').click();
    const C = window.__csc;
    const pts = C.getPts();
    const poly = C.getSpiralPolyline();
    const len = [0]; for(let i=1;i<poly.length;i++) len.push(len[i-1]+Math.hypot(poly[i].x-poly[i-1].x,poly[i].y-poly[i-1].y));
    const total = len[len.length-1];
    function segDist(ax,ay,bx,by,px,py){var dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(l2===0)return Math.hypot(px-ax,py-ay);var t=((px-ax)*dx+(py-ay)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));}
    function d2poly(px,py){var best=1e9;for(var i=0;i<poly.length-1;i++){var d=segDist(poly[i].x,poly[i].y,poly[i+1].x,poly[i+1].y,px,py);if(d<best)best=d;}return best;}
    const obs = pts.filter(p=>!p.isTarget);
    const tgt = pts.filter(p=>p.isTarget).sort((a,b)=>b.arc-a.arc);
    // 干扰球按弧长分4箱（均匀性）
    const buckets=[0,0,0,0];
    let tMinD=1e9,oMinD=1e9,oTouch=0,tTouch=0;
    obs.forEach(o=>{ const d=d2poly(o.x,o.y); if(d<oMinD)oMinD=d; if(d<o.rad+1)oTouch++;
      const a=(()=>{let best=1e9,ba=0;for(let i=0;i<poly.length-1;i++){const dd=segDist(poly[i].x,poly[i].y,poly[i+1].x,poly[i+1].y,o.x,o.y);if(dd<best){best=dd;ba=len[i]+Math.hypot(poly[i+1].x-poly[i].x,poly[i+1].y-poly[i].y)*0.5;}}return ba;})();
      buckets[Math.min(3,Math.floor(a/total*4))]++;
    });
    tgt.forEach(t=>{ const d=d2poly(t.x,t.y); if(d<tMinD)tMinD=d; if(d<t.rad+1)tTouch++; });
    return { obsCount:obs.length, tgtCount:tgt.length, buckets, tMinD:Math.round(tMinD), oMinD:Math.round(oMinD), oTouch, tTouch, t0:{x:Math.round(tgt[0].x),y:Math.round(tgt[0].y),d:Math.round(Math.hypot(tgt[0].x-272,tgt[0].y-272))} };
  });
  console.log('方形: 目标'+r.tgtCount+' 干扰'+r.obsCount);
  console.log('干扰弧长分布(4段,应均匀~25%):', r.buckets.join('/'), '=', r.buckets.map(x=>Math.round(x/r.obsCount*100)).join('%/')+'%');
  console.log('压线: 目标'+r.tTouch+' 干扰'+r.oTouch+'  离线min: 目标'+r.tMinD+' 干扰'+r.oMinD);
  console.log('起点(出口): ('+r.t0.x+','+r.t0.y+') d='+r.t0.d);
  await b.close();
})();
