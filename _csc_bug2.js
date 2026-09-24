// 全程真实鼠标事件 + 定期采样，定位「色块变形冻结」到底在哪一步发生
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET = 'D:/专注力项目/color-spiral-connect.html';
const FILE = 'file:///' + encodeURI(path.resolve(TARGET).replace(/\\/g, '/'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
const log = s => out.push(s);

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 950, deviceScaleFactor: 1 });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

    await page.evaluateOnNewDocument(() => {
      window.__rafCount = 0;
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        return orig(function (t) { window.__rafCount++; return cb(t); });
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1000);

    // 页面内取数：帧数 / 干扰球 shapeT 之和 / shapeFrom 序列 / 笔迹规模 / rect
    const sample = () => page.evaluate(() => {
      var s = window.__csc;
      var pts = s.getPts();
      var obs = pts.filter(function (p) { return !p.isTarget; });
      return {
        raf: window.__rafCount,
        tSum: obs.reduce(function (a, p) { return a + (isFinite(p.shapeT) ? p.shapeT : NaN); }, 0),
        froms: obs.map(function (p) { return p.shapeFrom; }).join(''),
        nObs: obs.length,
        nTarget: pts.length - obs.length,
        strokes: s.getStrokes().length,
        strokePts: s.getStrokes().reduce(function (a, st) { return a + st.length; }, 0),
        cur: s.getCur(),
        qn: s.getQn(),
        locked: null,
        shapeActive: s.getShape().active,
        wrong: s.getWrong()
      };
    });

    const rows = [];
    let lastRaf = 0, lastT = 0, lastStroke = 0;
    async function tick(tag) {
      const s = await sample();
      const dRaf = s.raf - lastRaf;
      const dT = s.tSum - lastT;
      const fps = Math.round(dRaf / 0.4);   // 采样间隔 0.4s
      rows.push({ tag, dRaf, fps, dT: Math.round(dT * 10000) / 10000, nObs: s.nObs, strokes: s.strokes, strokePts: s.strokePts, cur: s.cur, qn: s.qn, shapeActive: s.shapeActive, wrong: s.wrong });
      lastRaf = s.raf; lastT = s.tSum;
      return s;
    }

    log('=== 逐步采样（每 400ms 一次；dT=干扰球 shapeT 推进总量，为 0 即冻结）===');
    log('  tag                     fps   rafΔ   dT      球数  笔数/点数   cur qn  形状开关');
    function dump(r) {
      log('  ' + r.tag.padEnd(22) + String(r.fps).padStart(4) + '  ' + String(r.dRaf).padStart(5) + '  ' + String(r.dT).padStart(7) + '  ' +
        String(r.nObs).padStart(4) + '  ' + String(r.strokes + '/' + r.strokePts).padStart(9) + '  ' + String(r.cur).padStart(3) + String(r.qn).padStart(3) + '  ' + String(r.shapeActive));
    }

    await tick('A 初始(dump)');
    dump(rows.pop());

    // 开启动态形状
    await page.evaluate(() => document.getElementById('btnShape').click());
    await sleep(400);
    await tick('B 开启变形后1'); dump(rows.pop());
    await sleep(400);
    await tick('B 开启变形后2'); dump(rows.pop());

    // 真实鼠标：完成到 seq[0] 的第一次连线（沿路径多打几个点）
    const rect = await page.evaluate(() => { var r = document.getElementById('cv').getBoundingClientRect(); return { l: r.left, t: r.top }; });
    const seq0 = await page.evaluate(() => { var p = window.__csc.getTarget().seq[0]; return { x: p.x, y: p.y, rad: p.rad }; });

    await page.mouse.move(rect.l + seq0.x - 60, rect.t + seq0.y);
    await page.mouse.down();
    for (let k = -60; k <= 0; k += 6) await page.mouse.move(rect.l + seq0.x + k, rect.t + seq0.y + 1);
    await page.mouse.up();
    await sleep(400);
    await tick('C 第一次连线后1'); dump(rows.pop());
    await sleep(400);
    await tick('C 第一次连线后2'); dump(rows.pop());
    await sleep(400);
    await tick('C 第一次连线后3'); dump(rows.pop());

    // 再画几笔长线（模拟真实连续拖拽）
    for (let n = 0; n < 3; n++) {
      await page.mouse.move(rect.l + 200, rect.t + 200);
      await page.mouse.down();
      for (let k = 0; k < 260; k++) {
        await page.mouse.move(rect.l + 200 + Math.cos(k / 12) * (60 + k), rect.t + 200 + Math.sin(k / 12) * (60 + k));
      }
      await page.mouse.up();
      await sleep(400);
      await tick('D 长笔迹' + (n + 1)); dump(rows.pop());
    }

    // 连完一整关（按 seq 顺序走一遍）
    const seq = await page.evaluate(() => window.__csc.getTarget().seq.map(p => ({ x: p.x, y: p.y })));
    await page.mouse.move(rect.l + seq[0].x, rect.t + seq[0].y);
    await page.mouse.down();
    for (let i = 0; i < seq.length; i++) {
      const p = seq[i];
      await page.mouse.move(rect.l + p.x, rect.t + p.y);
      await page.mouse.move(rect.l + p.x + 1, rect.t + p.y + 1);
    }
    await page.mouse.up();
    await sleep(1200);   // 等 nextLevel 的 700ms
    await tick('E 整关完成+进下一关1'); dump(rows.pop());
    await sleep(400);
    await tick('E 整关完成+进下一关2'); dump(rows.pop());
    await sleep(400);
    await tick('E 整关完成+进下一关3'); dump(rows.pop());

    log('');
    log('=== 逐行判读 ===');
    rows.forEach(() => {});
    log('  上面每一行的 dT 若为 0 且 fps 也低 → 冻结（且帧率崩了）；');
    log('  dT 为 0 但 fps 正常 → 变形逻辑停了（不是性能问题）');

    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_csc_bug2_out.txt', out.join('\n'), 'utf8');
  }
})();
