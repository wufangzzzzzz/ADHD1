const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8123/color-spiral-connect.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { document.querySelector('#grpSpiral .seg-btn[data-shape="1"]').click(); });
  await new Promise(r => setTimeout(r, 400));
  const data = await page.evaluate(() => {
    const pts = window.__csc.getPts().filter(p => p.isTarget);
    const poly = window.__csc.getSpiralPolyline();
    function segDist(x1,y1,x2,y2,px,py){ const dx=x2-x1, dy=y2-y1, len2=dx*dx+dy*dy; if(len2===0) return Math.hypot(px-x1,py-y1); let t=((px-x1)*dx+(py-y1)*dy)/len2; t=Math.max(0,Math.min(1,t)); return Math.hypot(px-(x1+t*dx), py-(y1+t*dy)); }
    function distToPoly(px,py){ let best=Infinity; for(let i=0;i<poly.length-1;i++) best=Math.min(best, segDist(poly[i].x,poly[i].y,poly[i+1].x,poly[i+1].y,px,py)); return best; }
    return pts.map((p,i) => ({ i, rad: p.rad, d: distToPoly(p.x,p.y), bad: distToPoly(p.x,p.y) < p.rad + 2 })).sort((a,b)=>a.d-b.d);
  });
  console.log(data.slice(0,5));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
