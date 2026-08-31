const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file://' + path.resolve('visual-match.html');

const VIEWPORTS = [['pc',1280,800],['ipad_p',768,1024],['ipad_l',1024,768],['android_p',800,1280]];
function noScroll(page){ return page.evaluate(()=>({w:document.documentElement.scrollWidth,iw:window.innerWidth,h:document.documentElement.scrollHeight,ih:window.innerHeight})); }

async function apply(page, changes) {
  await page.evaluate(()=>document.getElementById('set-btn').click());
  await new Promise(r=>setTimeout(r,120));
  for (const [key,val] of changes) {
    await page.evaluate((k,v)=>{
      const seg=document.querySelector(`.seg[data-key="${k}"]`);
      const btn=seg.querySelector(`button[data-v="${v}"]`);
      if(btn) btn.click();
    }, key, String(val));
    await new Promise(r=>setTimeout(r,80));
  }
  await page.evaluate(()=>document.getElementById('set-apply').click());
  await new Promise(r=>setTimeout(r,200));
}

(async()=>{
  const browser = await puppeteer.launch({ executablePath: EDGE, headless:'new', args:['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  const logs=[]; const ok=(n,c)=>logs.push((c?'PASS':'FAIL')+' '+n);
  await page.setViewport({width:1280,height:800});
  await page.goto(URL,{waitUntil:'networkidle0'});

  // 1) 标题左对齐：back-btn 左缘 ≈ showcase 左缘（同列）
  const align = await page.evaluate(()=>{
    const a=document.querySelector('.back-btn').getBoundingClientRect();
    const b=document.querySelector('.showcase-area').getBoundingClientRect();
    return {backLeft:a.left, showLeft:b.left, diff:Math.abs(a.left-b.left)};
  });
  ok(`title left-aligns with content column (diff=${align.diff}px)`, align.diff<=2);

  // 2) 默认四端无滚动条
  for(const [n,w,h] of VIEWPORTS){ await page.setViewport({width:w,height:h}); await new Promise(r=>setTimeout(r,150)); const s=await noScroll(page); const c=await page.$$eval('.opt-card',e=>e.length); ok(`default ${n} no-scroll opts=${c}`, s.w===s.iw&&s.h===s.ih&&c===18); }

  // 3) 四种变换：正确选项恰好1个等于 transformFilled(answer)
  for(const mode of ['rot90','rot270','flipV','flipH']){
    await apply(page,[['transform',mode]]);
    const res = await page.evaluate((mode)=>{
      const norm = (s)=>{ const d=document.createElement('div'); d.innerHTML=s; return d.innerHTML; };
      const expected = transformFilled(state.answer, mode);
      const expectedSVG = norm(makeSVG(expected, state.colors, 100));
      let count=0; document.querySelectorAll('.opt-card').forEach(c=>{ if(c.innerHTML===expectedSVG) count++; });
      const hintShown = document.getElementById('hint-bar').classList.contains('show');
      return {count, hintShown, hintText: document.getElementById('hint-bar').textContent};
    }, mode);
    ok(`${mode}: exactly 1 correct option matches transform (count=${res.count}, hint=${res.hintShown})`, res.count===1 && res.hintShown);
  }

  // 变换关掉后提示隐藏
  await apply(page,[['transform','none']]);
  const hintHidden = await page.evaluate(()=>!document.getElementById('hint-bar').classList.contains('show'));
  ok('transform none hides hint', hintHidden);

  // 4) 超难模式：task svg 圆形数 == 小方块数(gridN^2)
  await apply(page,[['difficulty','hard'],['gridN','2']]);
  const circles2 = await page.evaluate(()=>document.querySelectorAll('#task svg circle').length);
  ok('hard mode 4 squares -> 4 circles', circles2===4);
  await apply(page,[['gridN','3']]);
  const circles3 = await page.evaluate(()=>document.querySelectorAll('#task svg circle').length);
  ok('hard mode 9 squares -> 9 circles', circles3===9);
  // 超难 + 9方块 四端无滚动条
  for(const [n,w,h] of VIEWPORTS){ await page.setViewport({width:w,height:h}); await new Promise(r=>setTimeout(r,150)); const s=await noScroll(page); ok(`hard+9block ${n} no-scroll`, s.w===s.iw&&s.h===s.ih); }
  await apply(page,[['difficulty','normal'],['gridN','2']]);

  // 5) 打印：去姓名日期、18格、变换时含提示、横版居中CSS
  await apply(page,[['transform','rot90']]);
  await page.evaluate(()=>buildPrint());
  const print1 = await page.evaluate(()=>{
    const pa=document.getElementById('print-area');
    return { cells:pa.querySelectorAll('.p-cell').length, hasName:pa.innerHTML.includes('姓名'), hasHint:!!pa.querySelector('.p-hint'), len:pa.innerHTML.length };
  });
  ok('print: 18 cells, no name/date, has hint', print1.cells===18 && !print1.hasName && print1.hasHint);
  await apply(page,[['transform','none']]);
  await page.evaluate(()=>buildPrint());
  const print2 = await page.evaluate(()=>{ const pa=document.getElementById('print-area'); return { hasName:pa.innerHTML.includes('姓名'), hasHint:!!pa.querySelector('.p-hint') }; });
  ok('print: no name/date, no hint when none', !print2.hasName && !print2.hasHint);
  const cssLandscape = await page.evaluate(()=>{
    const ss=[...document.styleSheets]; let found=false;
    function walk(rules){ for(const r of rules){ if(!r) continue; const t=(r.cssText||'').toLowerCase(); if(t.includes('size: a4 landscape')) return true; if(r.cssRules && walk(r.cssRules)) return true; } return false; }
    for(const s of ss){ try{ if(walk(s.cssRules)) { found=true; break; } }catch(e){} }
    return found;
  });
  ok('print CSS uses A4 landscape', cssLandscape);

  // 6) 交互
  await page.evaluate(()=>{ CFG.colorMode='black'; CFG.transform='none'; newRound(); });
  const before=await page.$eval('#score',e=>e.textContent);
  const ci=await page.evaluate(()=>[...document.querySelectorAll('.opt-card')].findIndex(c=>c.dataset.ans==='1'));
  await page.evaluate(i=>document.querySelectorAll('.opt-card')[i].click(), ci);
  await new Promise(r=>setTimeout(r,150));
  const after=await page.$eval('#score',e=>e.textContent);
  ok('click correct increments score', Number(after)===Number(before)+1);

  await browser.close();
  console.log(logs.join('\n'));
  console.log(logs.every(l=>l.startsWith('PASS'))?'\nALL PASS':'\nSOME FAILED');
})().catch(e=>{console.error(e);process.exit(1);});
