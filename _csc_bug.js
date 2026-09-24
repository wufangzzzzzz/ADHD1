// 复现「色彩识别连线：第一次连线后所有色块变形停止」
// 判定手段：
//   1. 劫持 requestAnimationFrame 计数 -> 判定动画循环是否还活着（rAF 链断了计数就停）
//   2. 捕获 pageerror / console.error -> 拿到真实异常
//   3. 用页面自带钩子 __csc 真实拖一笔完成「第一次连线」，再看 shapeT 是否还在推进
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET = 'D:/专注力项目/color-spiral-connect.html';
const FILE = 'file:///' + encodeURI(path.resolve(TARGET).replace(/\\/g, '/'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
const log = s => out.push(s);

function snap(pts) {
  // 入参是 map 后的精简对象：{t:shapeT, f:shapeFrom, isT:isTarget, sp:shapeSpeed}
  return pts.filter(p => !p.isT).map(p => (p.t === undefined ? 'undefined' : p.t.toFixed(4)) + '/' + p.f).join(',');
}

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 900, deviceScaleFactor: 1 });

    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

    // 1) 装 rAF 计数器（在页面脚本执行前注入）
    await page.evaluateOnNewDocument(() => {
      window.__rafCount = 0;
      var orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) {
        return orig(function (t) { window.__rafCount++; return cb(t); });
      };
    });

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1200);

    log('=== 0. 初始状态 ===');
    const g0 = await page.evaluate(() => ({
      raf: window.__rafCount,
      hasApi: !!window.__csc,
      shapeActive: window.__csc ? window.__csc.getShape() : null,
      ptCount: window.__csc ? window.__csc.getPts().length : 0,
      cur: window.__csc ? window.__csc.getCur() : null
    }));
    log('  rAF 计数=' + g0.raf + '  调试钩子=' + g0.hasApi + '  动态形状开关=' + JSON.stringify(g0.shapeActive) + '  球数=' + g0.ptCount);

    // 默认 shapeActive=false（不 morph）。点击「动态形状」按钮开启，还原用户看到的“在变形”
    await page.evaluate(() => { var b = document.getElementById('btnShape'); if (b) b.click(); });
    await sleep(120);
    log('  点击「动态形状」后开关=' + JSON.stringify(await page.evaluate(() => window.__csc.getShape())));

    // 2) 开启后确认变形确实在推进
    const a1 = await page.evaluate(() => window.__csc.getPts().map(p => ({ t: p.shapeT, f: p.shapeFrom, isT: p.isTarget, sp: p.shapeSpeed })));
    await sleep(600);
    const a2 = await page.evaluate(() => window.__csc.getPts().map(p => ({ t: p.shapeT, f: p.shapeFrom, isT: p.isTarget, sp: p.shapeSpeed })));
    const rafA = await page.evaluate(() => window.__rafCount);
    log('');
    log('=== 1. 连线前：变形是否在推进 ===');
    log('  第1次快照 shapeT: ' + snap(a1));
    log('  第2次快照 shapeT: ' + snap(a2));
    log('  推进中 = ' + (snap(a1) !== snap(a2) ? '是' : '否'));
    log('  rAF 计数=' + rafA);
    log('  干扰球的 shapeSpeed 样例 = ' + JSON.stringify(a1.filter(p => !p.isT).slice(0, 3).map(p => p.sp)));
    log('  是否有 NaN 的 shapeT/shapeSpeed = ' + (a2.some(p => !p.isT && (!isFinite(p.t) || !isFinite(p.sp))) ? '有（异常）' : '无'));

    // 3) 真实拖一笔，完成「第一次连线」（连到 seq[0]）
    const tgtInfo = await page.evaluate(() => {
      var t = window.__csc.getTarget();
      return { seq: t.seq.map(p => ({ x: p.x, y: p.y, rad: p.rad, connected: !!p.connected })), color: t.color.hex, need: t.seq.length };
    });
    log('');
    log('=== 2. 目标序列 ===');
    log('  目标球数=' + tgtInfo.need + '  颜色=' + tgtInfo.color);
    log('  seq[0] = ' + JSON.stringify(tgtInfo.seq[0]));

    const s0 = tgtInfo.seq[0];
    log('');
    log('=== 3. 执行第一次连线（真实 pointer 拖拽，穿过 seq[0]）===');
    await page.evaluate((p) => {
      window.__csc.downAt(p.x, p.y);
      window.__csc.drawTo(p.x + 2, p.y + 1);
      window.__csc.up();
    }, s0);
    await sleep(200);
    const after1 = await page.evaluate(() => ({ cur: window.__csc.getCur(), raf: window.__rafCount, wrong: window.__csc.getWrong() }));
    log('  连线后 curIdx = ' + after1.cur + '（应 >=1）  wrong=' + after1.wrong + '  rAF=' + after1.raf);

    // 4) 关键判定：连线之后变形还推不推进
    const b1 = await page.evaluate(() => window.__csc.getPts().map(p => ({ t: p.shapeT, f: p.shapeFrom, isT: p.isTarget })));
    const rafB1 = await page.evaluate(() => window.__rafCount);
    await sleep(800);
    const b2 = await page.evaluate(() => window.__csc.getPts().map(p => ({ t: p.shapeT, f: p.shapeFrom, isT: p.isTarget })));
    const rafB2 = await page.evaluate(() => window.__rafCount);
    log('');
    log('=== 4. 连线之后：变形是否还在推进（关键）===');
    log('  第1次快照 shapeT: ' + snap(b1));
    log('  第2次快照 shapeT: ' + snap(b2));
    log('  变形推进中 = ' + (snap(b1) !== snap(b2) ? '是（正常）' : '否（BUG 复现：变形冻结）'));
    log('  rAF 计数 ' + rafB1 + ' -> ' + rafB2 + '  增量=' + (rafB2 - rafB1) + '  => ' + (rafB2 > rafB1 ? '动画循环仍活着' : '动画循环已死（rAF 链断裂）'));
    log('  目标球标记数 = ' + b2.filter(p => p.isT).length + ' / ' + b2.length + '（若全部变 true，则 animLoop 里 continue 会跳过所有球）');

    log('');
    log('=== 5. 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_csc_bug_out.txt', out.join('\n'), 'utf8');
  }
})();
