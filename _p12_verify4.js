// 图案12·原色变换 数值验证 v4（旋转真实性 / 边缘渐隐 / 与图案1 字体字号一致性）
//
// 【第四轮调整·现行】先生：「边缘模糊改为15% 然后旋转速度加1倍」
//   ① 渐隐带 30%→15%：径向渐变 stop offset '70%'→'85%'（85%~100% 为过渡带，仍为 15%R 宽）
//   ② 旋转速度 ×2：CSS 周期 20s→10s（18°/s→36°/s）；逐格随机相位基准 20s→10s
//   ③ 半径自适应：R 46→42。原因：15% 渐隐下边缘 alpha 衰减更快，
//      若仍用 R=46 则格边(50 单位)处 alpha 仍有 0.59，被格子裁切会露可见硬切口（锐边）；
//      R=42 时球外径 R+D = 49.4 < 50 ⇒ 球在格边处 alpha 已归零，无裁切。
//   ④ D 保持 7.4，因有效半径几乎不变：46×0.849 = 39.05 → 42×0.925 = 38.85（差 0.5%）
//      ⇒ 白区大小、数字余量应与上一轮基本一致（本轮须回归验证这一点）。
//   新增判据：沿红球 +x 方向的径向射线扫描，实测 alpha 从满色衰减到 0 的宽度 / R ≈ 15%
//      （screen 混合叠在黑底上时，纯红球的 R 通道 ≈ 255×alpha，可直接反推 alpha 剖面）
// v3 → v4 的改动背景（先生反馈三点）：
//   ① "我要求这个是旋转的" —— v1~v3 只验证了"动画对象存在"，从未验证"不干预时它真的在转"，这是验证盲区。
//      v4 新增判据 0：不暂停、不设 currentTime，隔 1.2 秒读两次 computed transform，反推角速度。
//   ② "三原色边缘要模糊 30%" —— 改为径向渐变（0~70% 实色 / 70%~100% 渐隐），
//      R 40→46、D 7.6→7.4（补偿渐隐带吃掉的有效半径），并验证过渡像素占比确实大幅上升。
//   ③ "数字字体没用到之前的" —— 字号 32→40、y 61→64，与图案1 逐项一致，并直接对比字符串。
// 用法：node _p12_verify4.js
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const SRC = 'D:/专注力项目/schulte-grid.html';
const OUT = 'D:/专注力项目/_p12_verify4_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = []; const log = s => { out.push(s); try { fs.writeFileSync(OUT, out.join('\n'), 'utf8'); } catch (e) {} };
let PASS = 0, FAIL = 0;
function chk(name, ok, detail) { ok ? PASS++ : FAIL++; log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + name + (detail ? '  ' + detail : '')); }
const R = 42;                           // 与页面内保持同步，只用于理论值核对
const EFF = 0.925;                      // 85%~100% 线性渐隐 ⇒ alpha>0.5 的有效半径 = 0.925R
const FADE = 0.15;                      // 渐隐带宽度 / R（先生第四轮指定 15%）
// 【第六轮】先生：「每个方格三原色转动方向 转动轨道都不一样 把偏心率设定在一个小范围 都不一样」
//   偏心程度 dr = Dg/(R·EFF) 每格从 [DR_MIN, DR_MAX] 随机取；周期每格从 [DUR_MIN, DUR_MAX] 秒取；方向顺/逆各半。
//   下面常量须与页面内保持一致（页面同名同值）。
const DR_MIN = 0.170, DR_MAX = 0.200;
const DUR_MIN = 9.0, DUR_MAX = 11.5;

// 三圆公共交叠面积 / 单球面积 —— 独立数值核算（与 d3 表、页面几何无共同公式）
function triOverlapRatio(dr, N) {
  N = N || 3000;
  const cell = 3 / N, unit = cell * cell;
  const cs = [0, 1, 2].map(k => {
    const a = k * 2 * Math.PI / 3;
    return [dr * Math.cos(a), dr * Math.sin(a)];
  });
  let c = 0;
  for (let i = 0; i < N; i++) {
    const x = -1.5 + (i + 0.5) * cell;
    for (let j = 0; j < N; j++) {
      const y = -1.5 + (j + 0.5) * cell;
      if (cs.every(p => Math.hypot(x - p[0], y - p[1]) <= 1)) c++;
    }
  }
  return (c * unit) / Math.PI;
}

