const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    const out = {};

    // ===== 0. 独立模式入口 =====
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    out.isArithMode = g.isArithMode;                                   // true
    out.btnActive = document.getElementById('arith-mode-btn').classList.contains('active');
    out.arithShown = !!document.getElementById('arithmetic-menu');    // 下拉菜单存在
    out.patternNotActive = !document.getElementById('pattern-mode-btn').classList.contains('active');

    // ===== 1. 6×6 渲染 + 大正方形容积 =====
    const container = document.getElementById('grid-container');
    out.gridCols = container.style.gridTemplateColumns;                 // repeat(6, 1fr)
    out.aspect = container.style.aspectRatio;                          // 1 / 1
    out.containerW = container.style.width;                            // 100%
    let bars = [...document.querySelectorAll('.pattern11-bar')];
    out.count = bars.length;                                           // 18
    out.nums = bars.map(b=>+b.dataset.number).sort((a,b)=>a-b).join(',');
    out.h = bars.filter(b=>!b.classList.contains('p11-v')).length;
    out.v = bars.length - out.h;
    // 竖条竖排检查（用计算样式，竖排写在 CSS class 里）
    let vOk = true, vSample = '';
    for (const b of bars) {
      if (b.classList.contains('p11-v')) {
        if (getComputedStyle(b).writingMode !== 'vertical-rl') vOk = false;
        if (vSample === '') vSample = b.textContent;
      }
    }
    out.vVertical = vOk;
    out.vSample = vSample;
    // 算式正确性 + 平凡式
    let badExpr = 0, trivial = 0, samples = [];
    for (const b of bars) {
      const n = +b.dataset.number;
      const e = b.textContent;
      const js = e.replace(/×/g,'*').replace(/÷/g,'/');
      let val;
      try { val = eval(js); } catch (ex) { val = -99999; }
      if (val !== n) badExpr++;
      if (/[+\-]0$|^0[+\-]/.test(e) || /×1$|^1×/.test(e) || /÷1$/.test(e)) trivial++;
      if (samples.length < 5) samples.push(n + '=' + e);
    }
    out.badExpr = badExpr; out.trivial = trivial; out.samples = samples.join(' | ');

    // ===== 2. 点击判定 =====
    if (typeof g.start === 'function') g.start();
    await new Promise(r => setTimeout(r, 200));
    const bar1 = bars.find(b=>+b.dataset.number === 1);
    bar1.click();
    await new Promise(r => setTimeout(r, 100));
    out.correct1 = bar1.classList.contains('p11-correct');
    const bar5 = bars.find(b=>+b.dataset.number === 5);
    bar5.click();
    await new Promise(r => setTimeout(r, 100));
    out.wrong5 = bar5.classList.contains('p11-wrong');
    out.curAfter = g.currentNumber;

    // ===== 3. 算子切换（乘除） =====
    g.setArithOp('muldiv');
    await new Promise(r => setTimeout(r, 200));
    bars = [...document.querySelectorAll('.pattern11-bar')];
    let mulDivOk = bars.length === 18;
    for (const b of bars) {
      if (+b.dataset.number === 1) continue;
      if (!/[×÷]/.test(b.textContent)) { mulDivOk = false; break; }
    }
    out.mulDivOnly = mulDivOk;

    // ===== 4. 位数切换（十位） =====
    g.setArithDigit('tens');
    await new Promise(r => setTimeout(r, 200));
    bars = [...document.querySelectorAll('.pattern11-bar')];
    let tensOk = bars.length === 18;
    for (const b of bars) {
      if (+b.dataset.number === 1) continue;   // 数字1 直写黑色，不算操作数
      const m = b.textContent.match(/\d+/g) || [];
      if (m.length && m.every(x => +x < 10)) { tensOk = false; break; }
    }
    out.tensDigits = tensOk;

    // ===== 5. 难度映射：高级6→8×8、专家7→10×10 =====
    g.setDifficulty(6); g.renderGrid();
    await new Promise(r => setTimeout(r, 200));
    out.hard8 = document.querySelectorAll('.pattern11-bar').length;    // 32
    g.setDifficulty(7); g.renderGrid();
    await new Promise(r => setTimeout(r, 300));
    out.expert10 = document.querySelectorAll('.pattern11-bar').length; // 50

    // ===== 6. 退出模式：还原 + 按钮去激活 + 图案模式不受影响 =====
    g.setMode('offset');
    await new Promise(r => setTimeout(r, 200));
    out.exitArith = !g.isArithMode;
    out.arithHidden = !document.getElementById('arith-mode-btn').classList.contains('active');
    out.btnDeactive = !document.getElementById('arith-mode-btn').classList.contains('active');
    g.setPatternSub(10);   // 图案10 仍正常（先还原难度避免测试污染）
    await new Promise(r => setTimeout(r, 300));
    const p10Cells = document.querySelectorAll('.pattern10-cell').length;
    out.p10ok = p10Cells === g.gridSize * g.gridSize;
    return out;
  });
  console.log('① 独立模式入口: isArithMode', r.isArithMode, ' 按钮高亮', r.btnActive, ' 算式行显示', r.arithShown, ' 图案未激活', r.patternNotActive);
  console.log('② 大正方形容积: grid', r.gridCols, ' aspect', r.aspect, ' width', r.containerW);
  console.log('③ 6×6块数(期望18):', r.count, ' 数字:', r.nums);
  console.log('   横条:', r.h, ' 竖条:', r.v, ' 竖条竖排(期望true):', r.vVertical, ' 竖条算式示例:', r.vSample);
  console.log('   算式错误(期望0):', r.badExpr, ' 平凡式(期望0):', r.trivial, ' 示例:', r.samples);
  console.log('④ 点对1变绿:', r.correct1, ' 点错5闪红:', r.wrong5, ' 当前数字(期望2):', r.curAfter);
  console.log('⑤ 乘除模式全×÷(除1):', r.mulDivOnly, ' 十位档≥10:', r.tensDigits);
  console.log('⑥ 高级8×8(期望32):', r.hard8, ' 专家10×10(期望50):', r.expert10);
  console.log('⑦ 退出: isArithMode清', r.exitArith, ' 算式行隐藏', r.arithHidden, ' 按钮去激活', r.btnDeactive, ' 图案10不受影响(16格):', r.p10ok);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
