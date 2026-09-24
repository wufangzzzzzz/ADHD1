const puppeteer = require('C:/Users/46924/.workbuddy/binaries/node/workspace/node_modules/puppeteer-core');
(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--no-sandbox']
  });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///D:/专注力项目/schulte-grid.html', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1000));
  console.log('document.title =', JSON.stringify(await p.title()));
  console.log('图案菜单项     =', await p.evaluate(() => document.querySelectorAll('.mode-menu-item').length));
  console.log('含「图案12」项 =', await p.evaluate(() =>
    [...document.querySelectorAll('.mode-menu-item')].some(e => e.textContent.indexOf('图案12') >= 0)));
  console.log('JS 报错        =', errs.length ? errs.slice(0, 2).join(' | ') : '无');
  await b.close();
})();
