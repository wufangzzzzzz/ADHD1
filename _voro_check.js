// Voronoi 内部量探针：直接测 f1 / f2 / edge 与 hash2 是否有空间变化
// uMode=5 -> R=clamp(f1*2) G=clamp(f2*2) B=clamp(edge*6)
// uMode=6 -> R=hash2(n).x G=hash2(n+(1,2)).x B=hash2(n+(-3,1)).x
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
      log('  全图均值 R/G/B = ' + st.avgR + ' / ' + st.avgG + ' / ' + st.avgB + '   (0~255)');
      log('  8x8 网格 R 去重数 = ' + uniq(0) + '/64   G 去重数 = ' + uniq(1) + '/64   B 去重数 = ' + uniq(2) + '/64');
      log('  网格 R: ' + grid.map(c => c[0]).join(','));
      log('  网格 G: ' + grid.map(c => c[1]).join(','));
      log('  网格 B: ' + grid.map(c => c[2]).join(','));
      return st;
    }

    const s6 = await probe(6, '测试5：hash2 是否随输入变化（uMode=6）',
      'R=hash2(n).x  G=hash2(n+(1,2)).x  B=hash2(n+(-3,1)).x');
    log('  -> hash2 三路取值若互不相同且各自有空间变化，则 hash2 正常');

    const s5 = await probe(5, '测试6：Voronoi f1/f2/edge（uMode=5）',
      'R=clamp(f1*2)  G=clamp(f2*2)  B=clamp(edge*6)，edge=f2-f1');
    const edgeMean = s5.avgB / 255 / 6;
    log('  -> 推算 edge 全图均值 = ' + edgeMean.toFixed(4) + '   (clamp 影响下为下界)');
    log('  -> edge 均值若接近 0，说明 Voronoi 退化：9 个特征点几乎重合');

    const s2 = await probe(2, '测试7：id 原始值（uMode=2）',
      'R=fract(id)  G=fract(id*7.31)  B=fract(id*13.7)');
    log('  -> R 应随位置显著变化；若恒为 0 说明 id 无空间变化');

    log('');
    log('=== 判定 ===');
    if (s6.avgR < 3 || s6.avgG < 3 || s6.avgB < 3) {
      log('  hash2 某一路恒为极小值 -> hash2 输入或实现有问题');
    } else {
      log('  hash2 三路都有正常取值 -> hash2 正常');
    }
    if (edgeMean < 0.02) {
      log('  edge 接近 0 -> Voronoi 退化，棱边/色散项整幅满强度叠加 = 画面偏红的直接原因');
    } else {
      log('  edge 正常 -> 偏红另有原因');
    }
    log('报错: ' + (errs.length ? errs.join(' | ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_voro_out.txt', out.join('\n'), 'utf8');
  }
})();
