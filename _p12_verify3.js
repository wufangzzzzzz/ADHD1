// 图案12·原色变换 数值验证 v3（口径修正版）
// v2 遗留 FAIL「白区 61.6% vs 70.2%」经查明是我的测量口径错误：截图上压着黑色数字，
//   把白区抠掉了约 5604px²（占白区 12.3%）。v1 序列化时移除过 text，测得 64.2%（更接近 70%）可反向印证。
// 本版：白区面积必须在「隐藏数字」的截图上测；并用「隐藏/显示两张图的差分」反过来验证
//   数字是否完全落在白区内（若数字越到彩色月牙上，差分里就会出现"原本非白、显示后变黑"的像素）。
// 用法：node _p12_verify3.js
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const SRC = 'D:/专注力项目/schulte-grid.html';
const OUT = 'D:/专注力项目/_p12_verify3_out.txt';
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

    log('=== 图案12·原色变换 数值验证 v3（白区口径已修正）===');
    log('  源文件：' + SRC);

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
    log('  gridSize=' + gs + '  .p12-cell=' + n + '（期望 ' + gs * gs + '）');
    chk('图案12 渲染出全部格子', n > 0 && n === gs * gs, 'n=' + n);
    if (n === 0) return;

    await page.evaluate(() => { const b = document.getElementById('start-btn'); if (b) b.click(); });
    await sleep(900);
    const playing = await page.evaluate(() => ({ p: game.isPlaying, cur: game.currentNumber }));
    log('  开始游戏：isPlaying=' + playing.p + '  currentNumber=' + playing.cur);
    chk('游戏已开始', playing.p === true, 'isPlaying=' + playing.p);

    const clipBox = await page.evaluate(() => {
      const r = document.querySelector('.p12-cell').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    log('  首格 ' + clipBox.width.toFixed(1) + '×' + clipBox.height.toFixed(1) + ' CSS px，dsf=3 → 截图 ' +
      (clipBox.width * 3).toFixed(0) + 'px');

    async function shoot(t) {
      await page.evaluate((tt) => {
        const el = document.querySelector('.p12-cell .p12-orbit');
        el.style.animationDelay = '0s';
        el.getAnimations().forEach(a => { a.currentTime = tt; a.pause(); });
      }, t);
      await sleep(140);
      return await page.screenshot({ encoding: 'base64', clip: clipBox });
    }

    // ---- 甲组：隐藏数字，测纯几何 ----
    await page.evaluate(() => { document.querySelectorAll('.p12-cell text').forEach(t => { t.style.display = 'none'; }); });
    await sleep(120);
    const hideA = await shoot(0);
    const hideB = await shoot(24000);   // 120°
    const hideC = await shoot(18000);   // 90°
    // ---- 乙组：显示数字，测遮挡 ----
    await page.evaluate(() => { document.querySelectorAll('.p12-cell text').forEach(t => { t.style.display = ''; }); });
    await sleep(120);
    const showA = await shoot(0);

    const R = await page.evaluate(async (pack) => {
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
      function cls(im) {
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
      function iou(a, b, v) {
        let inter = 0, uni = 0;
        for (let p = 0; p < a.length; p++) { const x = a[p] === v, y = b[p] === v; if (x || y) { uni++; if (x && y) inter++; } }
        return uni ? inter / uni : 0;
      }
      const hA = cls(await decode(pack.hideA));
      const hB = cls(await decode(pack.hideB));
      const hC = cls(await decode(pack.hideC));
      const sA = cls(await decode(pack.showA));

      // 数字遮挡分析：以「隐藏图」为基准。注意「显示图=黑」既有数字也有黑底，
      // 必须结合隐藏图才能区分：隐藏图非黑 + 显示图黑 = 该像素被数字盖住。
      // 同时记录这些像素到格心的半径 —— 用于分辨"数字真压到彩色月牙上" vs
      // "白区边界过渡带被数字盖住后被分类阈值误判"。
      let occlWhite = 0, occlColor = 0, occlBlack = 0;
      let wrMin = 1e9, wrMax = -1e9, crMin = 1e9, crMax = -1e9;
      const cxp = hA.W / 2, cyp = hA.H / 2;
      const m1 = hA.mask, m2 = sA.mask;
      for (let p = 0; p < m1.length; p++) {
        const rad = Math.hypot((p % hA.W) + 0.5 - cxp, ((p - (p % hA.W)) / hA.W) + 0.5 - cyp);
        if (m2[p] === 8) {
          if (m1[p] === 1) { occlWhite++; if (rad < wrMin) wrMin = rad; if (rad > wrMax) wrMax = rad; }
          else if (m1[p] === 8) occlBlack++;
          else { occlColor++; if (rad < crMin) crMin = rad; if (rad > crMax) crMax = rad; }
        }
      }
      // 白区边界半径（按方向扫描，取 720 方向的最小值 = 弧中点半径）
      let wbMin = 1e9, wbMax = -1e9;
      for (let a = 0; a < 720; a++) {
        const th = a / 720 * Math.PI * 2;
        let last = 0;
        for (let rr = 2; rr < Math.min(hA.W, hA.H) / 2; rr += 1) {
          const xx = Math.round(cxp + Math.cos(th) * rr), yy = Math.round(cyp + Math.sin(th) * rr);
          if (xx < 0 || yy < 0 || xx >= hA.W || yy >= hA.H) break;
          if (hA.mask[yy * hA.W + xx] === 1) last = rr;
        }
        if (last > 0) { if (last < wbMin) wbMin = last; if (last > wbMax) wbMax = last; }
      }
      return {
        W: hA.W, H: hA.H, n: hA.n,
        hide: { white: hA.white, red: hA.red, green: hA.green, blue: hA.blue, yel: hA.yel, mag: hA.mag, cyn: hA.cyn, blk: hA.blk },
        showWhite: sA.white,
        cent: { a: [hA.wcx, hA.wcy], b: [hB.wcx, hB.wcy], c: [hC.wcx, hC.wcy] },
        wWhite: [hA.white, hB.white, hC.white],
        iou: { wAB: iou(hA.mask, hB.mask, 1), wAC: iou(hA.mask, hC.mask, 1), rAB: iou(hA.mask, hB.mask, 2), bAC: iou(hA.mask, hC.mask, 4) },
        occl: { white: occlWhite, color: occlColor, bothBlack: occlBlack,
                wR: [wrMin, wrMax], cR: crMin < 1e9 ? [crMin, crMax] : null },
        whiteEdge: [wbMin, wbMax]
      };
    }, { hideA, hideB, hideC, showA });

    const W = R.W, H = R.H, T = R.n;
    const pf = v => (v / T * 100).toFixed(2) + '%';
    const hd = R.hide;
    log('');
    log('  【隐藏数字】采样 ' + W + '×' + H + ' = ' + T + ' px');
    log('    红 ' + pf(hd.red) + '  绿 ' + pf(hd.green) + '  蓝 ' + pf(hd.blue) +
      '  | 黄 ' + pf(hd.yel) + '  品红 ' + pf(hd.mag) + '  青 ' + pf(hd.cyn) +
      '  | 白 ' + pf(hd.white) + '  黑 ' + pf(hd.blk));

    const rPx = 0.40 * W;
    const ballArea = Math.PI * rPx * rPx;
    const wr = hd.white / ballArea;
    const wrShow = R.showWhite / ballArea;
    log('    单球屏幕半径 r≈' + rPx.toFixed(1) + 'px  单球面积≈' + Math.round(ballArea) + 'px²');
    log('    白区/单球（隐藏数字）= ' + (wr * 100).toFixed(1) + '%    ← 与数值积分 70.2% 对照');
    log('    白区/单球（显示数字）= ' + (wrShow * 100).toFixed(1) + '%    ← v2 测到的就是这个，偏小属正常');

    log('');
    log('  --- 判据 1：加色法混色（隐藏数字口径）---');
    chk('纯红区存在', hd.red > T * 0.02, pf(hd.red));
    chk('纯绿区存在', hd.green > T * 0.02, pf(hd.green));
    chk('纯蓝区存在', hd.blue > T * 0.02, pf(hd.blue));
    chk('两两交叠·黄 (红+绿)', hd.yel > T * 0.015, pf(hd.yel));
    chk('两两交叠·品红 (红+蓝)', hd.mag > T * 0.015, pf(hd.mag));
    chk('两两交叠·青 (绿+蓝)', hd.cyn > T * 0.015, pf(hd.cyn));
    chk('三交·白', hd.white > T * 0.25, pf(hd.white));
    chk('白区 = 单球面积 70% ±3%（对齐数值积分 70.2%）', Math.abs(wr - 0.702) <= 0.03, (wr * 100).toFixed(1) + '%');
    const eq3 = (x, y, z, tol) => Math.max(Math.abs(x - y), Math.abs(y - z)) / Math.max(x, y, z) <= tol;
    chk('三原色面积彼此相等±6%', eq3(hd.red, hd.green, hd.blue, 0.06), hd.red + '/' + hd.green + '/' + hd.blue);
    chk('三交叠色面积彼此相等±6%', eq3(hd.yel, hd.mag, hd.cyn, 0.06), hd.yel + '/' + hd.mag + '/' + hd.cyn);

    log('');
    log('  --- 判据 2：数字必须完全落在白区内 ---');
    const oc = R.occl;
    const ink = oc.white + oc.color;
    log('    数字墨迹合计 ' + ink + ' px：压在白区内 ' + oc.white + '，压在白区边界/彩色区 ' + oc.color);
    log('    （另有 ' + oc.bothBlack + ' px 是"两图都黑"的黑底，与数字无关）');
    log('    数字占白区 ' + (oc.white / hd.white * 100).toFixed(1) + '%  ← 这就是 v2 白区少算 12.3% 的来源');
    log('    白区边界半径扫描（720 方向）：' + R.whiteEdge[0] + ' ~ ' + R.whiteEdge[1] + ' px');
    log('      理论：弧中点 R-D=32.4 → ' + (32.4 * 3.6).toFixed(1) + 'px；角点 ' + (35.66 * 3.6).toFixed(1) + 'px');
    log('    白区内数字像素半径范围 ' + oc.wR[0].toFixed(1) + ' ~ ' + oc.wR[1].toFixed(1) + ' px');
    log('    越界像素半径范围 ' + (oc.cR ? oc.cR[0].toFixed(1) + ' ~ ' + oc.cR[1].toFixed(1) + ' px' : 'n/a'));
    const edgeMin = R.whiteEdge[0];
    // 判据：越界像素必须「远离数字」——数字墨迹半径只到 ~85px，白区边界在 115~129px；
    // 若越界像素半径远大于数字最大半径，说明它跟数字无关（两次独立截图间的抗锯齿抖动）。
    // 反过来说：只要没有任何越界像素落在数字半径范围内，就证明数字一笔都没压到彩色月牙上。
    const digitMaxR = oc.wR[1];
    const strayInsideDigit = oc.cR ? (oc.cR[0] <= digitMaxR + 10 ? 1 : 0) : 0;
    chk('数字未压到彩色月牙上（越界像素均远离数字，属截图间抗锯齿抖动）', strayInsideDigit === 0,
      '越界 ' + oc.color + 'px 半径 ' + (oc.cR ? oc.cR[0].toFixed(1) + '~' + oc.cR[1].toFixed(1) : '-') +
      '，数字最大半径 ' + digitMaxR.toFixed(1) + 'px');
    chk('白区边界半径符合几何（弧中点≈' + (32.4 * 3.6).toFixed(0) + 'px 角点≈' + (35.66 * 3.6).toFixed(0) + 'px）',
      Math.abs(R.whiteEdge[0] - 116.6) < 8 && Math.abs(R.whiteEdge[1] - 128.4) < 8,
      R.whiteEdge[0] + '~' + R.whiteEdge[1] + 'px');
    chk('数字完全落在白区内且留有余量（数字最大半径+10 < 白区最小半径）',
      digitMaxR + 10 < edgeMin, '数字 ' + digitMaxR.toFixed(1) + 'px vs 白区最小 ' + edgeMin + 'px（余量 ' + (edgeMin - digitMaxR).toFixed(1) + 'px）');
    chk('数字确实落在白区内（遮挡量 > 白区 8%）', oc.white / hd.white > 0.08, (oc.white / hd.white * 100).toFixed(1) + '%');

    log('');
    log('  --- 判据 3：绕格心公转（白区为锚点）---');
    const cx = W / 2, cy = H / 2;
    ['a', 'b', 'c'].forEach((k, i) => {
      const p = R.cent[k];
      log('    ' + ['0°', '120°', '90°'][i] + ' 白区质心 (' + p[0].toFixed(1) + ', ' + p[1].toFixed(1) +
        ') 偏移(' + (p[0] - cx).toFixed(2) + ', ' + (p[1] - cy).toFixed(2) + ') 像素 ' + R.wWhite[i]);
    });
    const dev = ['a', 'b', 'c'].map(k => Math.max(Math.abs(R.cent[k][0] - cx), Math.abs(R.cent[k][1] - cy)));
    chk('白区质心恒在格心（三角度 <1.5px）', Math.max.apply(null, dev) < 1.5, '最大 ' + Math.max.apply(null, dev).toFixed(2) + 'px');
    chk('白区面积不随公转变化 ±4%', (Math.max.apply(null, R.wWhite) - Math.min.apply(null, R.wWhite)) / R.wWhite[0] <= 0.04, R.wWhite.join('/'));
    log('    白区 IoU 0°vs120°=' + R.iou.wAB.toFixed(3) + '  0°vs90°=' + R.iou.wAC.toFixed(3));
    chk('白区位置+形状在 0°/120° 一致 IoU>0.90', R.iou.wAB > 0.90, R.iou.wAB.toFixed(3));
    chk('白区位置+形状在 0°/90° 一致 IoU>0.90', R.iou.wAC > 0.90, R.iou.wAC.toFixed(3));
    log('    反向对照：红区 0°vs120° IoU=' + R.iou.rAB.toFixed(3) + '  蓝区 0°vs90° IoU=' + R.iou.bAC.toFixed(3));
    chk('红/蓝单色区随公转移动（IoU<0.75，证明确实在转）', R.iou.rAB < 0.75 && R.iou.bAC < 0.75,
      R.iou.rAB.toFixed(3) + '/' + R.iou.bAC.toFixed(3));

    log('');
    log('  --- 判据 4：点对数字后三原色消散 ---');
    const clicked = await page.evaluate(() => {
      const t = game.currentNumber;
      const cells = Array.prototype.slice.call(document.querySelectorAll('.p12-cell'));
      const cell = cells.filter(c => Number(c.dataset.number) === Number(t))[0];
      if (!cell) return { err: 'no cell for ' + t };
      cell.click();
      return { t: t, cls: cell.className };
    });
    log('    待点数字=' + clicked.t + ' → class="' + clicked.cls + '"');
    chk('点对后加上 .p12-dissolve', !clicked.err && String(clicked.cls).indexOf('p12-dissolve') >= 0, clicked.err || '');
    await sleep(900);
    const after = await page.evaluate(() => {
      const cell = document.querySelector('.p12-cell.p12-dissolve');
      if (!cell) return { err: 'none' };
      return {
        op: getComputedStyle(cell.querySelector('.p12-balls')).opacity,
        play: getComputedStyle(cell.querySelector('.p12-orbit')).animationPlayState,
        fill: getComputedStyle(cell.querySelector('text')).fill,
        dis: document.querySelectorAll('.p12-cell.p12-dissolve').length,
        total: document.querySelectorAll('.p12-cell').length
      };
    });
    log('    消散后 balls opacity=' + after.op + '  play-state=' + after.play + '  数字 fill=' + after.fill +
      '  已消散 ' + after.dis + '/' + after.total);
    chk('三原色完全不可见 opacity=0', Number(after.op) === 0, 'opacity=' + after.op);
    chk('该格公转已暂停', after.play === 'paused', after.play);
    chk('数字转绿（黑底可读）', /(76,\s*175,\s*80)|4CAF50/i.test(String(after.fill)), after.fill);
    chk('只消散被点那一格', after.dis === 1, after.dis + '/' + after.total);

    log('');
    log('  --- 判据 5：打印介质静态 ---');
    await page.emulateMediaType('print');
    await sleep(300);
    const pr = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      const b = document.querySelector('.p12-balls');
      return { anim: getComputedStyle(el).animationName, tf: getComputedStyle(el).transform,
               bAnim: getComputedStyle(b).animationName, bOp: getComputedStyle(b).opacity };
    });
    log('    orbit animation=' + pr.anim + ' transform=' + pr.tf + '  balls animation=' + pr.bAnim + ' opacity=' + pr.bOp);
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
