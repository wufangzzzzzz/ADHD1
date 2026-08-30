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
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const out = {};

    // ===== A. 横竖混合（非整行统一）：跑 5 局，统计出现“行内横竖混合”的局数 =====
    let mixedRounds = 0;
    for (let rd = 0; rd < 5; rd++) {
      g.renderGrid();
      await new Promise(r => setTimeout(r, 120));
      const bars = [...document.querySelectorAll('.pattern11-bar')];
      const N = g.gridSize;
      // 6×6：格高从 bar 位置反推行
      const rowOf = {};
      bars.forEach(b => {
        const r2 = Math.round(b.getBoundingClientRect().top);
        const row = r2;   // 用 top 值聚合
        if (!rowOf[row]) rowOf[row] = { h: 0, v: 0 };
        if (b.classList.contains('p11-v')) rowOf[row].v++; else rowOf[row].h++;
      });
      let rowMixed = false;
      for (const k in rowOf) { if (rowOf[k].h > 0 && rowOf[k].v > 0) rowMixed = true; }
      if (rowMixed) mixedRounds++;
    }
    out.mixedRounds = mixedRounds;   // 期望 ≥4（5局里大多混合）

    // ===== B. 统一字号 =====
    g.renderGrid();
    await new Promise(r => setTimeout(r, 150));
    const bars = [...document.querySelectorAll('.pattern11-bar')];
    const sizes = new Set(bars.map(b => b.style.fontSize));
    out.fontSizes = [...sizes].join(',');   // 期望只有一个值

    // ===== C. 居中（文字块中心 vs 条中心）=====
    let offMax = 0, offSample = '';
    for (const b of bars) {
      const br = b.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(b);
      const tr = range.getBoundingClientRect();
      const off = Math.hypot((tr.left + tr.width/2) - (br.left + br.width/2), (tr.top + tr.height/2) - (br.top + br.height/2));
      if (off > offMax) { offMax = off; offSample = b.textContent + (b.classList.contains('p11-v')?'[竖]':''); }
    }
    out.centerOff = Math.round(offMax);   // 期望 ≤ 6px
    out.centerSample = offSample;

    // ===== D. 竖排正立（upright）=====
    const vb = bars.find(b => b.classList.contains('p11-v'));
    out.textOrientation = vb ? getComputedStyle(vb).textOrientation : 'NO_V';   // 期望 upright
    out.writingMode = vb ? getComputedStyle(vb).writingMode : '';               // vertical-rl
    // 竖条文字是否真正竖排（文字块高 > 宽）
    const vr = vb ? (() => { const r2 = document.createRange(); r2.selectNodeContents(vb); return r2.getBoundingClientRect(); })() : null;
    out.vTextTall = vr ? (vr.height > vr.width) : false;   // 期望 true（竖着写）

    // ===== E. 功能回归 =====
    out.count = bars.length;
    let bad = 0;
    for (const b of bars) {
      const js = b.textContent.replace(/×/g,'*').replace(/÷/g,'/');
      if (eval(js) !== +b.dataset.number) bad++;
    }
    out.badExpr = bad;
    return out;
  });
  console.log('A. 5局中行内横竖混合局数(期望≥4):', r.mixedRounds);
  console.log('B. 字号集合(期望单一值):', r.fontSizes);
  console.log('C. 最大居中偏移(期望≤6px):', r.centerOff, 'px  样本:', r.centerSample);
  console.log('D. 竖排 textOrientation(期望upright):', r.textOrientation, ' writingMode:', r.writingMode, ' 文字块高>宽(竖写):', r.vTextTall);
  console.log('E. 块数:', r.count, ' 算式错误(期望0):', r.badExpr);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await browser.close();
})();
