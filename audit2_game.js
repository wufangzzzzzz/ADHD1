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

  W('=== A. 测评模式倒计时 ===');
  const t = await page.evaluate(async () => {
    document.querySelector('#grpMode .seg-btn[data-mode="test"]').click();
    const q = document.getElementById('qTimer');
    const t0 = q ? q.textContent : 'NO_TIMER';
    await new Promise(r => setTimeout(r, 1600));
    const t1 = q ? q.textContent : 'NO_TIMER';
    return { t0, t1 };
  });
  W('  倒计时: ' + t.t0 + ' → ' + t.t1 + (t.t0 !== t.t1 ? '（在走 ✓）' : '（未动 ✗）'));

  W('\n=== B. 碰干扰报错逻辑 ===');
  const hit = await page.evaluate(async () => {
    document.querySelector('#grpMode .seg-btn[data-mode="train"]').click();
    document.querySelector('#grpSpiral .seg-btn[data-shape="2"]').click();
    const C = window.__csc;
    const tgt = C.getPts().filter(p=>p.isTarget).sort((a,b)=>b.arc-a.arc);
    const obs = C.getPts().filter(p=>!p.isTarget);
    const cv = document.getElementById('cv');
    const rect = cv.getBoundingClientRect();
    const xy = p => ({ clientX: rect.left + p.x*(rect.width/600), clientY: rect.top + p.y*(rect.height/600) });
    const conn = () => C.getTarget().seq.filter(p=>p.connected).length;
    const seq0 = conn();
    // 从第一个目标球画到最近的一个干扰球
    let nearObs = obs[0], bestD = 1e9;
    for (const o of obs) { const d = Math.hypot(o.x-tgt[0].x, o.y-tgt[0].y); if (d<bestD){bestD=d;nearObs=o;} }
    const a = xy(tgt[0]);
    cv.dispatchEvent(new MouseEvent('mousedown', { clientX:a.clientX, clientY:a.clientY, bubbles:true }));
    const b = xy(nearObs);
    cv.dispatchEvent(new MouseEvent('mousemove', { clientX:b.clientX, clientY:b.clientY, bubbles:true }));
    await new Promise(r => setTimeout(r, 50));
    cv.dispatchEvent(new MouseEvent('mouseup', { clientX:b.clientX, clientY:b.clientY, bubbles:true }));
    await new Promise(r => setTimeout(r, 300));
    const seq1 = conn();
    // 重连正确球确认还能继续
    const a2 = xy(tgt[0]);
    cv.dispatchEvent(new MouseEvent('mousedown', { clientX:a2.clientX, clientY:a2.clientY, bubbles:true }));
    const b2 = xy(tgt[1] || tgt[0]);
    cv.dispatchEvent(new MouseEvent('mousemove', { clientX:b2.clientX, clientY:b2.clientY, bubbles:true }));
    await new Promise(r => setTimeout(r, 50));
    cv.dispatchEvent(new MouseEvent('mouseup', { clientX:b2.clientX, clientY:b2.clientY, bubbles:true }));
    await new Promise(r => setTimeout(r, 200));
    const seq2 = conn();
    return { seq0, seq1, seq2 };
  });
  W('  碰干扰前已连: ' + hit.seq0 + '  碰干扰后: ' + hit.seq1 + (hit.seq1 <= hit.seq0 ? '（作废✓ 未推进）' : '（推进了✗）') + '  重连正确球后: ' + hit.seq2 + (hit.seq2 > hit.seq1 ? '（可继续✓）' : '（卡住✗）'));

  W('\n=== C. 完整通关（重新生成后一笔连完）===');
  const full = await page.evaluate(async () => {
    document.querySelector('#btnRestart').click();
    const C = window.__csc;
    const tgt = C.getPts().filter(p=>p.isTarget).sort((a,b)=>b.arc-a.arc);
    const cv = document.getElementById('cv');
    const rect = cv.getBoundingClientRect();
    const xy = p => ({ clientX: rect.left + p.x*(rect.width/600), clientY: rect.top + p.y*(rect.height/600) });
    const a = xy(tgt[0]);
    cv.dispatchEvent(new MouseEvent('mousedown', { clientX:a.clientX, clientY:a.clientY, bubbles:true }));
    for (let i = 1; i < tgt.length; i++) {
      const p = xy(tgt[i]);
      cv.dispatchEvent(new MouseEvent('mousemove', { clientX:p.clientX, clientY:p.clientY, bubbles:true }));
      await new Promise(r => setTimeout(r, 6));
    }
    cv.dispatchEvent(new MouseEvent('mouseup', { clientX:a.clientX, clientY:a.clientY, bubbles:true }));
    await new Promise(r => setTimeout(r, 300));
    const len = C.getTarget().seq.length;
    return { total: tgt.length, done: len };
  });
  W('  目标' + full.total + ' 连到' + full.done + (full.done >= full.total ? ' 通关✓' : ' 未通✗'));

  W('\nERRORS(' + errs.length + '):');
  errs.forEach(e => W('  ' + e));
  fs.writeFileSync('C:\\Users\\46924\\AppData\\Local\\Temp\\csc_audit2.txt', out.join('\n'));
  console.log(out.join('\n'));
  await browser.close();
})();
