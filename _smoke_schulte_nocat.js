/* 删除图案12·猫猫后的回归冒烟：图案1~11 逐个开局 + 无残留检查 + 0 报错 */
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

  // 1) 残留检查
  R.residue = await p.evaluate(() => ({
    menu12: !!document.querySelector('[data-sub="12"]'),
    menuItems: [...document.querySelectorAll('.mode-menu-item')].map(e => e.textContent.trim()).filter(t => /^图案/.test(t)),
    hasFn12: typeof window.game._renderPatternGrid12 !== 'undefined',
    hasStop12: typeof window.game._stopP12 !== 'undefined',
    hasReset12: typeof window.game._p12Reset !== 'undefined',
    p12State: (window.game._p12 === undefined ? 'undefined' : String(window.game._p12))
  }));

  // 2) 图案1~11 逐个开局（图案6 含 3 个配色变体）
  const cases = [1, 2, 3, 4, 5, [6, 1], [6, 2], [6, 3], 7, 8, 9, 10, 11];
  R.patterns = [];
  for (const c of cases) {
    const [sub, color] = Array.isArray(c) ? c : [c, undefined];
    const res = await p.evaluate(async (sub, color) => {
      const g = window.game;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      try {
        if (g.isPlaying) { const s = document.getElementById('ms-stop') || null; g.stop ? g.stop() : null; }
      } catch (e) {}
      try { g.setPatternSub(sub, color); } catch (e) { return { sub, color, err: 'setPatternSub: ' + e.message }; }
      await sleep(120);
      const btn = document.getElementById('start-btn');
      if (btn) btn.click();
      await sleep(320);
      const cells = document.querySelectorAll('#grid-container .grid-cell').length;
      const anyKid = document.getElementById('grid-container').children.length;
      const canvas = document.querySelectorAll('#grid-container canvas').length;
      // 停止，避免影响下一轮
      const stopBtn = document.getElementById('stop-btn');
      if (stopBtn && !stopBtn.disabled) stopBtn.click();
      await sleep(80);
      return {
        sub, color,
        isPattern: !!g.isPatternMode, curSub: g.patternSub,
        playing: !!g.isPlaying,
        cells, anyKid, canvas,
        ok: (cells > 0 || anyKid > 0)
      };
    }, sub, color);
    R.patterns.push(res);
  }

  // 3) 默认模式也能正常开局（确认没伤到主流程）
  R.normalMode = await p.evaluate(async () => {
    const g = window.game;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    g.setPatternSub(0);            // 回到普通模式
    await sleep(120);
    const btn = document.getElementById('start-btn');
    if (btn) btn.click();
    await sleep(300);
    return {
      isPattern: !!g.isPatternMode,
      playing: !!g.isPlaying,
      cells: document.querySelectorAll('#grid-container .grid-cell').length,
      current: g.currentNumber
    };
  });

  // 4) 点击推进是否正常（点中 currentNumber 后数字 +1）
  R.clickAdvance = await p.evaluate(async () => {
    const g = window.game;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    if (!g.isPlaying) { const b = document.getElementById('start-btn'); if (b) b.click(); await sleep(300); }
    const before = g.currentNumber;
    const target = [...document.querySelectorAll('#grid-container .grid-cell')]
      .find(c => String(c.textContent).trim() === String(before));
    if (!target) return { before, after: before, clicked: false };
    target.click();
    await sleep(200);
    return { before, after: g.currentNumber, clicked: true };
  });

  R.ERRORS = ERRORS;
  console.log(JSON.stringify(R, null, 2));
  await b.close();
})();
