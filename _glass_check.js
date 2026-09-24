const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const TARGET = 'D:/专注力项目/kaleidoscope-glass.html';
const FILE = 'file:///' + encodeURI(path.resolve(TARGET).replace(/\\/g, '/'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const out = [];
const log = s => { out.push(s); console.log(s); };

function lum(c) { return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114; }
function dist(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--disable-gpu-sandbox'
      ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

    await page.goto(FILE, { waitUntil: 'load' });
    await sleep(1500);

    const title = await page.title();
    log('页面标题: ' + title);

    const g = await page.evaluate(() => window.__glass || null);
    log('WebGL 状态: ' + JSON.stringify(g));

    const stats = await page.evaluate(() => (window.__stats ? window.__stats() : null));
    log('全屏像素统计: ' + JSON.stringify(stats));

    const ringMain = await page.evaluate(() => window.__sampleRing(0.32, 64));
    const ringMid = await page.evaluate(() => window.__sampleRing(0.45, 64));
    const ringCenter = await page.evaluate(() => window.__sampleRing(0.06, 16));
    const ringOut = await page.evaluate(() => window.__sampleRing(0.62, 16));

    await sleep(600);
    const ringMain2 = await page.evaluate(() => window.__sampleRing(0.32, 64));

    const lumOut = avg(ringOut.map(lum));
    log('');
    log('半径 0.62（镜筒视场外）平均亮度: ' + lumOut.toFixed(1) + '  -> 应接近 0（黑）');
    log('半径 0.06（花心）平均亮度: ' + avg(ringCenter.map(lum)).toFixed(1) + '  -> 应大于 4（有内容）');
    log('半径 0.32 平均亮度: ' + avg(ringMain.map(lum)).toFixed(1));
    log('半径 0.45 平均亮度: ' + avg(ringMid.map(lum)).toFixed(1));

    const segEight = 16;
    const dSame = [];
    const dCtrl = [];
    for (let i = 0; i < 64; i++) {
      dSame.push(dist(ringMain[i], ringMain[(i + segEight) % 64]));
      dCtrl.push(dist(ringMain[i], ringMain[(i + 4) % 64]));
    }
    const dSameMid = [];
    for (let i = 0; i < 64; i++) dSameMid.push(dist(ringMid[i], ringMid[(i + segEight) % 64]));

    const same = avg(dSame), ctrl = avg(dCtrl), sameMid = avg(dSameMid);
    log('');
    log('镜像对称检验（镜面数 8，段宽 45 度）');
    log('  相距 90 度（隔两段，等价位置）色差均值: ' + same.toFixed(1));
    log('  相距 22.5 度（段内不同位置）色差均值: ' + ctrl.toFixed(1));
    log('  半径 0.45 上相距 90 度色差均值: ' + sameMid.toFixed(1));
    log('  对称性判定: ' + (same < ctrl * 0.6 ? 'PASS（等价位置高度一致，万花筒镜像结构成立）' : 'FAIL（未呈现旋转对称）'));

    const dz = [];
    for (let i = 0; i < 64; i++) dz.push(dist(ringMain[i], ringMain2[i]));
    log('');
    log('动画检验（间隔 600ms 同一位置色差均值）: ' + avg(dz).toFixed(2) + ' -> ' + (avg(dz) > 0.5 ? 'PASS（画面在变幻）' : 'FAIL（静止）'));

    log('');
    log('控制台/页面报错: ' + (errs.length ? errs.join(' | ') : '0 条'));

    log('');
    log('色彩与明暗质感指标');
    log('  平均饱和度: ' + stats.avgSat + '  -> 目标 > 0.30（彩色玻璃而非灰白）');
    log('  亮度标准差: ' + stats.lumStd + '  -> 目标 > 45（明暗对比强）');
    log('  暗/中/亮占比: ' + stats.darkPct + '% / ' + stats.midPct + '% / ' + stats.brightPct + '%');
    log('  彩色像素占比(饱和度>0.25): ' + stats.vividPct + '%');

    const verdict = [];
    verdict.push(g && g.ok ? 'WebGL 初始化 PASS' : 'WebGL 初始化 FAIL');
    verdict.push(g && g.err ? '着色器报错: ' + g.err : '着色器编译/链接 PASS');
    verdict.push(stats && stats.avgLum > 12 && stats.avgLum < 190 ? '画面亮度正常 PASS（' + stats.avgLum + '）' : '亮度异常 FAIL');
    verdict.push(stats && stats.distinctColors > 60 ? '颜色层次 PASS（' + stats.distinctColors + ' 种）' : '颜色层次 FAIL');
    verdict.push(stats && stats.avgSat > 0.30 ? '玻璃彩度 PASS（' + stats.avgSat + '）' : '玻璃彩度不足 FAIL（' + (stats && stats.avgSat) + '）');
    verdict.push(stats && stats.lumStd > 45 ? '明暗对比 PASS（' + stats.lumStd + '）' : '明暗对比不足 FAIL（' + (stats && stats.lumStd) + '）');
    verdict.push(stats && stats.darkPct > 12 ? '暗底(玻璃缝) PASS（' + stats.darkPct + '%）' : '暗底不足 FAIL（' + (stats && stats.darkPct) + '%）');
    verdict.push(stats && stats.brightPct < 45 ? '未过曝 PASS（亮部 ' + stats.brightPct + '%）' : '过曝 FAIL（亮部 ' + (stats && stats.brightPct) + '%）');
    verdict.push(stats && stats.vividPct > 50 ? '彩色玻璃占比 PASS（' + stats.vividPct + '%）' : '彩色占比低 FAIL（' + (stats && stats.vividPct) + '%）');
    verdict.push(lumOut < 12 ? '镜筒视场边界 PASS' : '视场外不为黑 FAIL（' + lumOut.toFixed(1) + '）');
    verdict.push(avg(ringCenter.map(lum)) > 4 ? '花心内容 PASS' : '花心为空 FAIL');
    verdict.push(same < ctrl * 0.6 ? '万花筒镜像对称 PASS' : '镜像对称 FAIL');
    verdict.push(avg(dz) > 0.5 ? '变幻动画 PASS' : '动画 FAIL');
    verdict.push(errs.length === 0 ? '零报错 PASS' : '有报错 FAIL');

    log('');
    log('===== 结论 =====');
    verdict.forEach(v => log('  ' + v));

  } catch (e) {
    log('FATAL: ' + e.message);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_glass_check_out.txt', out.join('\n'), 'utf8');
  }
})();
