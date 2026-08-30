const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/color-spiral-connect.html';
const fs = require('fs');
const out = []; const W = s => out.push(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE ' + m.text()); });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await sleep(500);

  W('=== 1. 页面加载 ===');
  W('  __csc 存在: ' + await page.evaluate(() => !!window.__csc));
  const ge = await page.evaluate(() => { const g = window.__csc.getGeom(); return 'canvas ' + Math.round(g.maxR*2) + 'px, 中心(' + Math.round(g.cx) + ',' + Math.round(g.cy) + ')'; });
  W('  ' + ge);

  W('\n=== 2. 形状切换（圆/方）===');
  for (const s of [['0','圆'],['2','方']]) {
    const r = await page.evaluate((idx) => {
      document.querySelector('#grpSpiral .seg-btn[data-shape="'+idx+'"]').click();
      const C = window.__csc; const pts = C.getPts();
      return { t: pts.filter(p=>p.isTarget).length, o: pts.length - pts.filter(p=>p.isTarget).length };
    }, s[0]);
    W('  ' + s[1] + ': 目标' + r.t + ' 干扰' + r.o);
  }

  W('\n=== 3. 模式/数量/长度/音效按钮 ===');
  const clicks = [
    ['#grpMode .seg-btn[data-mode="test"]','测评'],
    ['#grpMode .seg-btn[data-mode="train"]','训练'],
    ['#grpNeed .seg-btn[data-need="10"]','数量10'],
    ['#grpNeed .seg-btn[data-need="20"]','数量20'],
    ['#grpLen .seg-btn[data-len="10"]','长度10'],
    ['#grpLen .seg-btn[data-len="5"]','长度5'],
    ['#grpSfx .seg-btn[data-sfx="0"]','音效关'],
    ['#grpSfx .seg-btn[data-sfx="1"]','音效开'],
    ['#grpSpiral .seg-btn[data-shape="0"]','切圆'],
  ];
  for (const [sel, name] of clicks) {
    const ok = await page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return 'NO_EL'; el.click(); return 'ok'; }, sel);
    await sleep(60);
    W('  ' + name + ': ' + ok);
  }

  W('\n=== 4. 滑块（旋转/目标球大小/干扰数量）===');
  const sliders = [
    ['#rotSlider', 90, '旋转90'],
    ['#rotSlider', 180, '旋转180'],
    ['#rotSlider', 0, '旋转0'],
    ['#ballSlider', 12, '目标球大小12'],
    ['#ballSlider', 8, '目标球大小8'],
    ['#obsSlider', 60, '干扰数量60'],
    ['#obsSlider', 150, '干扰数量150'],
  ];
  for (const [sel, val, name] of sliders) {
    const r = await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return 'NO_EL';
      el.value = val; el.dispatchEvent(new Event('input', {bubbles:true}));
      return 'ok';
    }, sel, val);
    await sleep(60);
    W('  ' + name + ': ' + r);
  }

  W('\n=== 5. 干扰球色（彩色/统一色/选色）===');
  const obsR = await page.evaluate(() => {
    const C = window.__csc;
    const obs = () => C.getPts().filter(x=>!x.isTarget);
    const cols = a => [...new Set(a.map(x=>x.color))];
    const colorful = cols(obs());
    document.querySelector('#grpObsColor .seg-btn[data-obs="uniform"]').click();
    const uni = cols(obs());
    const pick = document.getElementById('obsColorPick');
    pick.value = '#00bcd4'; pick.dispatchEvent(new Event('input', {bubbles:true}));
    const cyan = cols(obs());
    document.querySelector('#grpObsColor .seg-btn[data-obs="colorful"]').click();
    const back = cols(obs());
    return { colorful, uni, cyan, back };
  });
  W('  彩色色数: ' + obsR.colorful.length + '  统一色: ' + obsR.uni.join(',') + '  选青色: ' + obsR.cyan.join(',') + '  回彩色色数: ' + obsR.back.length);

  W('\n=== 6. 目标球色自定义 ===');
  const tgtR = await page.evaluate(() => {
    const C = window.__csc;
    const tgt = () => C.getPts().filter(x=>x.isTarget);
    const def = [...new Set(tgt().map(x=>x.color))];
    const pick = document.getElementById('tgtColorPick');
    pick.value = '#ff9800'; pick.dispatchEvent(new Event('input', {bubbles:true}));
    const cust = [...new Set(tgt().map(x=>x.color))];
    return { def, cust };
  });
  W('  默认: ' + tgtR.def.join(',') + '  选#ff9800后: ' + tgtR.cust.join(','));

  W('\n=== 7. 动态形状/重新开始按钮 ===');
  for (const [id, name] of [['#btnShape','动态形状'],['#btnRestart','重新开始']]) {
    const ok = await page.evaluate((id) => { const el = document.querySelector(id); if (!el) return 'NO_EL'; el.click(); return 'ok'; }, id);
    await sleep(120);
    W('  ' + name + ': ' + ok);
  }

  W('\n=== 8. 自动连线（方形，沿目标球序列画一笔）===');
  const line = await page.evaluate(async () => {
    document.querySelector('#grpSpiral .seg-btn[data-shape="2"]').click();
    const C = window.__csc;
    const tgt = C.getPts().filter(p=>p.isTarget).sort((a,b)=>b.arc-a.arc);
    if (tgt.length === 0) return { err: 'no targets' };
    const cv = document.getElementById('cv');
    const rect = cv.getBoundingClientRect();
    const toXY = p => ({ clientX: rect.left + p.x * (rect.width/600), clientY: rect.top + p.y * (rect.height/600) });
    // 沿序列逐段画：按下 → 经过每个目标球 → 松开
    const a0 = toXY(tgt[0]);
    cv.dispatchEvent(new MouseEvent('mousedown', { clientX:a0.clientX, clientY:a0.clientY, bubbles:true }));
    const ptsHit = [0];
    for (let i = 1; i < tgt.length; i++) {
      const p = toXY(tgt[i]);
      cv.dispatchEvent(new MouseEvent('mousemove', { clientX:p.clientX, clientY:p.clientY, bubbles:true }));
      await new Promise(r => setTimeout(r, 8));
      const cur = C.getTarget().seq.length; // 连到第几个
      if (i < cur) ptsHit.push(i);
    }
    cv.dispatchEvent(new MouseEvent('mouseup', { clientX:a0.clientX, clientY:a0.clientY, bubbles:true }));
    await new Promise(r => setTimeout(r, 200));
    const st = C.getTarget().seq;
    const curIdx = window.__csc ? C.getTarget().seq.length : 0;
    return { total: tgt.length, seqLen: st.length, hit: ptsHit.length, done: st.length >= tgt.length };
  });
  W('  目标球数: ' + line.total + '  序列长度: ' + line.seqLen + '  命中推进: ' + line.hit + '  完成: ' + line.done + (line.err ? '  错误: '+line.err : ''));

  W('\n=== 9. 打印按钮存在 ===');
  W('  btnPrint: ' + await page.evaluate(() => !!document.getElementById('btnPrint')));

  W('\nERRORS(' + errs.length + '):');
  errs.forEach(e => W('  ' + e));
  fs.writeFileSync('C:\\Users\\46924\\AppData\\Local\\Temp\\csc_audit.txt', out.join('\n'));
  console.log(out.join('\n'));
  await browser.close();
})();
