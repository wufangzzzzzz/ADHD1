const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file://' + path.resolve('D:/专注力项目/color-spiral-connect.html');
(async () => {
  const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 800, height: 800 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(FILE, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const r = await p.evaluate(() => {
    const shapes = [...document.querySelectorAll('#grpSpiral .seg-btn')].map(b => b.textContent.trim());
    document.querySelector('#grpSpiral .seg-btn[data-shape="2"]').click();
    const C = window.__csc;
    function obsColors(){ const pts = C.getPts().filter(x=>!x.isTarget); return [...new Set(pts.map(x=>x.color))]; }
    const colorful = obsColors();
    const sl = document.getElementById('obsSlider');
    const sliderVal = sl.value;
    document.getElementById('obsCtlBtn').click();          // 切统一色
    const uniPts = C.getPts().filter(x=>!x.isTarget);
    const uniform = [...new Set(uniPts.map(x=>x.color))];
    sl.value = 60; sl.dispatchEvent(new Event('input', {bubbles:true}));
    const n60 = C.getPts().filter(x=>!x.isTarget).length;
    const pick = document.getElementById('obsColorPick');
    pick.value = '#3498db'; pick.dispatchEvent(new Event('input', {bubbles:true}));
    const bluePts = C.getPts().filter(x=>!x.isTarget);
    const blue = [...new Set(bluePts.map(x=>x.color))];
    return { shapes, sliderVal, colorful, uniform, uniCount: uniPts.length, n60, blue, blueCount: bluePts.length, ctlText: document.getElementById('obsCtlBtn').textContent };
  });
  console.log('形状按钮:', r.shapes.join('/'), '(应只有 圆/方)');
  console.log('干扰数量滑块默认:', r.sliderVal, '(应=150最大)');
  console.log('默认彩色 干扰色数:', r.colorful.length, '→', r.colorful.slice(0,4));
  console.log('切统一色后:', r.uniform.join(','), ' 干扰数:', r.uniCount, ' 按钮:', r.ctlText);
  console.log('数量滑块=60 → 干扰数:', r.n60);
  console.log('选蓝色后:', r.blue.join(','), ' 干扰数:', r.blueCount, ' 按钮:', r.ctlText);
  console.log('ERRORS:', errs.length ? errs.join('|') : 'none');
  await b.close();
})();
