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
    const C = window.__csc, geom = C.getGeom();
    function t0(){ return C.getPts().filter(x=>x.isTarget).sort((a,b)=>b.arc-a.arc)[0]; }
    function info(t){ return { x:Math.round(t.x), y:Math.round(t.y), d:Math.round(Math.hypot(t.x-geom.cx,t.y-geom.cy)) }; }
    const def = info(t0());
    const sl = document.getElementById('rotSlider');
    sl.value = 90; sl.dispatchEvent(new Event('input', { bubbles:true }));
    const r90 = info(t0());
    sl.value = 180; sl.dispatchEvent(new Event('input', { bubbles:true }));
    const r180 = info(t0());
    sl.value = 270; sl.dispatchEvent(new Event('input', { bubbles:true }));
    const r270 = info(t0());
    return { def, r90, r180, r270 };
  });
  console.log('方形 target[0]:');
  console.log('  0°  :', JSON.stringify(r.def));
  console.log('  90° :', JSON.stringify(r.r90));
  console.log('  180°:', JSON.stringify(r.r180));
  console.log('  270°:', JSON.stringify(r.r270));
  const moving = r.def.x !== r.r90.x || r.def.y !== r.r90.y;
  console.log('旋转生效(起点跟着转):', moving ? '是 ✓' : '否 ✗');
  await b.close();
})();
