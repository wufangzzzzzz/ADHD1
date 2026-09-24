// 量化"连线后帧率塌陷"：每加一笔长笔迹，测一次帧耗时
// 目的：验证 morph 是按帧推进的（帧率一塌 → 变形看起来"停止"）
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
      window.__f = [];
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        return orig(function (t) { window.__f.push(t); return cb(t); });
      };
      window.__ft = function (clear) {
        var f = window.__f;
        if (f.length < 5) return { n: f.length, med: 0, p95: 0, fps: 0, worst: 0 };
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
      // 在页内直接驱动长笔迹（比 CDP 快几百倍），走的是真正的 onDown/onMove/onUp
      window.__drawLongStroke = function (nPts) {
        var s = window.__csc;
        var g = s.getGeom();
        s.downAt(g.cx + 20, g.cy);
        for (var i = 0; i < nPts; i++) {
          var a = i / nPts * Math.PI * 2 * 3;
          var rr = 40 + i * 0.35;
          s.drawTo(g.cx + Math.cos(a) * rr, g.cy + Math.sin(a) * rr);
        }
        s.up();
        var st = s.getStrokes();
        return { strokes: st.length, lastLen: st.length ? st[st.length - 1].length : 0, trailCap: 5000 };
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1200);
    await page.evaluate(() => document.getElementById('btnShape').click());  // 打开变形
    await sleep(400);

    log('=== 笔迹规模 -> 帧耗时 曲线（真实窗口，dpr=' +
      (await page.evaluate(() => window.devicePixelRatio)) + '，画布=' +
      (await page.evaluate(() => { var c = document.getElementById('cv'); return c.width + 'x' + c.height; })) + '）===');
    log('  笔数   单笔点数   总点数   中位帧耗时  p95帧耗时  最差帧   fps');

    let totalPts = 0;
    await page.evaluate(() => window.__ft(true));
    await sleep(1200);
    let f0 = await page.evaluate(() => window.__ft(true));
    log('  ' + String(0).padStart(3) + '  ' + String(0).padStart(9) + '  ' + String(0).padStart(7) + '  ' +
      String(f0.med).padStart(10) + '  ' + String(f0.p95).padStart(9) + '  ' + String(f0.worst).padStart(7) + '  ' + String(f0.fps).padStart(3));

    for (let k = 1; k <= 12; k++) {
      const r = await page.evaluate(n => window.__drawLongStroke(n), 2500);
      totalPts += r.lastLen;
      await sleep(1200);
      const f = await page.evaluate(() => window.__ft(true));
      log('  ' + String(r.strokes).padStart(3) + '  ' + String(r.lastLen).padStart(9) + '  ' + String(totalPts).padStart(7) + '  ' +
        String(f.med).padStart(10) + '  ' + String(f.p95).padStart(9) + '  ' + String(f.worst).padStart(7) + '  ' + String(f.fps).padStart(3));
      if (f.fps < 20) { log('  ^^^ 帧率已跌破 20fps：morph 按帧推进 → 变形速度同比降到 ' + (f.fps / 60 * 100).toFixed(0) + '%，肉眼接近"停止"'); }
    }

    log('');
    log('=== 关键结论 ===');
    log('  morph 是"每帧 +shapeSpeed"，不是"每秒 +shapeSpeed"。');
    log('  => 帧率掉到 X fps，变形速度就只剩原来的 X/60。');
    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_csc_bug6_out.txt', out.join('\n'), 'utf8');
  }
})();
