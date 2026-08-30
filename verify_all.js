const puppeteer = require('puppeteer-core');
const EXE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const files = ['B2-reverse','B3-ruleswitch','B6-bilateral-coord','B10-tower-of-london','B16-divided-attention','G4-code-decoder','G7-story-detective','color-sort','corsi-matrix','flash-sequence','visual-nback','number-focus','visual-predict','snake-connection','gestalt-completion','symbol-maze'];
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--no-sandbox'] });
  for (const f of files) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    try {
      await page.goto('http://127.0.0.1:8155/' + f + '.html', { waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) { errors.push('GOTO: ' + e.message); }
    await new Promise(r => setTimeout(r, 300));
    const real = errors.filter(e => !e.includes('fonts.googleapis') && !e.includes('Failed to load resource') && !e.includes('404'));
    console.log(f.padEnd(22), real.length === 0 ? 'OK 无报错' : 'ERR: ' + real.join(' | '));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
