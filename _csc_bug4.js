// 真实窗口（headful，受垂直同步限制=真 60fps）长时段观测：
//   真帧率 / morph 推进 / 像素哈希变化 / 笔迹规模  -> 判定是否为性能崩塌导致的"看起来冻结"
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
      headless: false,          // 真实窗口，rAF 受垂直同步限制
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--new-window', '--window-size=1200,980']
    });
    const page = (await browser.pages())[0] || await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

    await page.evaluateOnNewDocument(() => {
      window.__frames = [];        // 每帧时间戳
      window.__morphAcc = 0;
      window.__wraps = 0;
      window.__lastT = null;
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        return orig(function (t) { window.__frames.push(t); return cb(t); });
      };
      window.__probe = function () {
        var s = window.__csc;
        var pts = s.getPts();
        var obs = pts.filter(function (p) { return !p.isTarget; });
        var ts = obs.map(function (p) { return p.shapeT; });
        if (window.__lastT && ts.length === window.__lastT.length) {
          for (var i = 0; i < ts.length; i++) {
            var d = ts[i] - window.__lastT[i];
            if (d < 0) { d += 1; window.__wraps++; }
            window.__morphAcc += d;
          }
        }
        window.__lastT = ts;
        var cv = document.getElementById('cv');
        var img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        var hash = 2166136261;
        for (var idx = 0; idx < img.length; idx += 4 * 7) {
          hash ^= img[idx]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 1]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 2]; hash = Math.imul(hash, 16777619);
        }
        return {
          hash: (hash >>> 0).toString(16),
          morphAcc: Math.round(window.__morphAcc * 100) / 100,
          wraps: window.__wraps,
          strokes: s.getStrokes().length,
          strokePts: s.getStrokes().reduce(function (a, st) { return a + st.length; }, 0),
          cur: s.getCur(), qn: s.getQn(), wrong: s.getWrong(),
          shapeActive: s.getShape().active,
          nObs: obs.length
        };
      };
      window.__fps = function (clear) {
        var f = window.__frames;
        if (f.length < 3) return { fps: 0, n: f.length, p95: 0 };
        var d = [];
        for (var i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
        d.sort(function (a, b) { return a - b; });
        var med = d[Math.floor(d.length / 2)];
        var p95 = d[Math.floor(d.length * 0.95)];
        if (clear) window.__frames.length = 0;
        return { fps: Math.round(1000 / med), med: Math.round(med * 100) / 100, p95: Math.round(p95 * 100) / 100, n: f.length };
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1500);

    log('=== headless=false（真实窗口，垂直同步 60fps）长时段观测 ===');
    log('  时间  帧率  中位帧间隔  p95帧间隔  morph累计  像素hash  笔数/点数  cur qn 开关');

    let lastHash = '', stag = 0;
    async function row(tag) {
      await sleep(1000);
      const p = await page.evaluate(() => window.__probe());
      const f = await page.evaluate(() => window.__fps(true));
      log('  ' + tag.padEnd(6) + String(f.fps).padStart(4) + '  ' + String(f.med).padStart(8) + '  ' + String(f.p95).padStart(8) + '  ' +
        String(p.morphAcc).padStart(9) + '  ' + String(p.hash).padStart(9) + '  ' + String(p.strokes + '/' + p.strokePts).padStart(9) + '  ' +
        String(p.cur).padStart(3) + String(p.qn).padStart(3) + ' ' + p.shapeActive);
      const changed = lastHash && lastHash !== p.hash;
      lastHash = p.hash;
      return { p, f, changed };
    }

    let r = await row('A初始');
    await page.evaluate(() => document.getElementById('btnShape').click());
    await sleep(500);
    r = await row('B开变形');

    // 真实拖拽完成第一次连线（沿路径多点）
    const rect = await page.evaluate(() => { var q = document.getElementById('cv').getBoundingClientRect(); return { l: q.left, t: q.top }; });
    const seq0 = await page.evaluate(() => { var p = window.__csc.getTarget().seq[0]; return { x: p.x, y: p.y }; });
    await page.mouse.move(rect.l + seq0.x - 70, rect.t + seq0.y);
    await page.mouse.down();
    for (let k = -70; k <= 0; k += 4) await page.mouse.move(rect.l + seq0.x + k, rect.t + seq0.y + 1);
    await page.mouse.up();
    const after = await page.evaluate(() => ({ cur: window.__csc.getCur() }));
    log('  -> 连线后 curIdx=' + after.cur);

    // 连线后连续观测 14 秒
    let frozen = 0, alive = 0;
    for (let i = 1; i <= 14; i++) {
      const rr = await row('C' + i);
      if (rr.p.morphAcc === r.p.morphAcc && !rr.changed) frozen++;
      else alive++;
      r = rr;
    }

    // 再画 5 笔长线（模拟真实连续拖拽），看帧率是否崩塌
    log('  --- 开始画 5 笔长线 ---');
    for (let n = 0; n < 5; n++) {
      await page.mouse.move(rect.l + 150, rect.t + 150);
      await page.mouse.down();
      for (let k = 0; k < 400; k++) {
        await page.mouse.move(rect.l + 150 + Math.cos(k / 9) * (50 + k * 0.8), rect.t + 150 + Math.sin(k / 9) * (50 + k * 0.8));
      }
      await page.mouse.up();
    }
    for (let i = 1; i <= 6; i++) r = await row('D' + i);

    log('');
    log('=== 判定 ===');
    log('  连线后 14 秒内：morph 推进且像素在变的次数=' + alive + '，完全静止的次数=' + frozen);
    log('  ' + (frozen > 0 ? '出现过完全静止的采样点 -> 存在冻结' : '全程都在动 -> 未复现冻结'));
    log('  最终帧率=' + r.f.fps + '  中位帧间隔=' + r.f.med + 'ms  p95=' + r.f.p95 + 'ms');
    log('  ' + (r.f.fps < 20 ? '帧率已崩塌（<20fps）：形变会看起来像"卡住不动"' : '帧率正常'));

    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_csc_bug4_out.txt', out.join('\n'), 'utf8');
  }
})();
