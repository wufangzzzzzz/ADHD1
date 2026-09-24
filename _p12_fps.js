// 图案12 性能验证：真实窗口（headless:false）测帧率
//   headless 下 rAF 不受垂直同步限制，帧率是假的，必须开真窗口。
//   同时读 getAnimations().currentTime 的推进量 —— 若主线程被重绘阻塞，动画推进也会被拖慢。
// 用法：node _p12_fps.js
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const SRC = 'D:/专注力项目/schulte-grid.html';
const OUT = 'D:/专注力项目/_p12_fps_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = []; const log = s => { out.push(s); try { fs.writeFileSync(OUT, out.join('\n'), 'utf8'); } catch (e) {} };

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--window-size=1000,820', '--window-position=40,40']
    });
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('file:///' + SRC.replace(/\\/g, '/'), { waitUntil: 'load' });
    await sleep(1500);

    log('=== 图案12 帧率验证（真实窗口 60Hz）===');

    for (const gsz of [4, 7, 9]) {
      await page.evaluate((g) => {
        try { game.setDifficulty(g); } catch (e) {}      // 正确入口是 setDifficulty（直接改 game.gridSize 无效）
        try { game.setPatternSub(12); } catch (e) {}
        const b = document.getElementById('start-btn');
        if (b) b.click();
      }, gsz);
      await sleep(1600);
      const cnt = await page.evaluate(() => document.querySelectorAll('.p12-cell').length);
      const cellPx = await page.evaluate(() => {
        const c = document.querySelector('.p12-cell');
        return c ? Math.round(c.getBoundingClientRect().width) : 0;
      });

      const res = await page.evaluate(() => new Promise(resolve => {
        const gaps = [];
        const el = document.querySelector('.p12-cell .p12-orbit');
        const a0 = el ? (el.getAnimations()[0] || {}).currentTime || 0 : 0;
        const t0 = performance.now();
        let last = t0, n = 0;
        function tick(t) {
          gaps.push(t - last); last = t;
          if (++n < 150) requestAnimationFrame(tick);
          else {
            const a1 = el ? (el.getAnimations()[0] || {}).currentTime || 0 : 0;
            resolve({ gaps: gaps.slice(1), dt: performance.now() - t0, adv: a1 - a0 });
          }
        }
        requestAnimationFrame(tick);
      }));

      const g = res.gaps.slice().sort((a, b) => a - b);
      const med = g[Math.floor(g.length / 2)];
      const p95 = g[Math.floor(g.length * 0.95)];
      const max = g[g.length - 1];
      const fps = 1000 / med;
      log('');
      log('  gridSize=' + gsz + '（' + cnt + ' 格，单格 ' + cellPx + 'px）');
      log('    帧间隔 中位 ' + med.toFixed(2) + 'ms  →  约 ' + fps.toFixed(1) + ' fps');
      log('    p95 ' + p95.toFixed(2) + 'ms   最大 ' + max.toFixed(2) + 'ms   （掉帧阈值：p95 > 25ms）');
      log('    动画推进：' + res.adv.toFixed(0) + 'ms / 实际 ' + res.dt.toFixed(0) + 'ms  = ' +
        (res.dt > 0 ? (res.adv / res.dt * 100).toFixed(1) : '-') + '%（100% = 动画完全未被打折）');
      const ok = med < 20 && p95 < 28 && res.adv / res.dt > 0.9;
      log('    判定：' + (ok ? '流畅 ✓' : '存在卡顿 ✗'));
    }

    log('');
    log('  JS 报错：' + (errs.length ? errs.slice(0, 3).join(' | ') : '无'));
    log('=== 完成 ===');
  } catch (e) {
    log('EXCEPTION: ' + (e && e.stack || e));
  } finally {
    if (browser) try { await browser.close(); } catch (e) {}
  }
})();
