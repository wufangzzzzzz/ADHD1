const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    g.setPatternSub(10);
    await new Promise(r => setTimeout(r, 400));
    const cells = [...document.querySelectorAll('.pattern10-cell')];
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 300));
    // 构造唯一面对面：cells[0] 朝右，内侧 (1,0)/(1,1) 朝左
    for (const c of cells) {
      const f = c.querySelector('.pattern10-face');
      f.classList.remove('p10-face-r');
      c.querySelector('.pattern10-num').style.transform = '';
    }
    cells[0].querySelector('.pattern10-face').classList.add('p10-face-r');
    cells[0].querySelector('.pattern10-num').style.transform = 'translate(-50%, -50%) scaleX(-1)';
    g._p10SwapOnce();   // 触发互换
    const faces = [...document.querySelectorAll('.pattern10-face')];
    const moved = faces.filter(f => f.style.transition && f.style.transition.indexOf('transform') >= 0);
    const samples = moved.map(f => ({ t: f.style.transition, tr: f.style.transform }));
    return { moved: moved.length, samples, src: document.documentElement.outerHTML };
  });
  console.log('检测到动画中的 face 数:', r.moved);
  r.samples.forEach((s,i) => {
    console.log(`face${i}: transition=${s.t}`);
    console.log(`        transform=${s.tr}`);
  });
  const src = r.src;
  console.log('起点含 calc(-50% + 位移)(期望true):', /translate\(calc\(-50% \+ -?\d+px\), calc\(-50% \+ -?\d+px\)\)/.test(src));
  console.log('动画时长 2s(期望true):', /transform 2s cubic-bezier/.test(src), '  旧1.5s残留(期望false):', /transform 1\.5s cubic-bezier/.test(src));
  console.log('旧无居中起点残留(期望false):', /f\.style\.transform = 'translate\('\s*\+ dx/.test(src));
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
