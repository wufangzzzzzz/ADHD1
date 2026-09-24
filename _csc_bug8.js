// A/B 对照实验：用 CPU 降速模拟"慢设备"，检验 morph（变形）是否随帧率同比变慢 -> 看起来"停止"
// 用法：node _csc_bug8.js <cpuThrottle倍数>
// 输出：变形速率(单位/秒，墙面时钟) 与 画面变化次数
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const THROTTLE = Number(process.argv[2] || 1);
const TARGET = 'D:/专注力项目/color-spiral-connect.html';
const FILE = 'file:///' + encodeURI(path.resolve(TARGET).replace(/\\/g, '/'));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTPATH = 'D:/专注力项目/_csc_bug8_thr' + THROTTLE + '_out.txt';
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
      window.__st = { lastT: null, acc: 0 };
      window.__pixCount = 0;
      window.__probe = function () {
        var s = window.__csc;
        var obs = s.getPts().filter(function (p) { return !p.isTarget; });
        var ts = obs.map(function (p) { return p.shapeT; });
        var st = window.__st;
        if (st.lastT && ts.length === st.lastT.length) {
          for (var i = 0; i < ts.length; i++) {
            var d = ts[i] - st.lastT[i];
            if (d < 0) d += 1;
            st.acc += d;
          }
        }
        st.lastT = ts;
        var cv = document.getElementById('cv');
        var img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        var hash = 2166136261;
        for (var idx = 0; idx < img.length; idx += 4 * 7) {
          hash ^= img[idx]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 1]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 2]; hash = Math.imul(hash, 16777619);
        }
        return { acc: st.acc, hash: (hash >>> 0).toString(16), cur: s.getCur(), shapeOn: s.getShape().active, nObs: obs.length };
      };
      window.__fps = function (clear) {
        var f = window.__f.slice(); f.sort(function (a, b) { return a - b; });
        if (f.length < 5) { if (clear) window.__f.length = 0; return 0; }
        var d = [];
        for (var i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
        d.sort(function (a, b) { return a - b; });
        var r = Math.round(1000 / d[Math.floor(d.length / 2)]);
        if (clear) window.__f.length = 0;
        return r;
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1200);

    const client = await page.target().createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    log('=== CPU 降速倍数 = ' + THROTTLE + '×（模拟慢设备）===');

    await page.evaluate(() => document.getElementById('btnShape').click());  // 打开「动态形状」
    await sleep(300);
    log('  「动态形状」已开启，按钮状态 shapeActive=' + (await page.evaluate(() => window.__csc.getShape().active)));

    async function measure(tag, ms) {
      await page.evaluate(() => { window.__st.acc = 0; window.__st.lastT = null; });
      await page.evaluate(() => window.__fps(true));
      const p0 = await page.evaluate(() => window.__probe());
      let changes = 0, lastHash = p0.hash;
      const t0 = Date.now();
      const step = 300;
      let elapsed = 0;
      while (elapsed < ms) {
        await sleep(step); elapsed += step;
        const p = await page.evaluate(() => window.__probe());
        if (p.hash !== lastHash) changes++;
        lastHash = p.hash;
      }
      const wall = (Date.now() - t0) / 1000;
      const p1 = await page.evaluate(() => window.__probe());
      const fps = await page.evaluate(() => window.__fps(true));
      const rate = (p1.acc - p0.acc) / wall;
      const nObs = p1.nObs;
      log('  ' + tag + '：帧率=' + String(fps).padStart(3) + 'fps  变形速率=' + rate.toFixed(2) +
        ' 单位/秒（每球 ' + (rate / nObs * 1000).toFixed(1) + ' 毫单位/秒）  ' +
        '画面变化 ' + changes + '/' + Math.round(wall / 0.3) + ' 次');
      return { fps, rate, changes, wall, nObs };
    }

    log('  --- 连线之前 ---');
    const b = await measure('连线前', 3600);

    // 真实完成第一次连线（走 __csc 钩子，交互路径与真人一致：onDown/onMove/onUp）
    await page.evaluate(() => {
      var s = window.__csc, seq = s.getTarget().seq[0];
      s.downAt(seq.x, seq.y);
      s.drawTo(seq.x + 1, seq.y + 1);
      s.drawTo(seq.x + 2, seq.y + 2);
      s.up();
    });
    await sleep(300);
    const cur = await page.evaluate(() => window.__csc.getCur());
    log('  --- 完成"第一次连线"：curIdx=' + cur + '（连对 ' + cur + ' 颗）---');

    const a = await measure('连线后', 3600);

    log('');
    log('=== 判定 ===');
    log('  连前变形速率 ' + b.rate.toFixed(2) + ' /秒   连后 ' + a.rate.toFixed(2) + ' /秒   比值 ' + (b.rate ? (a.rate / b.rate).toFixed(3) : 'n/a'));
    const ratio = b.rate ? a.rate / b.rate : 1;
    if (ratio < 0.5) log('  ** 连线后变形速率掉到不足一半 -> 复现"变形看起来停了" **');
    else log('  连线前后变形速率基本一致 -> 该倍率下未复现');
    log('  理论：morph 每帧 += shapeSpeed，帧率掉到 F，速率就变成 F/60 倍。');
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
