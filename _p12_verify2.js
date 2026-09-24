// 图案12·原色变换 数值验证 v2
// 修正 v1 的两个判据错误：
//   ① 旋转中心不能用 orbit 外接矩形中心衡量 —— 三圆 120° 三重对称图形的 bbox 中心天然偏离
//      旋转中心 D/4（v1 实测偏差 2.28px 与之吻合）。改用「白色交叠区」为锚点：白区是三球交集，
//      必须恒在格心且形状不变；同时用「红区位置必须改变」反向证明旋转真的在发生。
//   ② 白区面积用 min(R,G,B)>128 判定 —— 正好把白/彩过渡带的边界取在中点，与几何面积口径一致。
//   ③ 点击前必须先开始游戏（handleClick 首行 if(!this.isPlaying) return）。
// 用法：node _p12_verify2.js
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const SRC = 'D:/专注力项目/schulte-grid.html';
const OUT = 'D:/专注力项目/_p12_verify2_out.txt';
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 3 });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

    await page.goto('file:///' + SRC.replace(/\\/g, '/'), { waitUntil: 'load' });
    await sleep(1200);

    log('=== 图案12·原色变换 数值验证 v2 ===');
    log('  源文件：' + SRC);

    // ---------- 进入图案12 并开始游戏 ----------
    await page.evaluate(() => { try { game.setPatternSub(12); } catch (e) {} });
    await sleep(800);
    let n = await page.evaluate(() => document.querySelectorAll('.p12-cell').length);
    if (n === 0) {
      await page.evaluate(() => { var c = document.querySelectorAll('.level-card'); if (c.length) c[c.length - 1].click(); });
      await sleep(1200);
      await page.evaluate(() => { try { game.setPatternSub(12); } catch (e) {} });
      await sleep(800);
      n = await page.evaluate(() => document.querySelectorAll('.p12-cell').length);
    }
    const gs = await page.evaluate(() => (game && game.gridSize) || 0);
    log('  gridSize=' + gs + '  已渲染 .p12-cell=' + n + '（期望 ' + gs * gs + '）');
    chk('图案12 渲染出全部格子', n > 0 && n === gs * gs, 'n=' + n);
    if (n === 0) return;

    const started = await page.evaluate(() => {
      const b = document.getElementById('start-btn');
      if (!b) return { err: 'no start-btn' };
      b.click();
      return { ok: true, playing: game.isPlaying, cur: game.currentNumber };
    });
    await sleep(900);
    const playing = await page.evaluate(() => ({ p: game.isPlaying, cur: game.currentNumber, mode: game.isPatternMode, sub: game.patternSub }));
    log('  点开始游戏后：isPlaying=' + playing.p + ' currentNumber=' + playing.cur + ' isPatternMode=' + playing.mode + ' patternSub=' + playing.sub);
    chk('游戏已开始（isPlaying=true）', playing.p === true, 'isPlaying=' + playing.p);

    // ---------- 固定公转角，三角度截图 ----------
    const clipBox = await page.evaluate(() => {
      const r = document.querySelector('.p12-cell').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    log('  首格 CSS 尺寸：' + clipBox.width.toFixed(1) + '×' + clipBox.height.toFixed(1) +
      '  截图倍率 deviceScaleFactor=3 → ' + (clipBox.width * 3).toFixed(0) + 'px');

    async function shoot(t) {
      await page.evaluate((tt) => {
        const el = document.querySelector('.p12-cell .p12-orbit');
        el.style.animationDelay = '0s';
        el.getAnimations().forEach(a => { a.currentTime = tt; a.pause(); });
      }, t);
      await sleep(140);
      return await page.screenshot({ encoding: 'base64', clip: clipBox });
    }
    const shotA = await shoot(0);        // 0°
    const shotB = await shoot(24000);    // 120°（三重对称角）
    const shotC = await shoot(18000);    // 90°

    // ---------- 页面内解码 + 统计 ----------
    const A = await page.evaluate(async (pack) => {
      async function decode(b64) {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const bmp = await createImageBitmap(new Blob([arr], { type: 'image/png' }));
        const cv = document.createElement('canvas');
        cv.width = bmp.width; cv.height = bmp.height;
        const ctx = cv.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        return ctx.getImageData(0, 0, cv.width, cv.height);
      }
      function classify(im) {
        const d = im.data, W = im.width, H = im.height, n = W * H;
        const mask = new Uint8Array(n);
        let white = 0, red = 0, green = 0, blue = 0, yel = 0, mag = 0, cyn = 0, blk = 0;
        let wx = 0, wy = 0;
        for (let p = 0; p < n; p++) {
          const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
          const mn = Math.min(r, Math.min(g, b)), mx = Math.max(r, Math.max(g, b));
          if (mn > 128) { mask[p] = 1; white++; wx += p % W; wy += (p - (p % W)) / W; }
          else if (r > 150 && g > 150 && b < 105) { mask[p] = 5; yel++; }
          else if (r > 150 && b > 150 && g < 105) { mask[p] = 6; mag++; }
          else if (g > 150 && b > 150 && r < 105) { mask[p] = 7; cyn++; }
          else if (r > g + 60 && r > b + 60 && g < 105 && b < 105) { mask[p] = 2; red++; }
          else if (g > r + 60 && g > b + 60 && r < 105 && b < 105) { mask[p] = 3; green++; }
          else if (b > r + 60 && b > g + 60 && r < 105 && g < 105) { mask[p] = 4; blue++; }
          else if (mx < 105) { mask[p] = 8; blk++; }
        }
        return { W, H, n, mask, white, red, green, blue, yel, mag, cyn, blk,
                 wcx: white ? wx / white : -1, wcy: white ? wy / white : -1 };
      }
      function iou(m1, m2, v) {
        let inter = 0, uni = 0;
        for (let p = 0; p < m1.length; p++) {
          const a = m1[p] === v, b = m2[p] === v;
          if (a || b) { uni++; if (a && b) inter++; }
        }
        return uni ? inter / uni : 0;
      }
      const a = classify(await decode(pack.a));
      const b = classify(await decode(pack.b));
      const c = classify(await decode(pack.c));
      return {
        W: a.W, H: a.H, n: a.n,
        cnt: {
          a: { white: a.white, red: a.red, green: a.green, blue: a.blue, yel: a.yel, mag: a.mag, cyn: a.cyn, blk: a.blk },
          b: { white: b.white, red: b.red, green: b.green, blue: b.blue },
          c: { white: c.white, red: c.red, green: c.green, blue: c.blue }
        },
        centroid: { a: [a.wcx, a.wcy], b: [b.wcx, b.wcy], c: [c.wcx, c.wcy] },
        iou: {
          whiteAB: iou(a.mask, b.mask, 1),
          whiteAC: iou(a.mask, c.mask, 1),
          redAB: iou(a.mask, b.mask, 2),
          blueAC: iou(a.mask, c.mask, 4)
        }
      };
    }, { a: shotA, b: shotB, c: shotC });

    const W = A.W, H = A.H, T = A.n;
    const pf = v => (v / T * 100).toFixed(2) + '%';
    log('');
    log('  采样 ' + W + '×' + H + ' = ' + T + ' px（全格）');
    log('  0° 各类占比：红 ' + pf(A.cnt.a.red) + ' 绿 ' + pf(A.cnt.a.green) + ' 蓝 ' + pf(A.cnt.a.blue) +
      ' | 黄 ' + pf(A.cnt.a.yel) + ' 品红 ' + pf(A.cnt.a.mag) + ' 青 ' + pf(A.cnt.a.cyn) +
      ' | 白 ' + pf(A.cnt.a.white) + ' 黑 ' + pf(A.cnt.a.blk));

    // 单球屏幕半径：格内 100 坐标系 R=40 ⇒ 屏幕 R = 0.40 × 格宽 × dsf
    const rPx = 0.40 * W;
    const ballArea = Math.PI * rPx * rPx;
    const wr0 = A.cnt.a.white / ballArea;
    log('  单球屏幕半径 r≈' + rPx.toFixed(1) + 'px，单球面积≈' + Math.round(ballArea) + 'px²');
    log('  白区面积 / 单球面积 = ' + (wr0 * 100).toFixed(1) + '%（设计值 70%）');

    log('');
    log('  --- 判据 1：加色法混色 ---');
    chk('纯红区存在', A.cnt.a.red > T * 0.02, pf(A.cnt.a.red));
    chk('纯绿区存在', A.cnt.a.green > T * 0.02, pf(A.cnt.a.green));
    chk('纯蓝区存在', A.cnt.a.blue > T * 0.02, pf(A.cnt.a.blue));
    chk('两两交叠·黄 (红+绿) 存在', A.cnt.a.yel > T * 0.015, pf(A.cnt.a.yel));
    chk('两两交叠·品红 (红+蓝) 存在', A.cnt.a.mag > T * 0.015, pf(A.cnt.a.mag));
    chk('两两交叠·青 (绿+蓝) 存在', A.cnt.a.cyn > T * 0.015, pf(A.cnt.a.cyn));
    chk('三交·白 存在', A.cnt.a.white > T * 0.20, pf(A.cnt.a.white));
    chk('白区面积 = 单球面积 70% ±3%', Math.abs(wr0 - 0.70) <= 0.03, (wr0 * 100).toFixed(1) + '%');
    const eq3 = (x, y, z, tol) => Math.max(Math.abs(x - y), Math.abs(y - z)) / Math.max(x, y, z) <= tol;
    chk('三原色面积彼此相等（±6%）', eq3(A.cnt.a.red, A.cnt.a.green, A.cnt.a.blue, 0.06),
      A.cnt.a.red + '/' + A.cnt.a.green + '/' + A.cnt.a.blue);
    chk('三交叠色面积彼此相等（±6%）', eq3(A.cnt.a.yel, A.cnt.a.mag, A.cnt.a.cyn, 0.06),
      A.cnt.a.yel + '/' + A.cnt.a.mag + '/' + A.cnt.a.cyn);

    log('');
    log('  --- 判据 2：绕格心公转（以白区为锚点） ---');
    const cx = W / 2, cy = H / 2;
    log('  截图格心 (' + cx.toFixed(1) + ', ' + cy.toFixed(1) + ')');
    ['a', 'b', 'c'].forEach((k, i) => {
      const p = A.centroid[k];
      log('    ' + ['0°', '120°', '90°'][i] + ' 白区质心 (' + p[0].toFixed(1) + ', ' + p[1].toFixed(1) +
        ')  偏移 (' + (p[0] - cx).toFixed(2) + ', ' + (p[1] - cy).toFixed(2) + ')  白区像素 ' + A.cnt[k].white);
    });
    const dev = ['a', 'b', 'c'].map(k => Math.max(Math.abs(A.centroid[k][0] - cx), Math.abs(A.centroid[k][1] - cy)));
    chk('白区质心恒在格心（三角度均 < 1.5px，即 0.5 CSS px）', Math.max.apply(null, dev) < 1.5,
      '最大 ' + Math.max.apply(null, dev).toFixed(2) + 'px');
    const wc = [A.cnt.a.white, A.cnt.b.white, A.cnt.c.white];
    chk('白区面积不随公转变化（±4%）', (Math.max.apply(null, wc) - Math.min.apply(null, wc)) / wc[0] <= 0.04,
      wc.join('/'));
    log('  白区 IoU：0°vs120° = ' + A.iou.whiteAB.toFixed(3) + '   0°vs90° = ' + A.iou.whiteAC.toFixed(3));
    chk('白区形状+位置在 0° vs 120° 基本一致（IoU>0.90）', A.iou.whiteAB > 0.90, 'IoU=' + A.iou.whiteAB.toFixed(3));
    chk('白区形状+位置在 0° vs 90° 基本一致（IoU>0.90）', A.iou.whiteAC > 0.90, 'IoU=' + A.iou.whiteAC.toFixed(3));
    log('  反向对照：红区 0°vs120° IoU = ' + A.iou.redAB.toFixed(3) + '   蓝区 0°vs90° IoU = ' + A.iou.blueAC.toFixed(3));
    chk('红/蓝单色区确实随公转移动（IoU<0.75，证明确实在转）', A.iou.redAB < 0.75 && A.iou.blueAC < 0.75,
      A.iou.redAB.toFixed(3) + ' / ' + A.iou.blueAC.toFixed(3));

    // ---------- 判据 3：点对数字 → 消散 ----------
    log('');
    log('  --- 判据 3：点对数字后三原色消散 ---');
    const before = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-balls');
      return el ? getComputedStyle(el).opacity : null;
    });
    const clicked = await page.evaluate(() => {
      const t = game.currentNumber;
      const cells = Array.prototype.slice.call(document.querySelectorAll('.p12-cell'));
      const cell = cells.filter(c => Number(c.dataset.number) === Number(t))[0];
      if (!cell) return { err: 'no cell for ' + t };
      cell.click();
      return { t: t, cls: cell.className };
    });
    log('  待点数字=' + clicked.t + ' → 点击后 class="' + clicked.cls + '"');
    chk('点对后该格加上 .p12-dissolve', !clicked.err && String(clicked.cls).indexOf('p12-dissolve') >= 0, clicked.err || '');
    await sleep(900);
    const after = await page.evaluate(() => {
      const cell = document.querySelector('.p12-cell.p12-dissolve');
      if (!cell) return { err: 'none dissolved' };
      const balls = cell.querySelector('.p12-balls');
      const orbit = cell.querySelector('.p12-orbit');
      const txt = cell.querySelector('text');
      return {
        ballsOpacity: getComputedStyle(balls).opacity,
        orbitPlay: getComputedStyle(orbit).animationPlayState,
        textFill: getComputedStyle(txt).fill,
        total: document.querySelectorAll('.p12-cell').length,
        dis: document.querySelectorAll('.p12-cell.p12-dissolve').length
      };
    });
    log('  消散后：balls opacity=' + after.ballsOpacity + '  orbit play-state=' + after.orbitPlay +
      '  数字 fill=' + after.textFill + '  已消散 ' + after.dis + '/' + after.total);
    chk('三原色完全不可见（opacity=0）', Number(after.ballsOpacity) === 0, 'opacity=' + after.ballsOpacity);
    chk('该格公转已暂停', after.orbitPlay === 'paused', 'play-state=' + after.orbitPlay);
    chk('数字转绿（黑底上仍可读）', /(76,\s*175,\s*80)|4CAF50/i.test(String(after.textFill)), after.textFill);
    chk('只消散被点的那一格', after.dis === 1, after.dis + '/' + after.total);

    // ---------- 判据 4：打印静态 ----------
    log('');
    log('  --- 判据 4：打印 ---');
    await page.emulateMediaType('print');
    await sleep(300);
    const pr = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      const balls = document.querySelector('.p12-balls');
      return {
        anim: getComputedStyle(el).animationName,
        tf: getComputedStyle(el).transform,
        bAnim: getComputedStyle(balls).animationName,
        bOp: getComputedStyle(balls).opacity
      };
    });
    log('  打印介质：orbit animation=' + pr.anim + ' transform=' + pr.tf + '  balls animation=' + pr.bAnim + ' opacity=' + pr.bOp);
    chk('打印时公转关闭', pr.anim === 'none', pr.anim);
    chk('打印时姿态归零', pr.tf === 'none', pr.tf);
    chk('打印时三原色完整', pr.bAnim === 'none' && pr.bOp === '1', pr.bAnim + '/' + pr.bOp);
    await page.emulateMediaType(null);

    chk('页面无 JS 报错', errs.length === 0, errs.slice(0, 3).join(' | '));

    log('');
    log('=== 合计：PASS ' + PASS + ' / FAIL ' + FAIL + ' ===');
  } catch (e) {
    log('EXCEPTION: ' + (e && e.stack || e));
  } finally {
    if (browser) try { await browser.close(); } catch (e) {}
  }
})();
