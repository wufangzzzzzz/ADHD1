const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900 });
  await page.goto('http://127.0.0.1:8123/color-spiral-connect.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  for (const [ds, name] of [['0','circle'], ['1','triangle'], ['2','square']]) {
    await page.evaluate((d) => { document.querySelector(`#grpSpiral .seg-btn[data-shape="${d}"]`).click(); }, ds);
    await new Promise(r => setTimeout(r, 400));
    const info = await page.evaluate(() => {
      const pts = window.__csc.getPts();
      const poly = window.__csc.getSpiralPolyline();
      function segDist(x1,y1,x2,y2,px,py){
        const dx=x2-x1, dy=y2-y1, len2=dx*dx+dy*dy;
        if(len2===0) return Math.hypot(px-x1,py-y1);
        let t=((px-x1)*dx+(py-y1)*dy)/len2; t=Math.max(0,Math.min(1,t));
        return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
      }
      function distToPoly(px,py){
        let best=Infinity;
        for(let i=0;i<poly.length-1;i++) best=Math.min(best, segDist(poly[i].x,poly[i].y,poly[i+1].x,poly[i+1].y,px,py));
        return best;
      }
      let tMin=Infinity,tMax=-Infinity,oMin=Infinity,oMax=-Infinity,tCnt=0,oCnt=0;
      let tTouch=0,oTouch=0, tOut=0, oOut=0;
      for(const p of pts){
        const d = distToPoly(p.x,p.y);
        if(p.isTarget){ tCnt++; tMin=Math.min(tMin,d); tMax=Math.max(tMax,d); if(d < p.rad+1) tTouch++; if(d > 30) tOut++; }
        else { oCnt++; oMin=Math.min(oMin,d); oMax=Math.max(oMax,d); if(d < p.rad+1) oTouch++; if(d > 30) oOut++; }
      }
      return { name: document.querySelector('#printDesc')?.textContent||'', tCnt, oCnt, tMin, tMax, oMin, oMax, tTouch, oTouch, tOut, oOut };
    });
    console.log(info);
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
