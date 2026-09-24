// 以「画布像素」为唯一真值：同时统计 morph 逻辑推进量（回绕感知）与像素变化，判定"看到的"是否真的冻结
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

    // 装：rAF 计数 + morph 单调累积器 + 画布像素哈希器
    await page.evaluateOnNewDocument(() => {
      window.__rafCount = 0;
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        return orig(function (t) { window.__rafCount++; return cb(t); });
      };

      window.__morphAcc = 0;
      window.__morphWraps = 0;
      window.__lastT = null;
      window.__prevFroms = null;
      window.__fromChanges = 0;
      window.__morphUnsupported = false;

      window.__probe = function () {
        var s = window.__csc;
        if (!s) return { err: 'no __csc' };
        var pts = s.getPts();
        var obs = pts.filter(function (p) { return !p.isTarget; });
        var ts = obs.map(function (p) { return p.shapeT; });
        if (window.__lastT === null) {
          window.__lastT = ts;
        } else if (ts.length === window.__lastT.length) {
          for (var i = 0; i < ts.length; i++) {
            var d = ts[i] - window.__lastT[i];
            if (d < 0) { d += 1; window.__morphWraps++; }
            window.__morphAcc += d;
          }
          window.__lastT = ts;
        } else {
          window.__lastT = ts;
          window.__morphUnsupported = true;
        }
        var froms = obs.map(function (p) { return p.shapeFrom; }).join('');
        if (window.__prevFroms === null) window.__prevFroms = froms;
        else if (froms.length === window.__prevFroms.length) {
          var c = 0;
          for (var k = 0; k < froms.length; k++) if (froms[k] !== window.__prevFroms[k]) c++;
          window.__fromChanges += c;
          window.__prevFroms = froms;
        } else window.__prevFroms = froms;

        // 画布像素哈希（FNV-1a），抽取步长 7 像素，作为"用户看到的画面"真值
        var cv = document.getElementById('cv');
        var cx = cv.getContext('2d');
        var w = cv.width, h = cv.height;
        var img = cx.getImageData(0, 0, w, h).data;
        var hash = 2166136261;
        var nonBg = 0;
        for (var idx = 0; idx < img.length; idx += 4 * 7) {
          hash ^= img[idx]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 1]; hash = Math.imul(hash, 16777619);
          hash ^= img[idx + 2]; hash = Math.imul(hash, 16777619);
          if (img[idx] + img[idx + 1] + img[idx + 2] < 720) nonBg++;
        }
        return {
          raf: window.__rafCount,
          morphAcc: window.__morphAcc,
          wraps: window.__morphWraps,
          fromChanges: window.__fromChanges,
          hash: (hash >>> 0).toString(16),
          nonBg: nonBg,
          nObs: obs.length,
          strokes: s.getStrokes().length,
          cur: s.getCur(), qn: s.getQn(), wrong: s.getWrong(),
          shapeActive: s.getShape().active,
          canvasW: w, canvasH: h
        };
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1000);

    async function step(tag) {
      await sleep(500);
      const r = await page.evaluate(() => window.__probe());
      log('  ' + tag.padEnd(24) + ' hash=' + String(r.hash).padStart(9) + ' 画布非背景像素=' + String(r.nonBg).padStart(6) +
        ' morph累计=' + r.morphAcc.toFixed(2).padStart(7) + ' 回绕=' + String(r.wraps).padStart(4) + ' 形状切换=' + String(r.fromChanges).padStart(4) +
        ' 球=' + r.nObs + ' 开关=' + r.shapeActive + ' cur=' + r.cur + ' qn=' + r.qn);
      return r;
    }

    log('=== 阶段一：未开启变形（预期：hash 变化仅来自呼吸圈等，morph 累计=0）===');
    const a1 = await step('A1 初始');
    const a2 = await step('A2 初始');

    log('');
    log('=== 阶段二：开启「动态形状」后（预期：morph 累计持续增长，hash 持续变化）===');
    await page.evaluate(() => document.getElementById('btnShape').click());
    const b1 = await step('B1 开启后');
    const b2 = await step('B2 开启后');
    const b3 = await step('B3 开启后');

    log('');
    log('=== 阶段三：完成第一次连线（真实鼠标拖过 seq[0]）===');
    const rect = await page.evaluate(() => { var r = document.getElementById('cv').getBoundingClientRect(); return { l: r.left, t: r.top }; });
    const seq0 = await page.evaluate(() => { var p = window.__csc.getTarget().seq[0]; return { x: p.x, y: p.y }; });
    await page.mouse.move(rect.l + seq0.x - 50, rect.t + seq0.y);
    await page.mouse.down();
    for (let k = -50; k <= 0; k += 5) await page.mouse.move(rect.l + seq0.x + k, rect.t + seq0.y + 1);
    await page.mouse.up();
    const c1 = await step('C1 第一次连线后');
    const c2 = await step('C2 第一次连线后');
    const c3 = await step('C3 第一次连线后');
    const c4 = await step('C4 第一次连线后');

    log('');
    log('=== 判定（以像素为准）===');
    const morphRunsBefore = (b3.morphAcc - b1.morphAcc) > 0.05;
    const morphRunsAfter = (c4.morphAcc - c1.morphAcc) > 0.05;
    const pixelsChangeBefore = b1.hash !== b3.hash && b2.hash !== b3.hash;
    const pixelsChangeAfter = c1.hash !== c3.hash && c2.hash !== c4.hash;
    log('  连线前：morph 推进=' + (morphRunsBefore ? '是' : '否') + '   像素变化=' + (pixelsChangeBefore ? '是' : '否'));
    log('  连线后：morph 推进=' + (morphRunsAfter ? '是' : '否') + '   像素变化=' + (pixelsChangeAfter ? '是' : '否'));
    if (pixelsChangeAfter && morphRunsAfter) log('  >>> 本机无法复现"变形冻结"：逻辑与像素都在动');
    else if (!pixelsChangeAfter && morphRunsAfter) log('  >>> 复现：morph 逻辑在推进，但画面不更新（绘制层问题）');
    else log('  >>> 复现：morph 逻辑与画面都停了');

    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_csc_bug3_out.txt', out.join('\n'), 'utf8');
  }
})();
