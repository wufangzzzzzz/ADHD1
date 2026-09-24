// 精准量化：strokes 总点数 -> 每帧耗时（draw() 每帧都要重描全部笔迹）
// 直接向 __csc.getStrokes() 返回的活数组注入笔迹，绕开逐点驱动的高开销
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET = 'D:/专注力项目/color-spiral-connect.html';
const FILE = 'file:///' + encodeURI(path.resolve(TARGET).replace(/\\/g, '/'));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTPATH = 'D:/专注力项目/_csc_bug7_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
const log = s => { out.push(s); try { fs.writeFileSync(OUTPATH, out.join('\n'), 'utf8'); } catch (e) {} };

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
      window.__f = [];
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        return orig(function (t) { window.__f.push(t); return cb(t); });
      };
      window.__ft = function (clear) {
        var f = window.__f;
        if (f.length < 5) return { n: f.length, med: 0, p95: 0, worst: 0, fps: 0 };
        f.sort(function (a, b) { return a - b; });
        var d = [];
        for (var i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
        d.sort(function (a, b) { return a - b; });
        var r = {
          n: f.length,
          med: Math.round(d[Math.floor(d.length / 2)] * 100) / 100,
          p95: Math.round(d[Math.floor(d.length * 0.95)] * 100) / 100,
          worst: Math.round(d[d.length - 1] * 100) / 100,
          fps: Math.round(1000 / d[Math.floor(d.length / 2)])
        };
        if (clear) window.__f.length = 0;
        return r;
      };
      window.__load = function (nStrokes, nPts) {
        var arr = window.__csc.getStrokes();
        arr.length = 0;
        var total = 0;
        for (var k = 0; k < nStrokes; k++) {
          var pts = [];
          for (var i = 0; i < nPts; i++) pts.push({ x: 120 + (i % 700), y: 120 + Math.floor(i / 700) * 2 + k * 0.5 });
          arr.push(pts); total += pts.length;
        }
        return { n: arr.length, total: total };
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1000);
    await page.evaluate(() => document.getElementById('btnShape').click());
    await sleep(300);

    const dpr = await page.evaluate(() => window.devicePixelRatio);
    const cvsz = await page.evaluate(() => { var c = document.getElementById('cv'); return c.width + 'x' + c.height + ' (css ' + c.clientWidth + 'x' + c.clientHeight + ')'; });
    log('=== strokes 总点数 -> 每帧耗时（真实窗口，dpr=' + dpr + '，画布=' + cvsz + '）===');
    log('  笔数  单笔点数   总点数   中位帧耗时  p95帧耗时  最差帧   fps   变形速度(相对60fps)');

    const rows = [[0, 0], [1, 300], [5, 1500], [10, 3000], [20, 3000], [40, 3000], [40, 5000]];
    for (let i = 0; i < rows.length; i++) {
      const [ns, np] = rows[i];
      const r = await page.evaluate((a, b) => window.__load(a, b), ns, np);
      await page.evaluate(() => window.__ft(true));
      await sleep(1100);
      const f = await page.evaluate(() => window.__ft(true));
      const rel = f.fps ? Math.round(f.fps / 60 * 100) : 0;
      log('  ' + String(r.n).padStart(3) + '  ' + String(np).padStart(8) + '  ' + String(r.total).padStart(7) + '  ' +
        String(f.med).padStart(10) + '  ' + String(f.p95).padStart(9) + '  ' + String(f.worst).padStart(7) + '  ' +
        String(f.fps).padStart(3) + '  ' + String(rel + '%').padStart(9));
    }

    log('');
    log('=== 结论 ===');
    log('  morph 是每帧 += shapeSpeed（与真实时间无关）。');
    log('  上表 fps 若明显低于 60，变形速度就同比打折，肉眼就是"变慢了/像停了"。');
    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(OUTPATH, out.join('\n'), 'utf8');
  }
})();
