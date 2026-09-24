// 玻璃效果诊断 v2 —— 修正了 v1 的两处工具缺陷：
//   v1 缺陷1: __hueHist 实际只统计红通道，却命名为"色相"，导致误判"100% 红"
//   v1 缺陷2: 探针输出灰度 vec3(dh)，灰度像素的色相无意义（恒为 0）
// v2 直接读通道值 + 读真实色相，并单独测 hash 函数本身。
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

    // ---------- 测试 1：hash 函数本身 ----------
    log('');
    log('=== 测试1：hash1 直接取值（uMode=1，输出 R=hash1(-4,3) G=hash1(0,0) B=hash1(2,-1)）===');
    await page.evaluate(() => window.__setMode(1));
    await sleep(500);
    const px1 = await page.evaluate(() => window.__px(window.__glass.size / 2, window.__glass.size / 2));
    const st1 = await page.evaluate(() => window.__stats());
    log('  中心像素 RGBA = ' + JSON.stringify(px1));
    log('  全图通道均值 R/G/B = ' + st1.avgR + ' / ' + st1.avgG + ' / ' + st1.avgB);
    const hashVals = [px1[0], px1[1], px1[2]];
    const allSame = hashVals[0] === hashVals[1] && hashVals[1] === hashVals[2];
    const allZero = hashVals[0] === 0 && hashVals[1] === 0 && hashVals[2] === 0;
    log('  三个不同输入的 hash 是否完全相同: ' + (allSame ? '是（hash 失效）' : '否（hash 正常，值有区分）'));
    log('  三个 hash 是否全为 0: ' + (allZero ? '是（hash 恒返回 0）' : '否'));

    // ---------- 测试 2：Voronoi 单元种子 id 是否有空间变化 ----------
    log('');
    log('=== 测试2：id 的空间分布（uMode=2，R=fract(id) G=fract(id*7.31) B=fract(id*13.7)）===');
    await page.evaluate(() => window.__setMode(2));
    await sleep(500);
    const grid = await page.evaluate(() => window.__gridProbe(6));
    let ur = {}, ug = {}, ub = {};
    grid.forEach(c => { ur[c[0]] = 1; ug[c[1]] = 1; ub[c[2]] = 1; });
    log('  6x6 采样点 fract(id)  取值: ' + grid.map(c => c[0]).join(','));
    log('  去重后 fract(id) 不同取值数 = ' + Object.keys(ur).length + ' / 36');
    log('  去重后 fract(id*7.31) 不同取值数 = ' + Object.keys(ug).length + ' / 36');
    log('  去重后 fract(id*13.7) 不同取值数 = ' + Object.keys(ub).length + ' / 36');
    const idConst = Object.keys(ur).length <= 2;
    log('  id 是否近似常数: ' + (idConst ? '是（id 无空间变化）' : '否（id 有空间变化）'));

    // ---------- 测试 3：格子坐标 n 是否有空间变化 ----------
    log('');
    log('=== 测试3：格子坐标 n=floor(uv) 是否有空间变化（uMode=3，R=n.x*0.12+0.5 / G=n.y*0.12+0.5）===');
    await page.evaluate(() => window.__setMode(3));
    await sleep(500);
    const grid3 = await page.evaluate(() => window.__gridProbe(6));
    let nxs = {}, nys = {};
    grid3.forEach(c => { nxs[c[0]] = 1; nys[c[1]] = 1; });
    log('  R(n.x 映射) 取值: ' + grid3.map(c => c[0]).join(','));
    log('  G(n.y 映射) 取值: ' + grid3.map(c => c[1]).join(','));
    log('  去重后 n.x 不同取值数 = ' + Object.keys(nxs).length + ' / 36');
    log('  去重后 n.y 不同取值数 = ' + Object.keys(nys).length + ' / 36');

    // ---------- 测试 4：正常画面（uMode=0）的真实色相分布 ----------
    log('');
    log('=== 测试4：正常画面真实色相分布（uMode=0，仅统计饱和度>=0.12 的像素）===');
    await page.evaluate(() => window.__setMode(0));
    await sleep(500);
    const h = await page.evaluate(() => window.__hueHist(12));
    log('  通道均值实测 R/G/B = ' + h.avgR.toFixed(3) + ' / ' + h.avgG.toFixed(3) + ' / ' + h.avgB.toFixed(3));
    log('  低饱和(灰/白/黑)像素占比 = ' + (h.lowSat / h.total * 100).toFixed(1) + '%');
    const colored = h.total - h.lowSat;
    const b0 = Math.max(0, h.hist[0] - h.lowSat);
    for (let i = 0; i < h.bins; i++) {
      const cnt = i === 0 ? b0 : h.hist[i];
      const pct = colored > 0 ? cnt / colored * 100 : 0;
      log('  桶' + String(i).padStart(2, '0') + ' hue=' + (i / h.bins).toFixed(2) + '  ' + pct.toFixed(1).padStart(5) + '%  ' + '#'.repeat(Math.round(pct / 2)));
    }
    const redZone = colored > 0 ? (b0 + h.hist[1] + h.hist[11]) / colored * 100 : 0;
    log('  红区(桶0,1,11)占彩色像素 = ' + redZone.toFixed(1) + '%   （色相均匀时应约 25%）');
    log('  注：桶00 已扣除低饱和像素（' + h.lowSat + ' 个），否则会把灰白误计入红区');

    const st = await page.evaluate(() => window.__stats());
    log('');
    log('=== 画面整体统计 ===');
    log('  ' + JSON.stringify(st));

    // ---------- 判定 ----------
    log('');
    log('=== 判定 ===');
    if (allZero || allSame) {
      log('  hash 函数本身失效 -> 需继续换哈希实现或改精度限定');
    } else if (idConst) {
      log('  hash 正常，但 id 无空间变化 -> 问题在 voro() 的选取逻辑（每个格子都选中同一个 g 或 n 不变化）');
    } else if (redZone > 55) {
      log('  id 与 hash 都正常，但色相仍集中红区 -> 问题在 hue 映射公式或 tint 乘算');
    } else {
      log('  id / hash / 色相 均已正常');
    }
    log('报错: ' + (errs.length ? errs.join(' | ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_glass_diag2_out.txt', out.join('\n'), 'utf8');
  }
})();
