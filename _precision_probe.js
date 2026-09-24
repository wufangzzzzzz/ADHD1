// 精度探针：实测这台设备的 GPU 在片元着色器里到底用的是什么精度
// 读数含义：
//   R = 255  -> GL_FRAGMENT_PRECISION_HIGH 已定义
//   G = fract(12345.678)   fp32 期望 ~173 ; fp16(ulp=8) 期望 0
//   B = fract(123.45678)   fp32 期望 ~116 ; fp16(ulp=0.0625) 期望 112 或 128
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

    await page.evaluate(() => window.__setMode(4));
    await sleep(500);
    const px = await page.evaluate(() => window.__px(window.__glass.size / 2, window.__glass.size / 2));
    const st = await page.evaluate(() => window.__stats());

    log('');
    log('=== 精度探针实测（uMode=4）===');
    log('  中心像素 = ' + JSON.stringify(px) + '   (R=highp标志, G=fract(12345.678), B=fract(123.45678))');
    log('  通道均值 R/G/B = ' + st.avgR + ' / ' + st.avgG + ' / ' + st.avgB);
    log('  G 期望值: fp32≈173  fp16≈0   -> 实测 ' + st.avgG + '  => ' + (st.avgG > 120 ? 'fp32(高精度)' : 'fp16(低精度，小数位已被抹平)'));
    log('  B 期望值: fp32≈116  fp16≈112/128 -> 实测 ' + st.avgB);
    log('  GL_FRAGMENT_PRECISION_HIGH 宏是否定义: ' + (px[0] > 128 ? '已定义(R=' + px[0] + ')' : '未定义(R=' + px[0] + ')'));

    log('');
    log('=== 结论 ===');
    if (st.avgG > 120) {
      log('  运行时精度是 fp32，hash 失败与精度无关，应从其它方面查因');
    } else {
      log('  运行时精度是 fp16：任何形如 fract(大数乘积) 的哈希都会失效');
      log('  -> 修复方向：改为「噪声贴图」提供随机源，彻底绕开精度限制');
    }
    log('报错: ' + (errs.length ? errs.join(' | ') : '0 条'));
  } catch (e) {
    log('FATAL ' + e.message);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync('D:/专注力项目/_precision_out.txt', out.join('\n'), 'utf8');
  }
})();
