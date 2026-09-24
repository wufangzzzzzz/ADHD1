const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file:///D:/专注力项目/math-sheep.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 800, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);

  const out = {};
  const R = {};

  // 1) 初始状态：25 只占位羊、羊图资源加载
  R.init = await page.evaluate(() => {
    const cells = document.querySelectorAll('#ms-pasture .ms-cell');
    const sheep = document.querySelectorAll('#ms-pasture .ms-sheep');
    const cs = getComputedStyle(document.querySelector('.ms-sheep'));
    return {
      cells: cells.length,
      sheep: sheep.length,
      sheepImg: cs.backgroundImage.indexOf('pattern10-sheep.png') >= 0,
      idx: document.getElementById('ms-idx').textContent,
      resultVisible: !!document.getElementById('ms-r-correct').offsetParent
    };
  });

  // 2) 资源可用性（两张图必须真能加载）
  R.assets = await page.evaluate(async () => {
    function load(src) {
      return new Promise(res => {
        const im = new Image();
        im.onload = () => res({ ok: true, w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => res({ ok: false });
        im.src = src;
      });
    }
    return { sheep: await load('pattern10-sheep.png'), wolf: await load('wolf-bf2.png') };
  });

  // 3) 设 5 秒/题便于快速验超时，然后开局
  await page.evaluate(() => {
    document.querySelector('#ms-times .ms-btn[data-sec="5"]').click();
  });
  await sleep(120);
  await page.click('#ms-start');
  await sleep(500);

  R.afterStart = await page.evaluate(() => {
    const nums = [...document.querySelectorAll('#ms-pasture .ms-cell')].map(c => c.dataset.number);
    return {
      expr: document.getElementById('ms-expr').textContent,
      idx: document.getElementById('ms-idx').textContent,
      uniqueNums: new Set(nums).size,
      numsAreNumeric: nums.every(n => /^-?\d+$/.test(n)),
      barWidth: document.getElementById('ms-timerbar').style.width,
      secPerQ: 5
    };
  });

  // 3.5) 运行中锁定：主按钮禁用且为"进行中"，题型/时间按钮不可改（防误触静默重开）
  R.locked = await page.evaluate(() => {
    const start = document.getElementById('ms-start');
    const typeBtns = [...document.querySelectorAll('#ms-types .ms-btn')];
    const timeBtns = [...document.querySelectorAll('#ms-times .ms-btn')];
    return {
      startText: start.textContent,
      startDisabled: start.disabled,
      typesAllDisabled: typeBtns.every(b => b.disabled),
      timesAllDisabled: timeBtns.every(b => b.disabled),
      stopEnabled: !document.getElementById('ms-stop').disabled
    };
  });

  // 4) 点错：分数不增，出现 ms-wrong，连对归零
  const wrongInfo = await page.evaluate(() => {
    const ans = null;
    const expr = document.getElementById('ms-expr').textContent; // 形如 "7 + 8 = ?"
    const body = expr.replace('= ?', '').trim();
    let res = null;
    if (body.includes('+')) { const [a, b] = body.split('+').map(s => +s.trim()); res = a + b; }
    else if (body.includes('-')) { const [a, b] = body.split('-').map(s => +s.trim()); res = a - b; }
    else if (body.includes('×')) { const [a, b] = body.split('×').map(s => +s.trim()); res = a * b; }
    else if (body.includes('÷')) { const [a, b] = body.split('÷').map(s => +s.trim()); res = a / b; }
    const cells = [...document.querySelectorAll('#ms-pasture .ms-cell')];
    const target = cells.find(c => +c.dataset.number !== res);
    const before = document.getElementById('ms-score').textContent;
    target.click();
    return { before, cls: target.className, res };
  });
  R.wrong = await page.evaluate(() => ({
    score: document.getElementById('ms-score').textContent,
    streak: document.getElementById('ms-streak').textContent,
    wrongCells: document.querySelectorAll('#ms-pasture .ms-cell.ms-wrong').length,
    idx: document.getElementById('ms-idx').textContent
  }));
  R.wrongAnsweredWaitPrice = wrongInfo.res;
  await sleep(500);

  // 5) 点对：羊按头的朝向飞出、加分、题目推进
  R.right = await page.evaluate(() => {
    const expr = document.getElementById('ms-expr').textContent;
    const body = expr.replace('= ?', '').trim();
    let res = null;
    if (body.includes('+')) { const [a, b] = body.split('+').map(s => +s.trim()); res = a + b; }
    else if (body.includes('-')) { const [a, b] = body.split('-').map(s => +s.trim()); res = a - b; }
    else if (body.includes('×')) { const [a, b] = body.split('×').map(s => +s.trim()); res = a * b; }
    else if (body.includes('÷')) { const [a, b] = body.split('÷').map(s => +s.trim()); res = a / b; }
    const cells = [...document.querySelectorAll('#ms-pasture .ms-cell')];
    const target = cells.find(c => +c.dataset.number === res);
    const faceRight = !!(target.querySelector('.ms-face') || {}).classList
      && target.querySelector('.ms-face').classList.contains('ms-face-r');
    const before = document.getElementById('ms-score').textContent;
    target.click();
    return {
      found: !!target, expr, res, faceRight, before,
      cls: target.className,
      expectedFly: faceRight ? 'ms-fly-right' : 'ms-fly-left'
    };
  });
  R.rightAfter = await page.evaluate(() => ({
    score: document.getElementById('ms-score').textContent,
    streak: document.getElementById('ms-streak').textContent,
    flying: document.querySelectorAll('#ms-pasture .ms-cell.ms-fly-left, #ms-pasture .ms-cell.ms-fly-right').length
  }));
  await sleep(1300);
  R.afterNext = await page.evaluate(() => ({
    idx: document.getElementById('ms-idx').textContent,
    cells: document.querySelectorAll('#ms-pasture .ms-cell').length,
    numsNumeric: [...document.querySelectorAll('#ms-pasture .ms-cell')].every(c => /^-?\d+$/.test(c.dataset.number))
  }));

  // 6) 超时：5 秒不点 → 狼出现 → 叼走 → 进下一题
  const t0 = Date.now();
  R.timeoutWatch = { wolfSeen: false, takenSeen: false };
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline) {
    const st = await page.evaluate(() => ({
      wolf: document.querySelectorAll('#ms-pasture .ms-cell.ms-wolfcome').length,
      taken: document.querySelectorAll('#ms-pasture .ms-cell.ms-taken').length,
      txt: document.getElementById('ms-timertext').textContent
    }));
    if (st.wolf) R.timeoutWatch.wolfSeen = true;
    if (st.taken) R.timeoutWatch.takenSeen = true;
    if (R.timeoutWatch.wolfSeen && R.timeoutWatch.takenSeen) break;
    await sleep(120);
  }
  R.timeoutWatch.elapsedMs = Date.now() - t0;
  R.timeoutWatch.txt = await page.evaluate(() => document.getElementById('ms-timertext').textContent);
  await sleep(400);
  R.afterTimeout = await page.evaluate(() => ({
    idx: document.getElementById('ms-idx').textContent,
    streak: document.getElementById('ms-streak').textContent,
    wolfCells: document.querySelectorAll('#ms-pasture .ms-cell.ms-wolfcome').length
  }));

  // 7) 一键跑完剩余题：全部点对，验证结算
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => !!(document.getElementById('ms-r-correct').textContent !== '—'));
    if (done) break;
    await page.evaluate(() => {
      const expr = document.getElementById('ms-expr').textContent;
      if (!expr.includes('=')) return;
      const body = expr.replace('= ?', '').trim();
      let res = null;
      if (body.includes('+')) { const [a, b] = body.split('+').map(s => +s.trim()); res = a + b; }
      else if (body.includes('-')) { const [a, b] = body.split('-').map(s => +s.trim()); res = a - b; }
      else if (body.includes('×')) { const [a, b] = body.split('×').map(s => +s.trim()); res = a * b; }
      else if (body.includes('÷')) { const [a, b] = body.split('÷').map(s => +s.trim()); res = a / b; }
      const cells = [...document.querySelectorAll('#ms-pasture .ms-cell')];
      const t = cells.find(c => +c.dataset.number === res);
      if (t) t.click();
    });
    await sleep(1150);
  }
  R.result = await page.evaluate(() => ({
    correct: document.getElementById('ms-r-correct').textContent,
    score: document.getElementById('ms-r-score').textContent,
    time: document.getElementById('ms-r-time').textContent,
    acc: document.getElementById('ms-r-acc').textContent,
    verdict: document.getElementById('ms-verdict').textContent,
    startBtn: document.getElementById('ms-start').textContent
  }));

  // 8) 结算后：唯一「再玩一次」主按钮可点 → 直接重开
  R.result.onlyOneReplay = await page.evaluate(() => {
    const start = document.getElementById('ms-start');
    const allBtns = [...document.querySelectorAll('.ms-main')];
    return {
      replayTexts: allBtns.map(b => b.textContent),
      startText: start.textContent,
      startDisabled: start.disabled
    };
  });
  await page.click('#ms-start');
  await sleep(700);
  R.replay = await page.evaluate(() => ({
    idx: document.getElementById('ms-idx').textContent,
    score: document.getElementById('ms-score').textContent,
    rcorrect: document.getElementById('ms-r-correct').textContent,
    cells: document.querySelectorAll('#ms-pasture .ms-cell').length,
    startText: document.getElementById('ms-start').textContent,
    startDisabled: document.getElementById('ms-start').disabled
  }));

  // 9) 停止按钮
  await page.click('#ms-stop');
  await sleep(300);
  R.stopped = await page.evaluate(() => ({
    txt: document.getElementById('ms-timertext').textContent,
    stopDisabled: document.getElementById('ms-stop').disabled
  }));

  // 10) 竖屏适配（尺寸切换后格子仍为正方形）
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await sleep(500);
  R.portrait = await page.evaluate(() => {
    const c = document.querySelector('#ms-pasture .ms-cell');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), square: Math.abs(r.width - r.height) < 1.5 };
  });
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1 });
  await sleep(500);
  R.landscape = await page.evaluate(() => {
    const board = document.querySelector('.ms-board');
    const c = document.querySelector('#ms-pasture .ms-cell');
    const r = c ? c.getBoundingClientRect() : null;
    return {
      dir: getComputedStyle(board).flexDirection,
      square: r ? Math.abs(r.width - r.height) < 1.5 : false,
      w: r ? Math.round(r.width) : 0
    };
  });

  out.R = R;
  out.ERRORS = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
