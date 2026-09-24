// color-match.html（主页「彩色连线」）帧率依赖审计
// 做法：生成"原文件 + 探针"的临时副本，不污染真文件；测 shapeTime 每秒推进量
// 用法：node _cm_audit.js <输入html> <cpu降速倍数> <标签>
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const THROTTLE = Number(process.argv[3] || 1);
const LABEL = process.argv[4] || 'x';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TMP = 'D:/专注力项目/_cm_probe_' + LABEL + '.html';
const OUTPATH = 'D:/专注力项目/_cm_audit_' + LABEL + '_thr' + THROTTLE + '_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = [];
const log = s => { out.push(s); try { fs.writeFileSync(OUTPATH, out.join('\n'), 'utf8'); } catch (e) {} };

// ---- 注入探针（只在副本里）----
const src = fs.readFileSync(SRC, 'utf8');
const ANCHOR = '      var shapeAnimId = null; // 动画ID';
if (src.indexOf(ANCHOR) < 0) { console.error('ANCHOR NOT FOUND'); process.exit(1); }
const HOOK = ANCHOR + `
      // [审计探针] 仅存在于临时副本
      window.__cm = {
        st: function(){ return shapeTime; },
        setSt: function(v){ shapeTime = v; },
        dots: function(){ return dotsData; },
        cur: function(){ return currentColor; },
        parts: function(){ return particles.length; },
        dims: function(){ return { w: canvasW, h: canvasH }; },
        lines: function(){ return currentLine.length; }
      };`;
fs.writeFileSync(TMP, src.replace(ANCHOR, HOOK), 'utf8');

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

    await page.goto('file:///' + TMP.replace(/\\/g, '/'), { waitUntil: 'load' });
    await sleep(1500);

    const client = await page.target().createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    log('=== color-match.html（彩色连线） CPU降速 = ' + THROTTLE + '× ===');
    log('  源文件：' + SRC);

    // 进入第 1 关
    await page.evaluate(() => document.querySelectorAll('.level-card')[0].click());
    await sleep(1200);
    const hasHook = await page.evaluate(() => !!window.__cm);
    log('  探针就绪=' + hasHook + '  粒子=' + (await page.evaluate(() => window.__cm.parts())));

    async function measure(tag, ms) {
      await page.evaluate(() => window.__fps(true));
      const t0 = Date.now();
      const a0 = await page.evaluate(() => window.__cm.st());
      await sleep(ms);
      const a1 = await page.evaluate(() => window.__cm.st());
      const wall = (Date.now() - t0) / 1000;
      const fps = await page.evaluate(() => window.__fps(true));
      const rate = (a1 - a0) / wall;
      log('  ' + tag + '：帧率=' + String(fps).padStart(3) + 'fps  shapeTime推进=' + rate.toFixed(1) +
        ' 单位/秒（60fps 理论值 960；形状周期4秒 → 实测 ' + (rate ? (4000 / rate).toFixed(2) : 'n/a') + ' 秒/形状）');
      return { fps, rate, wall };
    }

    log('  --- 连线之前 ---');
    const b = await measure('连线前', 3600);

    // 真实完成"第一次连线"：用真实鼠标拖拽连两个同色点
    const plan = await page.evaluate(() => {
      var d = window.__cm.dots(), color = window.__cm.cur(), dims = window.__cm.dims();
      var dotR = Math.min(dims.w, dims.h) * 0.025, m = dotR * 8;
      var arr = d[color];
      if (!arr || arr.length < 2) return null;
      function cl(v, mx) { return Math.max(m, Math.min(mx - m, v)); }
      return {
        color: color,
        a: { x: cl(arr[0].x, dims.w), y: cl(arr[0].y, dims.h) },
        b: { x: cl(arr[1].x, dims.w), y: cl(arr[1].y, dims.h) }
      };
    });
    if (!plan) { log('  !! 找不到可连的同色点，跳过连线步骤'); }
    else {
      const rect = await page.evaluate(() => { var r = document.getElementById('gameCanvas').getBoundingClientRect(); return { l: r.left, t: r.top }; });
      await page.mouse.move(rect.l + plan.a.x, rect.t + plan.a.y);
      await page.mouse.down();
      for (let k = 1; k <= 40; k++) {
        await page.mouse.move(rect.l + plan.a.x + (plan.b.x - plan.a.x) * k / 40,
                              rect.t + plan.a.y + (plan.b.y - plan.a.y) * k / 40);
      }
      await page.mouse.up();
      await sleep(600);
      const st = await page.evaluate(() => ({ parts: window.__cm.parts(), lines: window.__cm.lines() }));
      log('  --- 已完成第一次连线（颜色=' + plan.color + '），粒子数=' + st.parts + ' 当前笔迹点数=' + st.lines + ' ---');
    }

    const a = await measure('连线后', 3600);

    log('');
    log('=== 判定 ===');
    log('  连线前 shapeTime 速率 = ' + b.rate.toFixed(1) + ' /秒   连线后 = ' + a.rate.toFixed(1) + ' /秒   比值 ' + (b.rate ? (a.rate / b.rate).toFixed(3) : 'n/a'));
    log('  理论：shapeTime 每帧 +=16（硬编码假设 60fps）→ 帧率掉到 F，速率变成 960×F/60。');
    log('  60fps 应为 ~960/秒；20fps → ~320；6fps → ~96（形状周期从 4 秒变 40 秒，肉眼=停止）。');
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