function angOf(mat) {
  const m = /matrix\(([^)]+)\)/.exec(mat || '');
  if (!m) return null;
  const p = m[1].split(',').map(Number);
  return Math.atan2(p[1], p[0]) * 180 / Math.PI;
}

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

    log('=== 图案12·原色变换 数值验证 v4 ===');
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
    log('  gridSize=' + gs + '  .p12-cell=' + n);
    chk('图案12 渲染出全部格子', n > 0 && n === gs * gs, 'n=' + n);
    if (n === 0) return;

    await page.evaluate(() => { const b = document.getElementById('start-btn'); if (b) b.click(); });
    await sleep(800);
    chk('游戏已开始', await page.evaluate(() => game.isPlaying === true), '');

    // ================= 判据 0：旋转真实性（不干预） =================
    log('');
    log('  --- 判据 0：公转是否「真的在动」（不暂停、不设 currentTime）---');
    const s1 = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      const as = el.getAnimations();
      return { n: as.length, state: as.length ? as[0].playState : 'none',
               ct: as.length ? as[0].currentTime : -1,
               dur: as.length ? as[0].effect.getTiming().duration : -1,
               tf: getComputedStyle(el).transform };
    });
    await sleep(1200);
    const s2 = await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      const as = el.getAnimations();
      return { ct: as.length ? as[0].currentTime : -1, tf: getComputedStyle(el).transform };
    });
    const a1 = angOf(s1.tf), a2 = angOf(s2.tf);
    log('    动画数=' + s1.n + '  playState=' + s1.state + '  周期=' + s1.dur + 'ms');
    log('    t=0.0s  transform=' + s1.tf + '  → 角度 ' + (a1 === null ? 'n/a' : a1.toFixed(2) + '°'));
    log('    t=1.2s  transform=' + s2.tf + '  → 角度 ' + (a2 === null ? 'n/a' : a2.toFixed(2) + '°'));
    log('    currentTime: ' + s1.ct.toFixed(1) + ' → ' + s2.ct.toFixed(1) + ' ms');
    let dAng = null;
    if (a1 !== null && a2 !== null) dAng = (((a2 - a1) % 360) + 540) % 360 - 180;
    const degPerSec = dAng === null ? null : dAng / 1.2;
    log('    实测角速度 = ' + (degPerSec === null ? 'n/a' : degPerSec.toFixed(2) + ' °/s') +
      '（本格周期 ' + (s1.dur / 1000).toFixed(2) + 's ⇒ 期望 ' + (360 / (s1.dur / 1000)).toFixed(1) + ' °/s；' +
      '速度已比最初的 18°/s 快约一倍）');
    chk('动画处于 running（不是 paused）', s1.state === 'running', s1.state);
    chk('动画周期落在每格随机区间内（9.0~11.5s）',
      s1.dur >= DUR_MIN * 1000 - 2 && s1.dur <= DUR_MAX * 1000 + 2,
      s1.dur + 'ms ∈ [' + (DUR_MIN * 1000) + ', ' + (DUR_MAX * 1000) + ']ms');
    chk('速度与周期自洽（°/s × 周期 ≈ 360°）',
      degPerSec !== null && Math.abs(Math.abs(degPerSec) * s1.dur / 1000 - 360) < 15,
      degPerSec === null ? 'n/a' : (Math.abs(degPerSec) * s1.dur / 1000).toFixed(1) + '°');
    chk('currentTime 在自然递增', s2.ct > s1.ct + 500, (s2.ct - s1.ct).toFixed(0) + 'ms/1.2s');
    chk('transform 真的在转（角速度 30~40°/s，非 0）', degPerSec !== null && Math.abs(degPerSec) > 24,
      degPerSec === null ? 'n/a' : degPerSec.toFixed(2) + '°/s');
    chk('角速度已翻倍（≈2× 最初的 18°/s）',
      degPerSec !== null && Math.abs(degPerSec) > 29 && Math.abs(degPerSec) < 44,
      degPerSec === null ? 'n/a' : degPerSec.toFixed(2) + '°/s');
    const ph = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('.p12-cell .p12-orbit').forEach((el, i) => {
        if (i < 6) r.push(getComputedStyle(el).transform);
      });
      return r;
    });
    const phAngs = ph.map(angOf).filter(v => v !== null).map(v => +v.toFixed(2));
    log('    前 6 格当前角度：' + phAngs.join('° / ') + '°');
    chk('各格起始相位已随机错开（前 6 格角度不全相同）', new Set(phAngs).size >= 4, new Set(phAngs).size + ' 种');

    // ============ 跨格随机性：每格方向 / 轨道(偏心程度) / 周期 / 相位都不同 ============
    log('');
    log('  --- 判据 7：每格的转动方向、轨道（偏心程度）、周期是否各不相同 ---');
    const cross = await page.evaluate(() => {
      const os = Array.prototype.slice.call(document.querySelectorAll('.p12-cell .p12-orbit'));
      return os.map((o, i) => {
        const cs = o.querySelectorAll('.p12-balls circle');
        const d = [0, 1, 2].map(k => Math.hypot(
          Number(cs[k].getAttribute('cx')) - 50, Number(cs[k].getAttribute('cy')) - 50));
        const st = getComputedStyle(o);
        return { i: i, d: d, dur: parseFloat(st.animationDuration),
                 dir: st.animationDirection, delay: parseFloat(st.animationDelay) };
      });
    });
    const dAvg = cross.map(o => (o.d[0] + o.d[1] + o.d[2]) / 3);
    const dSpr = cross.map(o => Math.max.apply(null, o.d) - Math.min.apply(null, o.d));
    const drs = dAvg.map(v => v / (R * EFF));
    const uniq = a => new Set(a.map(v => v.toFixed(4))).size;
    log('    每格偏心程度 dr：' + drs.map(v => v.toFixed(3)).join(' '));
    log('    每格轨道半径(用户单位)：' + dAvg.map(v => v.toFixed(2)).join(' '));
    log('    每格周期(s)：' + cross.map(o => o.dur.toFixed(2)).join(' '));
    log('    每格方向：' + cross.map(o => (o.dir === 'reverse' ? '逆' : '顺')).join(' '));
    log('    每格相位(s)：' + cross.map(o => o.delay.toFixed(2)).join(' '));
    chk('每格三球严格等距（白区恒定居中的前提）',
      Math.max.apply(null, dSpr) < 0.05, '最大球心距互差 ' + Math.max.apply(null, dSpr).toFixed(4));
    chk('偏心程度「都不一样」：16 格中不同值 ≥14 个', uniq(drs) >= 14, uniq(drs) + '/16 种');
    chk('偏心程度全落在设定小范围 [' + DR_MIN + ', ' + DR_MAX + ']',
      Math.min.apply(null, drs) >= DR_MIN - 0.002 && Math.max.apply(null, drs) <= DR_MAX + 0.002,
      '实测 ' + Math.min.apply(null, drs).toFixed(3) + ' ~ ' + Math.max.apply(null, drs).toFixed(3));
    chk('球不出格：max(轨道半径)+R < 50',
      R + Math.max.apply(null, dAvg) < 50,
      (R + Math.max.apply(null, dAvg)).toFixed(2) + ' < 50');
    chk('周期「都不一样」：不同值 ≥14 个', uniq(cross.map(o => o.dur)) >= 14, uniq(cross.map(o => o.dur)) + '/16 种');
    chk('周期全落在 [' + DUR_MIN + ', ' + DUR_MAX + ']s',
      Math.min.apply(null, cross.map(o => o.dur)) >= DUR_MIN - 0.02 &&
      Math.max.apply(null, cross.map(o => o.dur)) <= DUR_MAX + 0.02,
      Math.min.apply(null, cross.map(o => o.dur)).toFixed(2) + '~' + Math.max.apply(null, cross.map(o => o.dur)).toFixed(2) + 's');
    const nNorm = cross.filter(o => o.dir !== 'reverse').length;
    const nRev = cross.length - nNorm;
    chk('顺时针/逆时针两种方向都出现，且各不少于 3 格', nNorm >= 3 && nRev >= 3,
      '顺 ' + nNorm + ' 格 / 逆 ' + nRev + ' 格');
    chk('相位「都不一样」：不同值 ≥12 个', uniq(cross.map(o => o.delay)) >= 12,
      uniq(cross.map(o => o.delay)) + '/16 种');
    // 方向不能只看 CSS 声明，实测两格转角符号（一正一负才算真的反向）
    const nIdx = cross.filter(o => o.dir !== 'reverse')[0].i;
    const rIdx = cross.filter(o => o.dir === 'reverse')[0].i;
    const readAng = (i) => page.evaluate((k) => {
      const o = document.querySelectorAll('.p12-cell .p12-orbit')[k];
      const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(o).transform || '');
      if (!m) return null;
      const p = m[1].split(',').map(Number);
      return Math.atan2(p[1], p[0]) * 180 / Math.PI;
    }, i);
    const aN1 = await readAng(nIdx), aR1 = await readAng(rIdx);
    await sleep(900);
    const aN2 = await readAng(nIdx), aR2 = await readAng(rIdx);
    const dN = (((aN2 - aN1) % 360) + 540) % 360 - 180;
    const dR = (((aR2 - aR1) % 360) + 540) % 360 - 180;
    chk('实测：正向格与反向格的转角符号相反（方向真的不同）', dN * dR < 0,
      'normal ' + dN.toFixed(2) + '° / reverse ' + dR.toFixed(2) + '°（0.9s 内）');

    // ================= 固定角度截图 =================
    await page.evaluate(() => {
      const el = document.querySelector('.p12-cell .p12-orbit');
      el.style.animationDelay = '0s';
      el.getAnimations().forEach(a => { a.currentTime = 0; a.pause(); });
    });
    await sleep(150);
    const clipBox = await page.evaluate(() => {
      const r = document.querySelector('.p12-cell').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const shoot = async (t) => {
      await page.evaluate((tt) => {
        document.querySelector('.p12-cell .p12-orbit').getAnimations().forEach(a => { a.currentTime = tt; a.pause(); });
      }, t);
      await sleep(130);
      return await page.screenshot({ encoding: 'base64', clip: clipBox });
    };

    await page.evaluate(() => { document.querySelectorAll('.p12-cell text').forEach(t => { t.style.display = 'none'; }); });
    await sleep(110);
    const D = dAvg[0];                      // 第一格的实际轨道半径（各格不同，几何核算一律以第一格为准）
    const per = s1.dur;                     // 第一格的实际周期 ms（各格周期不同，截图角度必须按本格周期折算）
    const hideA = await shoot(0), hideB = await shoot(per / 3), hideC = await shoot(per / 4);
    await page.evaluate(() => { document.querySelectorAll('.p12-cell text').forEach(t => { t.style.display = ''; }); });
    await sleep(110);
    const showA = await shoot(0);

    const S = await page.evaluate(async (pack) => {
      async function dec(b64) {
        const bin = atob(b64); const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const bmp = await createImageBitmap(new Blob([arr], { type: 'image/png' }));
        const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
        const x = cv.getContext('2d'); x.drawImage(bmp, 0, 0);
        return x.getImageData(0, 0, cv.width, cv.height);
      }
      function cls(im) {
        const d = im.data, W = im.width, H = im.height, n = W * H;
        const mask = new Uint8Array(n);
        let white = 0, red = 0, green = 0, blue = 0, yel = 0, mag = 0, cyn = 0, blk = 0, mid = 0;
        let wx = 0, wy = 0, wrmin = 1e9, wrmax = -1e9;
        const cx = W / 2, cy = H / 2;
        for (let p = 0; p < n; p++) {
          const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
          const mn = Math.min(r, Math.min(g, b)), mx = Math.max(r, Math.max(g, b));
          if (mn > 128) {
            mask[p] = 1; white++; wx += p % W; wy += (p - (p % W)) / W;
            const rad = Math.hypot((p % W) + 0.5 - cx, ((p - (p % W)) / W) + 0.5 - cy);
            if (rad < wrmin) wrmin = rad; if (rad > wrmax) wrmax = rad;
          }
          else if (r > 150 && g > 150 && b < 105) { mask[p] = 5; yel++; }
          else if (r > 150 && b > 150 && g < 105) { mask[p] = 6; mag++; }
          else if (g > 150 && b > 150 && r < 105) { mask[p] = 7; cyn++; }
          else if (r > g + 60 && r > b + 60 && g < 105 && b < 105) { mask[p] = 2; red++; }
          else if (g > r + 60 && g > b + 60 && r < 105 && b < 105) { mask[p] = 3; green++; }
          else if (b > r + 60 && b > g + 60 && r < 105 && g < 105) { mask[p] = 4; blue++; }
          else if (mx < 105) { mask[p] = 8; blk++; }
          else { mask[p] = 9; mid++; }        // 过渡/中间色
        }
        return { W, H, n, mask, white, red, green, blue, yel, mag, cyn, blk, mid,
                 wcx: white ? wx / white : -1, wcy: white ? wy / white : -1, wrmin, wrmax };
      }
      function iou(a, b, v) { let i = 0, u = 0; for (let p = 0; p < a.length; p++) { const x = a[p] === v, y = b[p] === v; if (x || y) { u++; if (x && y) i++; } } return u ? i / u : 0; }
      const Aimg = await dec(pack.hideA);
      const A = cls(Aimg), B = cls(await dec(pack.hideB)), C = cls(await dec(pack.hideC));
      const S2 = cls(await dec(pack.showA));
      let ocW = 0, ocC = 0, ocB = 0, wRmin = 1e9, wRmax = -1e9, cRmin = 1e9, cRmax = -1e9;
      const cx2 = A.W / 2, cy2 = A.H / 2;
      for (let p = 0; p < A.mask.length; p++) {
        const rad = Math.hypot((p % A.W) + 0.5 - cx2, ((p - (p % A.W)) / A.W) + 0.5 - cy2);
        if (S2.mask[p] === 8) {
          if (A.mask[p] === 1) { ocW++; if (rad < wRmin) wRmin = rad; if (rad > wRmax) wRmax = rad; }
          else if (A.mask[p] === 8) ocB++;
          else { ocC++; if (rad < cRmin) cRmin = rad; if (rad > cRmax) cRmax = rad; }
        }
      }
      // 注意：wrmin/wrmax 是「白区像素本身」的半径范围（wrmin≈0.7 就是格心那个像素），
      // 不能拿来当「白区边界半径」。边界必须按方向射线扫描取每方向最远的白像素。
      let wbMin = 1e9, wbMax = -1e9;
      for (let a2 = 0; a2 < 720; a2++) {
        const th = a2 / 720 * Math.PI * 2;
        let last = 0;
        for (let rr = 2; rr < Math.min(A.W, A.H) / 2; rr += 1) {
          const xx = Math.round(cx2 + Math.cos(th) * rr), yy = Math.round(cy2 + Math.sin(th) * rr);
          if (xx < 0 || yy < 0 || xx >= A.W || yy >= A.H) break;
          if (A.mask[yy * A.W + xx] === 1) last = rr;
        }
        if (last > 0) { if (last < wbMin) wbMin = last; if (last > wbMax) wbMax = last; }
      }
      // ---- 径向射线扫描：直测「边缘渐隐带宽度 / R」----
      // 0° 相位下红球心在格内 (50+D, 50)。取方向 (1,-0.5)/|..|：绿球心(46.3,56.41)、蓝球心(46.3,43.59)
      // 都在 -x 侧，该射线上到两者距离单调增 ⇒ 全程只有「纯红球 screen 叠在黑底上」，
      // 混合后 R 通道 ≈ 255×alpha（G/B 通道为 0），故可直接从像素值反推 alpha 剖面。
      const kk2 = A.W / 100;
      const pR = pack.R, pD = pack.D;
      const ux = 0.8944, uy = -0.4472;
      const ox = (50 + pD) * kk2, oy = 50 * kk2;
      let fullR = -1, zeroR = -1, prof = [];
      const rmax = pR * kk2 * 1.2;
      for (let rr = 0; rr <= rmax; rr += 1) {
        const xx = Math.round(ox + ux * rr), yy = Math.round(oy + uy * rr);
        if (xx < 0 || yy < 0 || xx >= A.W || yy >= A.H) break;
        const ii = (yy * A.W + xx) * 4;
        const rv = Aimg.data[ii], gv = Aimg.data[ii + 1], bv = Aimg.data[ii + 2];
        if (rr % 12 === 0) prof.push((rr / (pR * kk2)).toFixed(2) + 'R:' + rv);
        if (rv >= 250 && gv <= 3 && bv <= 3) fullR = rr;
        else if (fullR >= 0 && zeroR < 0 && rv <= 3) { zeroR = rr; break; }
      }
      const fadePx = (fullR >= 0 && zeroR > 0) ? (zeroR - fullR) : -1;
      const fadeRatio = fadePx >= 0 ? fadePx / (pR * kk2) : -1;

      return {
        W: A.W, H: A.H, n: A.n,
        A: { white: A.white, red: A.red, green: A.green, blue: A.blue, yel: A.yel, mag: A.mag, cyn: A.cyn, blk: A.blk, mid: A.mid, wrmin: A.wrmin, wrmax: A.wrmax },
        whiteEdge: [wbMin, wbMax],
        cent: { a: [A.wcx, A.wcy], b: [B.wcx, B.wcy], c: [C.wcx, C.wcy] },
        w: [A.white, B.white, C.white],
        iou: { wAB: iou(A.mask, B.mask, 1), wAC: iou(A.mask, C.mask, 1), rAB: iou(A.mask, B.mask, 2), bAC: iou(A.mask, C.mask, 4) },
        oc: { white: ocW, color: ocC, bothBlack: ocB, wR: [wRmin, wRmax], cR: cRmin < 1e9 ? [cRmin, cRmax] : null },
        fade: { fullR: fullR, zeroR: zeroR, px: fadePx, ratio: fadeRatio, prof: prof }
      };
    }, { hideA, hideB, hideC, showA, R, D });

    const W = S.W, H = S.H, T = S.n, A = S.A;
    const pf = v => (v / T * 100).toFixed(2) + '%';
    log('');
    log('  【隐藏数字】采样 ' + W + '×' + H + ' = ' + T + ' px');
    log('    红 ' + pf(A.red) + '  绿 ' + pf(A.green) + '  蓝 ' + pf(A.blue) +
      '  | 黄 ' + pf(A.yel) + '  品红 ' + pf(A.mag) + '  青 ' + pf(A.cyn) +
      '  | 白 ' + pf(A.white) + '  黑 ' + pf(A.blk) + '  过渡色 ' + pf(A.mid));

    // 设备像素 ↔ 格内单位换算：格 120 CSS px × dsf3 = 360px 设备像素 = 100 格内单位
    const k = (W / 100);
    const rPx = R * k, effPx = R * EFF * k;
    const dr0 = D / (R * EFF);                              // 第一格实际偏心程度
    const ratio0 = triOverlapRatio(dr0);                    // 该 dr 对应的白区占比（独立数值积分）
    const whiteTheory = ratio0 * Math.PI * effPx * effPx;   // 有效球半径口径的理论白区
    log('    单球几何半径 ' + R + ' → ' + rPx.toFixed(1) + 'px；边缘 15% 渐隐后有效半径 ' + (R * EFF).toFixed(2) + ' → ' + effPx.toFixed(1) + 'px');
    log('    白区 实测 ' + A.white + ' px²（等效半径 ' + Math.sqrt(A.white / Math.PI).toFixed(1) +
      'px；按 720 方向扫描的边界半径 ' + S.whiteEdge[0] + '~' + S.whiteEdge[1] + 'px）');
    log('    本格偏心程度 dr=' + dr0.toFixed(4) + ' ⇒ 独立数值积分得白区占比 ' + (ratio0 * 100).toFixed(1) + '%');
    log('    白区 理论(按本格 dr 独立核算) ' + Math.round(whiteTheory) + ' px²');
    log('    实测/理论 = ' + (A.white / whiteTheory * 100).toFixed(1) + '%');
    log('    白区 / 单球几何面积 = ' + (A.white / (Math.PI * rPx * rPx) * 100).toFixed(1) + '%（含 15% 渐隐带时的口径）');

    log('');
    log('  --- 判据 1：加色法混色 + 白区占比 ---');
    chk('纯红区存在', A.red > T * 0.003, pf(A.red));
    chk('纯绿区存在', A.green > T * 0.003, pf(A.green));
    chk('纯蓝区存在', A.blue > T * 0.003, pf(A.blue));
    chk('两两交叠·黄 (红+绿)', A.yel > T * 0.003, pf(A.yel));
    chk('两两交叠·品红 (红+蓝)', A.mag > T * 0.003, pf(A.mag));
    chk('两两交叠·青 (绿+蓝)', A.cyn > T * 0.003, pf(A.cyn));
    chk('三交·白 是最大色块', A.white > T * 0.20, pf(A.white));
    chk('白区面积 = 本格偏心程度对应的理论值 ±5%（约 70%）', Math.abs(A.white / whiteTheory - 1) <= 0.05, (A.white / whiteTheory * 100).toFixed(1) + '%');

    log('');
    log('  --- 判据 2：边缘 15% 渐隐是否生效（第四轮由 30% 收窄到 15%）---');
    log('    过渡/中间色像素占比 = ' + pf(A.mid) + '（无渐隐时该值 <1%，纯硬边；15% 渐隐带面积约为 30% 时的 54%，阈值同比下调）');
    chk('边缘渐隐生效（过渡色占比 > 3.5%，证明不再是硬边）', A.mid > T * 0.035, pf(A.mid));
    const fd = S.fade;
    log('    径向射线采样 [r/R : R通道]：' + fd.prof.join('  '));
    log('    R 通道由满色 255 衰减到 0 的区间：' + fd.fullR + ' → ' + fd.zeroR +
      ' px（球半径 ' + rPx.toFixed(1) + 'px）');
    log('    渐隐带实测宽度 / 球半径 = ' + (fd.ratio < 0 ? 'n/a' : (fd.ratio * 100).toFixed(1) + '%') + '（设计 15%）');
    chk('渐隐带宽度 ≈ 15% 球半径（11%~19%）', fd.ratio > 0.11 && fd.ratio < 0.19,
      (fd.ratio * 100).toFixed(1) + '%');
    chk('本格球未出格（外径 R+D < 格半径 50 单位）', (R + D) < 50, 'R+D=' + (R + D).toFixed(2) + ' < 50');
    chk('过渡带宽度 < 球几何半径：白区边界未被裁成硬边',
      S.whiteEdge[1] < rPx, '白区边界最大 ' + S.whiteEdge[1] + ' < 球半径 ' + rPx.toFixed(0) + 'px');

    log('');
    log('  --- 判据 3：数字与「默认模式」一致（字体/不补零/居中）+ 完全落在白区内 ---');
    const fnt = await page.evaluate(() => {
      const cells = Array.prototype.slice.call(document.querySelectorAll('.p12-cell'));
      const t = cells[0].querySelector('text');
      const cs = getComputedStyle(t);
      const bodyFam = getComputedStyle(document.body).fontFamily;
      const cellFam = getComputedStyle(cells[0]).fontFamily;
      return {
        attrFam: t.getAttribute('font-family'), csFam: cs.fontFamily,
        bodyFam: bodyFam, cellFam: cellFam,
        size: t.getAttribute('font-size'), weight: t.getAttribute('font-weight'),
        y: t.getAttribute('y'), x: t.getAttribute('x'), anchor: t.getAttribute('text-anchor'),
        nTextPerCell: cells.map(c => c.querySelectorAll('text').length),
        pairs: cells.map(c => ({ n: c.dataset.number, t: c.querySelector('text').textContent }))
      };
    });
    log('    实测属性：x="' + fnt.x + '" y="' + fnt.y + '" anchor="' + fnt.anchor +
      '"  font-size="' + fnt.size + '"  font-weight="' + fnt.weight + '"');
    log('    实测字体：attr="' + fnt.attrFam + '"');
    log('    computed：数字="' + fnt.csFam + '"');
    log('    computed：.p12-cell="' + fnt.cellFam + '"  body="' + fnt.bodyFam + '"');
    log('    （默认模式的数字是 .number-text，不设 font-family，直接继承 body ⇒ 与 body 一致即为「默认模式字体」）');
    chk('数字字体 = 默认模式字体（computed 与 body 继承链一致）',
      fnt.csFam === fnt.bodyFam && fnt.cellFam === fnt.bodyFam,
      fnt.csFam === fnt.bodyFam ? '一致' : '数字[' + fnt.csFam + '] vs body[' + fnt.bodyFam + ']');
    chk('已不再写死图案1 的 Arial 字体栈',
      String(fnt.attrFam).indexOf('Arial') < 0, fnt.attrFam);
    const noPad = fnt.pairs.every(o => o.t === String(o.n));
    const anyZero = fnt.pairs.some(o => /^0\d/.test(o.t));
    log('    各格文本：' + fnt.pairs.map(o => o.n + '→"' + o.t + '"').join(' '));
    chk('不补零：文本与 dataset.number 原样一致', noPad,
      noPad ? '全部一致' : fnt.pairs.filter(o => o.t !== String(o.n)).map(o => o.n + '→" ' + o.t + '"').join(','));
    chk('不存在前导零文本（如 "01"）', !anyZero, anyZero ? '有' : '无');
    chk('每格仅 1 个 text（不再左右两位两列）', fnt.nTextPerCell.every(v => v === 1), fnt.nTextPerCell.join(','));
    chk('数字视觉居中：x=50 + text-anchor=middle',
      fnt.x === '50' && fnt.anchor === 'middle', 'x=' + fnt.x + ' anchor=' + fnt.anchor);
    chk('字号/字重与默认模式口径相符（40 / 700）',
      fnt.size === '40' && fnt.weight === '700', fnt.size + '/' + fnt.weight);
    const oc = S.oc;
    const digitMaxR = oc.wR[1];
    log('    数字墨迹 ' + (oc.white + oc.color) + 'px：白区内 ' + oc.white + '，边界/彩区 ' + oc.color +
      '（另 ' + oc.bothBlack + 'px 是两图都黑的黑底，与数字无关）');
    log('    数字半径 ' + oc.wR[0].toFixed(1) + '~' + digitMaxR.toFixed(1) + 'px；越界像素半径 ' +
      (oc.cR ? oc.cR[0].toFixed(1) + '~' + oc.cR[1].toFixed(1) : '-') +
      'px；白区边界半径 ' + S.whiteEdge[0] + '~' + S.whiteEdge[1] + 'px');
    chk('数字未压到彩色月牙（越界像素远离数字）', !oc.cR || oc.cR[0] > digitMaxR + 10,
      oc.cR ? oc.cR[0].toFixed(1) + ' vs 数字 ' + digitMaxR.toFixed(1) : '无越界');
    chk('数字完全落在白区内（数字最大半径+10 < 白区边界最小半径）', digitMaxR + 10 < S.whiteEdge[0],
      digitMaxR.toFixed(1) + ' vs ' + S.whiteEdge[0] + 'px（余量 ' + (S.whiteEdge[0] - digitMaxR).toFixed(1) + 'px）');
    chk('白区边界形状正常（最小/最大半径比 ≈0.89，三重对称特征）',
      S.whiteEdge[0] / S.whiteEdge[1] > 0.80 && S.whiteEdge[0] / S.whiteEdge[1] < 0.97,
      (S.whiteEdge[0] / S.whiteEdge[1]).toFixed(3));

    log('');
    log('  --- 判据 4：绕格心公转（白区为锚点）---');
    const cx = W / 2, cy = H / 2;
    ['a', 'b', 'c'].forEach((kk, i) => {
      const p = S.cent[kk];
      log('    ' + ['0°', '120°', '90°'][i] + ' 白区质心 (' + p[0].toFixed(1) + ', ' + p[1].toFixed(1) +
        ') 偏移(' + (p[0] - cx).toFixed(2) + ', ' + (p[1] - cy).toFixed(2) + ') 像素 ' + S.w[i]);
    });
    const dev = ['a', 'b', 'c'].map(kk => Math.max(Math.abs(S.cent[kk][0] - cx), Math.abs(S.cent[kk][1] - cy)));
    chk('白区质心恒在格心（<1.5px）', Math.max.apply(null, dev) < 1.5, '最大 ' + Math.max.apply(null, dev).toFixed(2) + 'px');
    chk('白区面积不随公转变化 ±4%', (Math.max.apply(null, S.w) - Math.min.apply(null, S.w)) / S.w[0] <= 0.04, S.w.join('/'));
    chk('白区位置+形状 0°/120° 一致 IoU>0.90', S.iou.wAB > 0.90, S.iou.wAB.toFixed(3));
    chk('白区位置+形状 0°/90° 一致 IoU>0.90', S.iou.wAC > 0.90, S.iou.wAC.toFixed(3));
    log('    反向对照：红区 0°vs120° IoU=' + S.iou.rAB.toFixed(3) + '  蓝区 0°vs90° IoU=' + S.iou.bAC.toFixed(3));
    chk('红/蓝单色区随公转移动（IoU<0.75）', S.iou.rAB < 0.75 && S.iou.bAC < 0.75, S.iou.rAB.toFixed(3) + '/' + S.iou.bAC.toFixed(3));

    log('');
    log('  --- 判据 5：点对数字后三原色消散 ---');
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
    const af = await page.evaluate(() => {
      const c = document.querySelector('.p12-cell.p12-dissolve');
      if (!c) return { err: 'none' };
      return { op: getComputedStyle(c.querySelector('.p12-balls')).opacity,
               play: getComputedStyle(c.querySelector('.p12-orbit')).animationPlayState,
               fill: getComputedStyle(c.querySelector('text')).fill,
               dis: document.querySelectorAll('.p12-cell.p12-dissolve').length,
               total: document.querySelectorAll('.p12-cell').length };
    });
    log('    消散后 balls opacity=' + af.op + '  play-state=' + af.play + '  数字 fill=' + af.fill);
    chk('三原色不可见 opacity=0', Number(af.op) === 0, af.op);
    chk('该格公转已暂停', af.play === 'paused', af.play);
    chk('数字转绿', /(76,\s*175,\s*80)|4CAF50/i.test(String(af.fill)), af.fill);
    chk('只消散被点那一格', af.dis === 1, af.dis + '/' + af.total);

    log('');
    log('  --- 判据 6：打印静态 ---');
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
