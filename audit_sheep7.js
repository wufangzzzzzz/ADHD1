const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    g.setPatternSub(10);
    await new Promise(r => setTimeout(r, 400));
    const cells = [...document.querySelectorAll('.pattern10-cell')];
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 300));
    // 构造唯一面对面：cells[0](0,0) 朝右，内侧 (1,1)=cells[5] 朝左
    for (const c of cells) {
      const f = c.querySelector('.pattern10-face');
      f.classList.remove('p10-face-r');
      c.querySelector('.pattern10-num').style.transform = '';
    }
    cells[0].querySelector('.pattern10-face').classList.add('p10-face-r');
    cells[0].querySelector('.pattern10-num').style.transform = 'translate(-50%, -50%) scaleX(-1)';
    // 记录旧格中心（格0）和新格中心（格5，face2 原属格5 移到格0，face1 移去格5）
    const c0r = cells[0].getBoundingClientRect(), c5r = cells[5].getBoundingClientRect();
    const oldCenter = { x: c0r.left + c0r.width/2, y: c0r.top + c0r.height/2 };
    const newCenter = { x: c5r.left + c5r.width/2, y: c5r.top + c5r.height/2 };
    g._p10SwapOnce();
    // 追踪移到格5 的那只羊（face1，现在在 cells[5] 里）
    const moved = cells[5].querySelector('.pattern10-face');
    const samples = [];
    for (let i = 0; i <= 5; i++) {
      const b = moved.getBoundingClientRect();
      samples.push({ x: Math.round(b.left + b.width/2), y: Math.round(b.top + b.height/2) });
      await new Promise(r => setTimeout(r, 400));
    }
    return { oldCenter, newCenter, samples };
  });
  console.log('旧格中心:', JSON.stringify(r.oldCenter), ' 新格中心:', JSON.stringify(r.newCenter));
  console.log('轨迹采样(每400ms, 应逐渐从旧格中心逼近新格中心):');
  r.samples.forEach((s,i)=>console.log('  t' + (i*400) + 'ms → (' + s.x + ',' + s.y + ')'));
  const s = r.samples;
  let monotonic = true;
  for (let i = 1; i < s.length; i++) {
    const d1 = Math.hypot(s[i-1].x - r.newCenter.x, s[i-1].y - r.newCenter.y);
    const d2 = Math.hypot(s[i].x - r.newCenter.x, s[i].y - r.newCenter.y);
    if (d2 > d1 + 1) { monotonic = false; break; }   // 若远离新中心 = 先退
  }
  const startDist = Math.hypot(s[0].x - r.oldCenter.x, s[0].y - r.oldCenter.y);
  const endDist = Math.hypot(s[5].x - r.newCenter.x, s[5].y - r.newCenter.y);
  console.log('起点距旧格中心(应≈0):', Math.round(startDist), 'px  终点距新格中心(应≈0):', Math.round(endDist), 'px');
  console.log('轨迹单调逼近新中心(无先退,期望true):', monotonic);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
