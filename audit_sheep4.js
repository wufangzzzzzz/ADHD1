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
    const N = g.gridSize;

    // ===== 1. 数字镜像检查：face 朝向 class 必须与 num 内联 transform 同步 =====
    let mirror = 0;
    for (const c of cells) {
      const f = c.querySelector('.pattern10-face');
      const nm = c.querySelector('.pattern10-num');
      const right = f.classList.contains('p10-face-r');
      const numFlip = nm.style.transform.indexOf('scaleX(-1)') >= 0;
      if (right !== numFlip) mirror++;
    }
    // 模拟原 bug 场景：强制朝左后直接改 class 朝右（旧代码路径，不动数字）→ 数字必然镜像
    const f0 = cells[0].querySelector('.pattern10-face');
    const nm0 = cells[0].querySelector('.pattern10-num');
    f0.classList.remove('p10-face-r');
    nm0.style.transform = '';
    f0.classList.add('p10-face-r');
    let mirrorIfOldPath = nm0.style.transform.indexOf('scaleX(-1)') >= 0 ? 0 : 1;
    f0.classList.remove('p10-face-r');

    // ===== 2. 最外圈羊只跟内侧换（单步验证：劫持随机强制 c1 = cells[0] 边界羊）=====
    // 构造：所有羊朝左；cells[0]（左上角，边界）强制朝右。
    // cells[0] 候选（边界→内侧）= (1,0),(1,1) 即格4/格5；(0,1) 同圈不在候选。
    const origRand = Math.random;
    const stepTargets = new Set();
    let step1Changed = false;
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 300));
    for (let round = 0; round < 20; round++) {
      for (const c of cells) {
        const f = c.querySelector('.pattern10-face');
        f.classList.remove('p10-face-r');
        c.querySelector('.pattern10-num').style.transform = '';
      }
      cells[0].querySelector('.pattern10-face').classList.add('p10-face-r');
      cells[0].querySelector('.pattern10-num').style.transform = 'translate(-50%, -50%) scaleX(-1)';
      const o0 = cells[0].dataset.number, o1 = cells[1].dataset.number;
      Math.random = () => 0;                       // usable[0] = cells[0]，且 0<0.5 必触发互换
      g._p10SwapOnce();
      Math.random = origRand;
      if (cells[1].dataset.number !== o1) step1Changed = true;   // 同圈 (0,1) 不应被换
      if (cells[0].dataset.number !== o0) {
        for (let i = 0; i < cells.length; i++) {
          if (cells[i].dataset.number === o0) { stepTargets.add(i); break; }
        }
      }
    }
    const targets = [...stepTargets].sort((a,b)=>a-b).join(',');   // 期望 4,5（内侧）

    // ===== 3. FLIP 动画时长 =====
    const src = document.documentElement.outerHTML;
    const has1s = /transform 2s cubic-bezier/.test(src);
    const hasOld = /transform 0\.55s cubic-bezier/.test(src);

    return { N, mirror, mirrorIfOldPath, stepTargets: targets, step1Changed, has1s, hasOld };
  });
  console.log('格子:', r.N + 'x' + r.N);
  console.log('数字镜像(应为0):', r.mirror, '  旧代码路径会镜像(应为1):', r.mirrorIfOldPath);
  console.log('边界羊cells[0]单步换位目标格:', r.stepTargets, '(期望 4,5 = 内侧(1,0)/(1,1))');
  console.log('同圈格cells[1](0,1)是否被换(应为false):', r.step1Changed);
  console.log('FLIP动画 1s(应为true):', r.has1s, '  旧0.55s残留(应为false):', r.hasOld);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
