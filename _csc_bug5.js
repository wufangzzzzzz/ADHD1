// 决定性实验：真正"连对"整条目标序列（前四轮只横扫了第一颗球）
// 观测：每次连对的时间点 / morph 是否继续推进 / 画面是否继续变化 / 帧率 / 报错
// 关键：连对后若 draw() 抛错 -> animLoop 末尾的 rAF 不会注册 -> 画面永久冻结（但 morph 数值仍在涨）
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET = 'D:/专注力项目/color-spiral-connect.html';
const FILE = 'file:///' + encodeURI(path.resolve(TARGET).replace(/\\/g, '/'));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
const log = s => out.push(s);

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--new-window', '--window-size=1200,980']
    });
    const page = (await browser.pages())[0] || await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

    await page.evaluateOnNewDocument(() => {
      window.__f = [];              // rAF 时间戳
      window.__rafCalls = 0;        // draw 之后是否还继续排下一帧
      window.__err = 0;
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        window.__rafCalls++;
        return orig(function (t) { window.__f.push(t); return cb(t); });
      };
      window.addEventListener('error', function () { window.__err++; });

      window.__state = { lastT: null, acc: 0, wraps: 0 };
      window.__probe = function () {
        var s = window.__csc;
        var pts = s.getPts();
        var obs = pts.filter(function (p) { return !p.isTarget; });
        var ts = obs.map(function (p) { return p.shapeT; });
        var st = window.__state;
        if (st.lastT && ts.length === st.lastT.length) {
          for (var i = 0; i < ts.length; i++) {
            var d = ts[i] - st.lastT[i];
            if (d < 0) { d += 1; st.wraps++; }
            st.acc += d;
          }
        }
        st.lastT = ts;
        var nan = ts.filter(function (v) { return !(v >= 0 && v <= 1.001); }).length;
        var cv = document.getElementById('cv');
        var img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        var hash = 2166136261;
        for (var idx = 0; idx < img.length; idx += 4 * 7) {
          hash ^= img[idx]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 1]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 2]; hash = Math.imul(hash, 16777619);
        }
        var spdUndef = obs.filter(function (p) { return typeof p.shapeSpeed !== 'number'; }).length;
        return {
          hash: (hash >>> 0).toString(16),
          acc: Math.round(st.acc * 100) / 100,
          wraps: st.wraps,
          nanT: nan, spdUndef: spdUndef, nObs: obs.length,
          cur: s.getCur(), qn: s.getQn(), done: s.getDone(),
          targetTotal: s.getTarget() ? s.getTarget().seq.length : -1,
          connected: s.getTarget() ? s.getTarget().seq.filter(function (q) { return !!q.connected; }).length : -1,
          shapeActive: s.getShape().active,
          rafCalls: window.__rafCalls, jsErr: window.__err,
          strokes: s.getStrokes().length
        };
      };
      window.__fpsOf = function (clear) {
        var f = window.__f;
        if (f.length < 3) return { n: f.length, fps: 0 };
        f.sort(function (a, b) { return a - b; });
        var d = [];
        for (var i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
        d.sort(function (a, b) { return a - b; });
        var med = d[Math.floor(d.length / 2)];
        var p95 = d[Math.floor(d.length * 0.95)];
        var r = { n: f.length, fps: Math.round(1000 / med), med: Math.round(med * 100) / 100, p95: Math.round(p95 * 100) / 100, span: Math.round((f[f.length - 1] - f[0])) };
        if (clear) window.__f.length = 0;
        return r;
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1500);

    log('=== 决定性实验：真正连对整条目标序列 ===');
    const rect = await page.evaluate(() => { var q = document.getElementById('cv').getBoundingClientRect(); return { l: q.left, t: q.top }; });

    async function snap(tag) {
      const p = await page.evaluate(() => window.__probe());
      const f = await page.evaluate(() => window.__fpsOf(true));
      log('  ' + tag.padEnd(14) + ' fps=' + String(f.fps).padStart(3) + '(n=' + String(f.n).padStart(3) + ',p95=' + f.p95 + ') ' +
        'morph累计=' + String(p.acc).padStart(8) + ' 回绕=' + String(p.wraps).padStart(3) +
        ' hash=' + p.hash.padStart(9) + ' 连对=' + p.connected + '/' + p.targetTotal + ' 关=' + p.qn +
        ' NaN_T=' + p.nanT + ' 无速度=' + p.spdUndef + ' 帧调用=' + p.rafCalls + ' jsErr=' + p.jsErr);
      return p;
    }

    log('--- 阶段A：初始（未开变形）---');
    let a = await snap('A1初始');
    await page.evaluate(() => document.getElementById('btnShape').click());
    await sleep(600);
    let b = await snap('A2开变形');

    log('--- 阶段B：沿目标序列逐个"连对"（真实鼠标拖拽，中间插值）---');
    const seq = await page.evaluate(() => window.__csc.getTarget().seq.map(function (p) { return { x: p.x, y: p.y, rad: p.rad }; }));
    log('  目标球序列 ' + seq.length + ' 个：' + seq.map(s => '(' + Math.round(s.x) + ',' + Math.round(s.y) + ')').join(' '));

    let curBefore = await page.evaluate(() => window.__csc.getCur());
    await page.mouse.move(rect.l + seq[0].x, rect.t + seq[0].y);
    await page.mouse.down();

    for (let i = 0; i < seq.length; i++) {
      const from = i === 0 ? { x: seq[0].x, y: seq[0].y } : seq[i - 1];
      const to = seq[i];
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(8, Math.ceil(dist / 8));
      for (let k = 1; k <= steps; k++) {
        await page.mouse.move(rect.l + from.x + (to.x - from.x) * k / steps, rect.t + from.y + (to.y - from.y) * k / steps);
      }
      const now = await page.evaluate(() => window.__csc.getCur());
      if (now !== curBefore) {
        log('  >> 连对第 ' + now + ' 颗（curIdx ' + curBefore + '->' + now + '），立刻采样：');
        await snap('  连线后');
        curBefore = now;
      }
    }
    await page.mouse.up();
    log('--- 抬笔 ---');
    let c = await snap('B抬笔后');

    log('--- 阶段C：连对之后连续观测 12 秒（每 1.5 秒一采样）---');
    let lastAcc = c.acc, lastHash = c.hash, alive = 0, frozen = 0, lastRaf = c.rafCalls;
    for (let i = 1; i <= 8; i++) {
      await sleep(1500);
      const p = await snap('C' + i);
      const morphMoving = p.acc > lastAcc;
      const pixMoving = p.hash !== lastHash;
      const rafMoving = p.rafCalls > lastRaf;
      if (morphMoving && pixMoving && rafMoving) alive++; else {
        frozen++;
        log('     !! 异常采样：morph在动=' + morphMoving + ' 像素在变=' + pixMoving + ' rAF在走=' + rafMoving);
      }
      lastAcc = p.acc; lastHash = p.hash; lastRaf = p.rafCalls;
    }

    log('');
    log('=== 判定 ===');
    log('  连对后 8 次采样：全部正常=' + alive + ' 出现异常=' + frozen);
    log('  最终 curIdx=' + (await page.evaluate(() => window.__csc.getCur())) +
      ' 已完成关数=' + (await page.evaluate(() => window.__csc.getQn())));
    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_csc_bug5_out.txt', out.join('\n'), 'utf8');
  }
})();
