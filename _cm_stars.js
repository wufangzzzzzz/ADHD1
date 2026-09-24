// 数值验证「星星」问题 v2：统计 drawStar 真实调用 + 每帧各点形状分布
// 场景A 默认开局 / B 打印预览 / C 默认游玩 / D 手动开启动态形状后重进关卡的开局 / E 开启后游玩
// 用法：node _cm_stars.js <源html> <标签>
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const fs = require('fs');

const SRC = process.argv[2];
const LABEL = process.argv[3] || 'x';
const TMP = 'D:/专注力项目/_cm_starprobe_' + LABEL + '.html';
const OUT = 'D:/专注力项目/_cm_stars_' + LABEL + '_out.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = []; const log = s => { out.push(s); try { fs.writeFileSync(OUT, out.join('\n'), 'utf8'); } catch (e) {} };

let src = fs.readFileSync(SRC, 'utf8');
function inject(anchor, add, regex) {
  if (regex) {
    const re = new RegExp(regex);
    if (!re.test(src)) { console.error('ANCHOR MISS(regex): ' + regex); process.exit(1); }
    src = src.replace(re, m => m + add);
  } else {
    if (src.indexOf(anchor) < 0) { console.error('ANCHOR MISS: ' + anchor); process.exit(1); }
    src = src.replace(anchor, anchor + add);
  }
}
inject('      var shapeAnimId = null; // 动画ID', `
      window.__cm = {
        dots: function(){ return dotsData; },
        snap: function(){
          return {
            star: window.__starCalls || 0,
            shapes: (window.__shapes || []).slice(),
            st: shapeTime,
            ps: (typeof printStatic !== 'undefined') ? printStatic : null,
            sa: (typeof shapeActive !== 'undefined') ? shapeActive : null
          };
        }
      };`);
inject(null, '\n        window.__starCalls = (window.__starCalls || 0) + 1;', 'function drawStar\\(ctx, cx, cy, r, color, innerRatio\\) \\{');
inject(null, '\n        if (window.__shapes) window.__shapes.push([shapeInfo.from, shapeInfo.to]);', 'function drawMorphingShape\\(ctx, cx, cy, r, color, shapeInfo\\) \\{');
inject(null, '\n        window.__shapes = [];', 'function draw\\(\\) \\{');
fs.writeFileSync(TMP, src, 'utf8');

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

    await page.goto('file:///' + TMP.replace(/\\/g, '/'), { waitUntil: 'load' });
    await sleep(1500);

    const hasShapeBtn = await page.evaluate(() => !!document.getElementById('btnShape'));
    log('=== 星星（drawStar）量化验证 — ' + LABEL + ' ===');
    log('  源文件：' + SRC);
    log('  页面是否有「动态形状」开关：' + hasShapeBtn);

    async function sample(tag, ms) {
      const a = await page.evaluate(() => window.__cm.snap());
      await sleep(ms);
      const b = await page.evaluate(() => window.__cm.snap());
      const st = b.shapes.filter(s => s[0] === 2 && s[1] === 2).length;
      const si = b.shapes.filter(s => s[0] === 2 || s[1] === 2).length;
      const pct = b.shapes.length ? Math.round(st / b.shapes.length * 100) : 0;
      log('  ' + tag.padEnd(26) +
        ' 帧内点数=' + String(b.shapes.length).padStart(3) +
        ' 稳定星形=' + String(st).padStart(3) + '(' + String(pct).padStart(2) + '%)' +
        ' 涉及星形=' + String(si).padStart(3) +
        ' 窗口内drawStar=' + String(b.star - a.star).padStart(5) +
        ' printStatic=' + b.ps + ' 动态形状=' + b.sa);
      return { star: b.star - a.star, st, si, dots: b.shapes.length };
    }

    async function enterLastLevel() {
      await page.evaluate(() => { var c = document.querySelectorAll('.level-card'); c[c.length - 1].click(); });
    }
    async function goHome() {
      await page.evaluate(() => document.getElementById('backBtn').click());
      await sleep(500);
    }

    await enterLastLevel();
    log('');
    log('--- 场景A：进关卡的开局画面（默认状态）---');
    const A1 = await sample('开局 0~150ms', 150);

    log('');
    log('--- 场景B：进入打印预览（派发 beforeprint）---');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await sleep(120);
    const B = await sample('打印模式 0.5s', 500);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await sleep(200);

    log('');
    log('--- 场景C：默认状态游玩中（0.5s）---');
    const C = await sample('游玩中 0.5s', 500);

    let D = { star: 0, st: 0 }, E = { star: 0, st: 0 };
    if (hasShapeBtn) {
      log('');
      log('--- 场景D：点开「动态形状」→ 回选关 → 重新进关卡，看开局 ---');
      await page.evaluate(() => document.getElementById('btnShape').click());
      log('  已点击「动态形状」，当前 textContent=' + (await page.evaluate(() => document.getElementById('btnShape').textContent)));
      await goHome();
      await enterLastLevel();
      D = await sample('开启后 开局 0~200ms', 200);
      log('');
      log('--- 场景E：开启后游玩中（等 6 秒再看）---');
      await sleep(6000);
      E = await sample('开启后 游玩中 0.5s', 500);
    }

    const okA = A1.st === 0 && A1.star === 0;
    const okB = B.star === 0;
    const okC = C.st === 0 && C.star === 0;
    log('');
    log('=== 判定 ===');
    log('  A 默认开局：稳定星形 ' + A1.st + ' 个，drawStar ' + A1.star + ' 次  ' + (okA ? '通过 ✓（开局全是圆点）' : '★ 开局仍有星星'));
    log('  B 打印模式：drawStar ' + B.star + ' 次  ' + (okB ? '通过 ✓（打印只有圆点）' : '★ 打印仍在画星星'));
    log('  C 默认游玩：稳定星形 ' + C.st + ' 个，drawStar ' + C.star + ' 次  ' + (okC ? '通过 ✓（默认不变形，不会出现星星）' : '★ 默认仍在变形'));
    if (hasShapeBtn) {
      log('  D 开启后开局：稳定星形 ' + D.st + ' 个，drawStar ' + D.star + ' 次  ' + (D.st === 0 ? '通过 ✓（即使是开启状态，开局也不出星星）' : '★ 开启后开局仍有星星'));
      log('  E 开启后游玩：稳定星形 ' + E.st + '/' + E.dots + ' 个，drawStar ' + E.star + ' 次  ' + (E.star > 0 ? '（变形动画正常工作，功能未被删除）' : '★ 开启后不工作'));
    }
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
