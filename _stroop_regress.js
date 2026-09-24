// stroop.html 回归：确认「左右大小互换」动画仍正常（swapT 在变）+ 0 报错
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');
const OUT = 'D:/专注力项目/_stroop_regress_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = []; const log = s => { out.push(s); try { fs.writeFileSync(OUT, out.join('\n'), 'utf8'); } catch (e) {} };

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: false, defaultViewport: null,
      args: ['--no-sandbox', '--new-window', '--window-size=1200,980']
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
    });

    await page.goto('file:///D:/%E4%B8%93%E6%B3%A8%E5%8A%9B%E9%A1%B9%E7%9B%AE/stroop.html', { waitUntil: 'load' });
    await sleep(1500);
    log('=== stroop.html 回归（左右大小互换动画）===');

    const probe = await page.evaluate(() => {
      var r = { hasState: typeof state !== 'undefined', hasStart: typeof startSwapAnim === 'function', mode: null, rule: null };
      if (r.hasState) { r.mode = state.mode; r.rule = state.rule; }
      return r;
    });
    log('  state 可访问=' + probe.hasState + '  startSwapAnim 可访问=' + probe.hasStart + '  当前 mode=' + probe.mode + ' rule=' + probe.rule);

    await page.evaluate(() => {
      state.mode = 'size'; state.rule = 1; state.printStatic = false;
      startSwapAnim();
    });
    log('  已切到 size 模式 + 规则1，启动互换动画');

    const samples = [];
    for (let i = 0; i < 8; i++) {
      await sleep(220);
      const s = await page.evaluate(() => ({
        swapT: Math.round(state.swapT * 1000) / 1000,
        swapRAF: swapRAF,
        frames: window.__f.length,
        err: typeof swapDrawErr !== 'undefined' ? swapDrawErr : 'n/a'
      }));
      samples.push(s.swapT);
      log('   t=' + String(i * 220).padStart(4) + 'ms  swapT=' + String(s.swapT).padStart(6) + '  swapRAF=' + String(s.swapRAF).padStart(6) + '  累计帧=' + String(s.frames).padStart(4) + '  drawErr=' + s.err);
    }
    const uniq = new Set(samples).size;
    const rst = await page.evaluate(() => ({ err: typeof swapDrawErr !== 'undefined' ? swapDrawErr : 'n/a', raf: swapRAF }));
    log('');
    log('=== 判定 ===');
    log('  swapT 出现 ' + uniq + ' 个不同值（>3 表示动画在正常推进）  最终 swapRAF=' + rst.raf + '  swapDrawErr=' + rst.err);
    log('  ' + (uniq > 3 ? '通过：互换动画正常运行' : '异常：swapT 几乎不变，动画可能没跑'));
    log('');
    log('=== 报错 ===');
    log('  ' + (errs.length ? errs.join('\n  ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message + '\n' + (e.stack || ''));
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(OUT, out.join('\n'), 'utf8');
  }
})();
