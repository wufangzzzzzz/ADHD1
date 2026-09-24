// 图案12·原色变换 数值验证
//   1) 加色法混色正确性（红/绿/蓝 单色区、两两交叠=黄/品红/青、三交=白）
//   2) 白区面积 = 单球面积的 70%
//   3) 公转中心锁在格心（绕格心转，不能绕格角）
//   4) 点对数字 → 三原色消散、旋转暂停、数字转绿
//   5) 打印介质下动画全停且姿态归零
// 用法：node _p12_verify.js
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const SRC = 'D:/专注力项目/schulte-grid.html';
const OUT = 'D:/专注力项目/_p12_verify_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = []; const log = s => { out.push(s); try { fs.writeFileSync(OUT, out.join('\n'), 'utf8'); } catch (e) {} };
let PASS = 0, FAIL = 0;
function chk(name, ok, detail) { ok ? PASS++ : FAIL++; log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + name + (detail ? '  ' + detail : '')); }

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();          // 单独开页，绝不抢用已有窗口
    await page.setViewport({ width: 1200, height: 1000 });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

    await page.goto('file:///' + SRC.replace(/\\/g, '/'), { waitUntil: 'load' });
    await sleep(1200);

    log('=== 图案12·原色变换 数值验证 ===');
    log('  源文件：' + SRC);

    // ---------- 进入图案12 ----------
    let info = await page.evaluate(() => {
      if (typeof game === 'undefined' || !game) return { err: 'no game object' };
      try { game.setPatternSub(12); } catch (e) { return { err: 'setPatternSub threw: ' + e.message }; }
      return { ok: true };
    });
    if (info.err) log('  直接调用失败：' + info.err);
    await sleep(900);

    let n = await page.evaluate(() => document.querySelectorAll('.p12-cell').length);
    if (n === 0) {
      log('  直接进入图案12 未渲染格子，尝试先点最后一关…');
      await page.evaluate(() => { var c = document.querySelectorAll('.level-card'); if (c.length) c[c.length - 1].click(); });
      await sleep(1200);
      await page.evaluate(() => { try { game.setPatternSub(12); } catch (e) {} });
      await sleep(900);
      n = await page.evaluate(() => document.querySelectorAll('.p12-cell').length);
    }
    const gridSize = await page.evaluate(() => (game && game.gridSize) || 0);
    log('  gridSize=' + gridSize + '  已渲染 .p12-cell 数量=' + n + '（期望 ' + (gridSize * gridSize) + '）');
    chk('图案12 进入并渲染出全部格子', n > 0 && n === gridSize * gridSize, 'n=' + n);
    if (n === 0) { log('  无格子，终止'); return; }

    // ---------- 固定第一个格子的公转角为 0° ----------
    const fixed = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      if (!el) return { err: 'no orbit' };
      el.style.animationDelay = '0s';
      const as = el.getAnimations();
      as.forEach(a => { a.currentTime = 0; a.pause(); });
      return { anims: as.length, delay: el.style.animationDelay };
    });
    log('  已固定公转角：getAnimations=' + (fixed.anims || 0) + '（0 说明 CSS 动画没挂上）');
    chk('CSS 公转动画已挂到 .p12-orbit', fixed.anims > 0, 'anims=' + fixed.anims);

    // ---------- 1) 颜色采样（真实渲染截图 → 页面内解码统计）----------
    const cellBox = await page.evaluate(() => {
      const c = document.querySelector('.p12-cell');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    log('  首格屏幕尺寸：' + Math.round(cellBox.w) + '×' + Math.round(cellBox.h) + ' px');

    const b64 = await page.screenshot({
      encoding: 'base64',
      clip: { x: cellBox.x, y: cellBox.y, width: cellBox.w, height: cellBox.h }
    });

    const stat = await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: 'image/png' });
      const bmp = await createImageBitmap(blob);
      const cv = document.createElement('canvas');
      cv.width = bmp.width; cv.height = bmp.height;
      const ctx = cv.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;

      const PAL = {
        red: [255, 0, 0], green: [0, 255, 0], blue: [0, 0, 255],
        yellow: [255, 255, 0], magenta: [255, 0, 255], cyan: [0, 255, 255],
        white: [255, 255, 255], black: [0, 0, 0]
      };
      const cnt = {}, sum = {};
      for (const k in PAL) { cnt[k] = 0; sum[k] = [0, 0, 0]; }
      let total = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        let best = 'black', bd = 1e9;
        for (const k in PAL) {
          const p = PAL[k];
          const dd = (r - p[0]) * (r - p[0]) + (g - p[1]) * (g - p[1]) + (b - p[2]) * (b - p[2]);
          if (dd < bd) { bd = dd; best = k; }
        }
        cnt[best]++; sum[best][0] += r; sum[best][1] += g; sum[best][2] += b;
        total++;
      }
      const mean = {};
      for (const k in PAL) { const c = cnt[k] || 1; mean[k] = [Math.round(sum[k][0] / c), Math.round(sum[k][1] / c), Math.round(sum[k][2] / c)]; }
      return { total, cnt, mean, w: cv.width, h: cv.height };
    }, b64);

    const c = stat.cnt, T = stat.total;
    const pctf = v => (v / T * 100).toFixed(2) + '%';
    log('  采样画布 ' + stat.w + '×' + stat.h + ' = ' + T + ' px');
    log('  各类像素占比：');
    ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white', 'black'].forEach(k => {
      log('    ' + k.padEnd(8) + String(c[k]).padStart(7) + '  ' + pctf(c[k]).padStart(7) + '  均值rgb=' + JSON.stringify(stat.mean[k]));
    });

    // 三原色球半径在屏幕上的像素（格内 100 坐标系 R=40 → 屏幕 R = 0.40 × 格宽）
    const rPx = 0.40 * cellBox.w;
    const ballArea = Math.PI * rPx * rPx;
    const whiteRatio = c.white / ballArea;
    log('  单球屏幕半径 r≈' + rPx.toFixed(1) + 'px，单球面积≈' + Math.round(ballArea) + 'px²');
    log('  白区面积 / 单球面积 = ' + (whiteRatio * 100).toFixed(1) + '%（设计值 70%）');

    log('  --- 判据 ---');
    chk('存在纯红区', c.red > T * 0.01, pctf(c.red));
    chk('存在纯绿区', c.green > T * 0.01, pctf(c.green));
    chk('存在纯蓝区', c.blue > T * 0.01, pctf(c.blue));
    chk('存在两两交叠·黄 (红+绿)', c.yellow > T * 0.01, pctf(c.yellow));
    chk('存在两两交叠·品红 (红+蓝)', c.magenta > T * 0.01, pctf(c.magenta));
    chk('存在两两交叠·青 (绿+蓝)', c.cyan > T * 0.01, pctf(c.cyan));
    chk('存在三交·白 (红+绿+蓝)', c.white > T * 0.20, pctf(c.white));
    chk('白区面积 = 单球面积 70% ±4%', Math.abs(whiteRatio - 0.70) <= 0.04, (whiteRatio * 100).toFixed(1) + '%');
    // 混色必须"纯"：各类均值应贴近目标色（否则说明是暗淡的假混合）
    const near = (k, p, tol) => { const m = stat.mean[k]; return Math.abs(m[0] - p[0]) <= tol && Math.abs(m[1] - p[1]) <= tol && Math.abs(m[2] - p[2]) <= tol; };
    chk('黄区颜色纯净', near('yellow', [255, 255, 0], 26), JSON.stringify(stat.mean.yellow));
    chk('品红区颜色纯净', near('magenta', [255, 0, 255], 26), JSON.stringify(stat.mean.magenta));
    chk('青区颜色纯净', near('cyan', [0, 255, 255], 26), JSON.stringify(stat.mean.cyan));
    chk('白区颜色纯净', near('white', [255, 255, 255], 22), JSON.stringify(stat.mean.white));

    // ---------- 2) 公转中心是否锁在格心 ----------
    const rot = await page.evaluate(() => {
      const cell = document.querySelector('.p12-cell');
      const el = cell.querySelector('.p12-orbit');
      const cr = cell.getBoundingClientRect();
      const cc = { x: cr.x + cr.width / 2, y: cr.y + cr.height / 2 };
      const as = el.getAnimations();
      const res = [];
      [0, 90, 180, 270].forEach(deg => {
        as.forEach(a => { a.currentTime = deg / 360 * 72000; a.pause(); });
        const r = el.getBoundingClientRect();
        res.push({ deg, cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: r.width, h: r.height });
      });
      return { cellCenter: cc, cellW: cr.width, list: res };
    });
    log('  格子中心 (' + rot.cellCenter.x.toFixed(1) + ', ' + rot.cellCenter.y.toFixed(1) + ')');
    rot.list.forEach(o => {
      log('    旋转 ' + String(o.deg).padStart(3) + '° → orbit bbox 中心 (' + o.cx.toFixed(1) + ', ' + o.cy.toFixed(1) +
        ')  尺寸 ' + o.w.toFixed(1) + '×' + o.h.toFixed(1));
    });
    const dxs = rot.list.map(o => Math.abs(o.cx - rot.cellCenter.x));
    const dys = rot.list.map(o => Math.abs(o.cy - rot.cellCenter.y));
    const maxD = Math.max.apply(null, dxs.concat(dys));
    chk('公转中心锁在格心（四角度 bbox 中心偏差 < 1.5px）', maxD < 1.5, '最大偏差 ' + maxD.toFixed(2) + 'px');
    const ws = rot.list.map(o => o.w);
    chk('四角度 bbox 尺寸稳定（形状未随公转变形）', (Math.max.apply(null, ws) - Math.min.apply(null, ws)) < 2.5,
      '宽 ' + ws.map(v => v.toFixed(1)).join('/'));

    // ---------- 3) 点对数字 → 消散 ----------
    const beforeOpacity = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-balls');
      return el ? getComputedStyle(el).opacity : null;
    });
    const clicked = await page.evaluate(() => {
      const g = window.game;
      const target = g.currentNumber;
      const cells = Array.prototype.slice.call(document.querySelectorAll('.p12-cell'));
      const cell = cells.filter(c => Number(c.dataset.number) === Number(target))[0];
      if (!cell) return { err: 'no cell for currentNumber=' + target };
      cell.click();
      return { target: target, cls: cell.className };
    });
    log('  当前待点数字=' + clicked.target + ' → 点击后 cell class="' + clicked.cls + '"');
    chk('点对数字后加上 .p12-dissolve', !clicked.err && String(clicked.cls).indexOf('p12-dissolve') >= 0, clicked.err || '');

    await sleep(800);   // 等消散动画（0.6s）结束
    const after = await page.evaluate(() => {
      const cell = document.querySelector('.p12-cell.p12-dissolve');
      if (!cell) return { err: 'no dissolved cell' };
      const balls = cell.querySelector('.p12-balls');
      const orbit = cell.querySelector('.p12-orbit');
      const txt = cell.querySelector('text');
      return {
        ballsOpacity: getComputedStyle(balls).opacity,
        ballsAnim: getComputedStyle(balls).animationName,
        orbitPlay: getComputedStyle(orbit).animationPlayState,
        textFill: getComputedStyle(txt).fill
      };
    });
    log('  消散后：balls opacity=' + after.ballsOpacity + '  动画=' + after.ballsAnim +
      '  orbit play-state=' + after.orbitPlay + '  数字 fill=' + after.textFill);
    chk('消散后三原色不可见（opacity→0）', Number(after.ballsOpacity) === 0, 'opacity=' + after.ballsOpacity);
    chk('消散后该格旋转已暂停', after.orbitPlay === 'paused', 'play-state=' + after.orbitPlay);
    chk('消散后数字转绿（黑底上仍可见）', /4CAF50/i.test(after.textFill) || /rgb\(76,\s*175,\s*80\)/.test(after.textFill), after.textFill);

    // 未点到的格子必须完好
    const others = await page.evaluate(() => {
      const all = document.querySelectorAll('.p12-cell');
      const dis = document.querySelectorAll('.p12-cell.p12-dissolve').length;
      return { all: all.length, dis: dis };
    });
    chk('消散只作用于被点的那一格', others.dis === 1, '已消散 ' + others.dis + ' / 共 ' + others.all);

    // ---------- 4) 打印介质：动画停、姿态归零 ----------
    await page.emulateMediaType('print');
    await sleep(250);
    const pr = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      const balls = document.querySelector('.p12-cell:not(.p12-dissolve) .p12-balls') || document.querySelector('.p12-balls');
      const cs = getComputedStyle(el);
      return {
        animName: cs.animationName,
        transform: cs.transform,
        ballsAnim: balls ? getComputedStyle(balls).animationName : 'n/a',
        ballsOpacity: balls ? getComputedStyle(balls).opacity : 'n/a'
      };
    });
    log('  打印介质下：orbit animation=' + pr.animName + '  transform=' + pr.transform +
      '  balls animation=' + pr.ballsAnim + '  balls opacity=' + pr.ballsOpacity);
    chk('打印时公转动画关闭', pr.animName === 'none', 'animation=' + pr.animName);
    chk('打印时姿态归零（transform=none）', pr.transform === 'none', 'transform=' + pr.transform);
    chk('打印时三原色完整可见', pr.ballsOpacity === '1' && pr.ballsAnim === 'none', 'opacity=' + pr.ballsOpacity);
    await page.emulateMediaType(null);

    // ---------- 5) 报错 ----------
    chk('页面无 JS 报错', errs.length === 0, errs.slice(0, 3).join(' | '));

    log('');
    log('=== 合计：PASS ' + PASS + ' / FAIL ' + FAIL + ' ===');
  } catch (e) {
    log('EXCEPTION: ' + (e && e.stack || e));
  } finally {
    if (browser) try { await browser.close(); } catch (e) {}
  }
})();
