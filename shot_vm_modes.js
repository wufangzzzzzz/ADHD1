const puppeteer = require('puppeteer-core');
const path = require('path');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'file://' + path.resolve('visual-match.html');
async function apply(page, changes){
  await page.evaluate(()=>document.getElementById('set-btn').click());
  await new Promise(r=>setTimeout(r,120));
  for(const [k,v] of changes){ await page.evaluate((k,v)=>{const b=document.querySelector(`.seg[data-key="${k}"] button[data-v="${v}"]`); if(b)b.click();},k,String(v)); await new Promise(r=>setTimeout(r,80)); }
  await page.evaluate(()=>document.getElementById('set-apply').click());
  await new Promise(r=>setTimeout(r,250));
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:EDGE,headless:'new',args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage();
  await page.setViewport({width:1024,height:768});
  await page.goto(URL,{waitUntil:'networkidle0'});
  await apply(page,[['transform','rot90'],['colorMode','same'],['sameColor','#e23b3b']]);
  await page.screenshot({path:'shot_vm_transform.png'});
  await apply(page,[['transform','none'],['difficulty','hard'],['colorMode','black']]);
  await page.screenshot({path:'shot_vm_hard.png'});
  await browser.close();
  console.log('shots done');
})().catch(e=>{console.error(e);process.exit(1);});
