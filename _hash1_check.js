// 对照探针 uMode=7：直接输出 hash1(真实n + g) 三路，看它们是否有空间变化
// 与 uMode=2（voro 返回的 id）对照：若 uMode=7 有变化而 uMode=2 恒定，问题就在 voro 的 id 赋值
const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET = 'D:/专注力项目/kaleidoscope-glass.html';
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
    await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1200);
    log('glass: ' + JSON.stringify(await page.evaluate(() => window.__glass)));

    async function probe(mode, title, note) {
      await page.evaluate(m => window.__setMode(m), mode);
      await sleep(500);
      const st = await page.evaluate(() => window.__stats());
      const grid = await page.evaluate(() => window.__gridProbe(8));
      const uniq = k => new Set(grid.map(c => c[k])).size;
      log('');
      log('=== ' + title + ' ===');
      log('  ' + note);
      log('  全图均值 R/G/B = ' + st.avgR + ' / ' + st.avgG + ' / ' + st.avgB);
      log('  8x8 网格去重数 R=' + uniq(0) + ' G=' + uniq(1) + ' B=' + uniq(2) + '  (共64点)');
      log('  网格 R: ' + grid.map(c => c[0]).join(','));
      log('  网格 G: ' + grid.map(c => c[1]).join(','));
      log('  网格 B: ' + grid.map(c => c[2]).join(','));
      return { st: st, uniq: [uniq(0), uniq(1), uniq(2)] };
    }

    const s7 = await probe(7, 'uMode=7：hash1(真实n+g) 三路',
      'R=hash1(n+(-1,-1)) G=hash1(n+(0,0)) B=hash1(n+(1,-1))');
    const s2 = await probe(2, 'uMode=2：voro 返回的 id',
      'R=fract(id) G=fract(id*7.31) B=fract(id*13.7)');

    log('');
    log('=== 判定 ===');
    const hash1Varies = s7.uniq[0] > 2 && s7.uniq[1] > 2 && s7.uniq[2] > 2;
    const idTiny = s2.st.avgR < 1;
    log('  hash1(真实n+g) 是否有空间变化: ' + (hash1Varies ? '是（R/G/B 去重数 ' + s7.uniq.join('/') + '）' : '否'));
    log('  voro 的 id 是否恒为极小值: ' + (idTiny ? '是（fract(id) 全图均值 ' + s2.st.avgR + '）' : '否'));
    if (hash1Varies && idTiny) {
      log('  >>> 结论：hash1 本身正常且随 n 变化，但 voro 返回的 id 恒为极小值');
      log('      => 问题定位在 voro() 内部 id 的赋值链路，而非 hash 函数');
    } else if (!hash1Varies) {
      log('  >>> 结论：hash1 在真实 n 上就无变化，是 hash 本身的问题');
    }
    log('报错: ' + (errs.length ? errs.join(' | ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_hash1_out.txt', out.join('\n'), 'utf8');
  }
})();
