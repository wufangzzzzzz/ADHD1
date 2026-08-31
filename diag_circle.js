const puppeteer = require('puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const path = 'D:/专注力项目/visual-match.html';
const fileUrl = 'file:///' + path.replace(/\\/g,'/');

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args:['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 620, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    function regionPath(br, bc, r, size, gridN) {
      var s = size / gridN, x0 = bc*s, y0 = br*s;
      var cx = x0 + s/2, cy = y0 + s/2, half = s/2, rr = s/2, d = s * 0.3535533906;
      function pt(x,y){ return (cx+x).toFixed(2)+","+(cy+y).toFixed(2); }
      function arc(a0,a1,n){ var s2=''; for(var t=0;t<=n;t++){ var a=(a0+(a1-a0)*t/n)*Math.PI/180; s2 += (t?' ':'') + (cx+rr*Math.cos(a)).toFixed(2)+","+(cy+rr*Math.sin(a)).toFixed(2); } return s2; }
      var TL=pt(-half,-half),TR=pt(half,-half),BR=pt(half,half),BL=pt(-half,half);
      var T=pt(0,-half),R=pt(half,0),B=pt(0,half),L=pt(-half,0);
      var PTL=pt(-d,-d),PTR=pt(d,-d),PBR=pt(d,d),PBL=pt(-d,d),C=pt(0,0);
      if (r===0) return 'M '+C+' L '+PTL+' '+arc(225,315,6)+' Z';
      if (r===1) return 'M '+C+' L '+PTR+' '+arc(315,405,6)+' Z';
      if (r===2) return 'M '+C+' L '+PBR+' '+arc(45,135,6)+' Z';
      if (r===3) return 'M '+C+' L '+PBL+' '+arc(135,225,6)+' Z';
      if (r===4) return 'M '+TL+' L '+T+' L '+TR+' L '+PTR+' '+arc(315,225,6)+' L '+PTL+' Z';
      if (r===5) return 'M '+TR+' L '+R+' L '+BR+' L '+PBR+' '+arc(45,-45,6)+' L '+PTR+' Z';
      if (r===6) return 'M '+BR+' L '+B+' L '+BL+' L '+PBL+' '+arc(135,45,6)+' L '+PBR+' Z';
      if (r===7) return 'M '+BL+' L '+L+' L '+TL+' L '+PTL+' '+arc(225,135,6)+' L '+PBL+' Z';
      return '';
    }
    const size = 200, gridN = 2;
    const s = size / gridN; // small 边长
    const cx = s/2, cy = s/2, rr = s/2;
    let out = '<div style="display:flex;flex-wrap:wrap;gap:16px;padding:20px;font:13px sans-serif">';
    for (let r=0; r<8; r++) {
      const d = regionPath(0,0,r,size,gridN);
      out += '<div style="text-align:center">'
           + '<svg width="200" height="200" viewBox="0 0 '+size+' '+size+'">'
           + '<rect x="0" y="0" width="'+s+'" height="'+s+'" fill="#fff" stroke="#000" stroke-width="0.8"/>'
           + '<line x1="0" y1="0" x2="'+s+'" y2="'+s+'" stroke="#000" stroke-width="0.6"/>'
           + '<line x1="'+s+'" y1="0" x2="0" y2="'+s+'" stroke="#000" stroke-width="0.6"/>'
           + '<circle cx="'+cx+'" cy="'+cy+'" r="'+rr+'" fill="none" stroke="#000" stroke-width="0.6"/>'
           + '<path d="'+d+'" fill="#e74c3c" stroke="#e74c3c" stroke-width="0.8"/>'
           + '</svg><div>r='+r+'</div></div>';
    }
    out += '</div>';
    document.body.innerHTML = out;
  });

  await page.screenshot({ path: 'D:/专注力项目/shot_circle_debug.png' });
  await browser.close();
  console.log('done');
})();
