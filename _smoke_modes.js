/* 补充回归：普通/偏移/混沌/算数(加减乘除) 四个主模式 + 点击推进 + 通关判定 */
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/专注力项目/schulte-grid.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });
  const p = await b.newPage();
  const ERRORS = [];
  p.on('console', m => { if (m.type() === 'error') ERRORS.push('console: ' + m.text()); });
  p.on('pageerror', e => ERRORS.push('pageerror: ' + e.message));
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(500);

  const R = {};
  R.modes = [];
  for (const mode of ['normal', 'offset', 'chaos', 'arithmetic']) {
    const res = await p.evaluate(async (mode) => {
      const g = window.game;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      // 先停当前局
      const stopBtn = document.getElementById('stop-btn');
      if (stopBtn && !stopBtn.disabled) { stopBtn.click(); await sleep(80); }
      g.setMode(mode);
      await sleep(150);
      const startBtn = document.getElementById('start-btn');
      if (startBtn) startBtn.click();
      await sleep(350);
      const gc = document.getElementById('grid-container');
      const cells = document.querySelectorAll('#grid-container .grid-cell').length;
      // 算数模式：格子里是算式；普通模式：格子里是数字
      const firstTxt = cells ? document.querySelector('#grid-container .grid-cell').textContent.trim() : '';
      return {
        mode,
        isPattern: !!g.isPatternMode,
        isArith: !!g.isArithMode,
        playing: !!g.isPlaying,
        cells, firstTxt: firstTxt.slice(0, 12),
        current: g.currentNumber,
        max: (typeof g.getMaxNumber === 'function' ? g.getMaxNumber() : null)
      };
    }, mode);
    R.modes.push(res);
  }

  // 算数模式：点中当前目标应推进（验证 _p11BuildBlocks 等紧邻删除区的代码没被误伤）
  R.arithAdvance = await p.evaluate(async () => {
    const g = window.game;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    g.setMode('arithmetic'); await sleep(150);
    let startBtn = document.getElementById('start-btn');
    if (!g.isPlaying) { startBtn.click(); await sleep(350); }
    const before = g.currentNumber;
    const cells = [...document.querySelectorAll('#grid-container .grid-cell')];
    const target = cells.find(c => c.dataset.ans === String(before))
                 || cells.find(c => c.textContent.trim() === String(before));
    if (!target) return { before, after: before, clicked: false, note: '未找到目标格' };
    target.click(); await sleep(200);
    return { before, after: g.currentNumber, clicked: true };
  });

  // 普通模式：点中 currentNumber 应推进
  R.normalAdvance = await p.evaluate(async () => {
    const g = window.game;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    g.setMode('normal'); await sleep(150);
    if (!g.isPlaying) { const s = document.getElementById('start-btn'); if (s) s.click(); await sleep(350); }
    const before = g.currentNumber;
    const target = [...document.querySelectorAll('#grid-container .grid-cell')]
      .find(c => c.textContent.trim() === String(before));
    if (!target) return { before, after: before, clicked: false };
    target.click(); await sleep(200);
    return { before, after: g.currentNumber, clicked: true };
  });

  // 普通模式全通关（自动点对，验证 completeGame 链路）
  R.fullRun = await p.evaluate(async () => {
    const g = window.game;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    g.setMode('normal'); await sleep(150);
    if (!g.isPlaying) { const s = document.getElementById('start-btn'); if (s) s.click(); await sleep(350); }
    let guard = 0;
    while (g.isPlaying && guard++ < 40) {
      const t = [...document.querySelectorAll('#grid-container .grid-cell')]
        .find(c => c.textContent.trim() === String(g.currentNumber));
      if (!t) break;
      t.click(); await sleep(60);
    }
    await sleep(300);
    return {
      finished: !g.isPlaying,
      steps: guard,
      resultShown: !!document.querySelector('#result-modal.show, .result-modal.show, #result.show'),
      bodyHasResult: /用时|秒|成绩|完成/.test(document.body.innerText)
    };
  });

  R.ERRORS = ERRORS;
  console.log(JSON.stringify(R, null, 2));
  await b.close();
})();
