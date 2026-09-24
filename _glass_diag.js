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

    const g = await page.evaluate(() => window.__glass || null);
    log('glass: ' + JSON.stringify(g));

    const s0 = await page.evaluate(() => window.__stats());
    log('通道均值 R/G/B = ' + s0.avgR + ' / ' + s0.avgG + ' / ' + s0.avgB + '   平均饱和度 ' + s0.avgSat);
    log('  R/G = ' + (s0.avgR / Math.max(1, s0.avgG)).toFixed(2) + ' 倍,  R/B = ' + (s0.avgR / Math.max(1, s0.avgB)).toFixed(2) + ' 倍');

    log('');
    log('=== 探针 A：着色器实际用到的色相 hue（uMode=1） ===');
    await page.evaluate(() => window.__setMode(1));
    await sleep(400);
    const h = await page.evaluate(() => window.__hueHist(16));
    const total = h.total;
    for (let i = 0; i < h.bins; i++) {
      const pct = h.hist[i] / total * 100;
      log('  桶' + String(i).padStart(2, '0') + ' hue=' + (i / h.bins).toFixed(3) + '  ' + pct.toFixed(1).padStart(5) + '%  ' + '#'.repeat(Math.round(pct)));
    }
    const redZone = (h.hist[0] + h.hist[1] + h.hist[15]) / total * 100;

    log('');
    log('=== 探针 B：Voronoi 单元的随机种子 id 原始值（uMode=2） ===');
    await page.evaluate(() => window.__setMode(2));
    await sleep(400);
    const h2 = await page.evaluate(() => window.__hueHist(16));
    for (let i = 0; i < h2.bins; i++) {
      const pct = h2.hist[i] / h2.total * 100;
      log('  桶' + String(i).padStart(2, '0') + '  ' + pct.toFixed(1).padStart(5) + '%  ' + '#'.repeat(Math.round(pct)));
    }
    const idZero = h2.hist[0] / h2.total * 100;
    await page.evaluate(() => window.__setMode(0));

    log('');
    log('判定：');
    log('  色相落红区(桶0,1,15)占比 = ' + redZone.toFixed(1) + '%  （均匀时应约 18.8%）');
    log('  随机种子 id 落在最小桶的占比 = ' + idZero.toFixed(1) + '%');
    if (idZero > 90) {
      log('  -> id 恒为极小值：hash 函数在这台设备的 GPU 上失效（sin 大数输入精度崩掉）');
    } else if (redZone > 40) {
      log('  -> id 有分布，但色相映射后集中 -> 问题在 hue 映射公式');
    } else {
      log('  -> id 与色相都正常，偏红另有原因');
    }
    log('报错: ' + (errs.length ? errs.join(' | ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_glass_diag_out.txt', out.join('\n'), 'utf8');
  }
})();
