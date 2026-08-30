const puppeteer = require('C:\\Users\\46924\\.workbuddy\\binaries\\node\\workspace\\node_modules\\puppeteer-core');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = 'file:///D:/专注力项目/schulte-grid.html';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 950 });
  await page.goto(FILE, { waitUntil:'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  const r = await page.evaluate(async () => {
    const g = window.game;
    g.setMode('arithmetic');
    await new Promise(r => setTimeout(r, 300));
    const out = [];
    for (let rd = 0; rd < 3; rd++) {
      g.renderGrid();
      await new Promise(r => setTimeout(r, 120));
      const size = g._p11GridSize();
      const mat = [];
      for (let i = 0; i < size; i++) { mat.push([]); for (let j = 0; j < size; j++) mat[i].push('·'); }
      document.querySelectorAll('.pattern11-bar').forEach(b => {
        const r2 = Math.round(b.getBoundingClientRect().top);
        const c2 = Math.round(b.getBoundingClientRect().left);
        // 由条位置映射到行列：需要容器原点
      });
      // 用 dataset.number 反查 blocks 不可行（blocks 没暴露）。改为从 gridColumn/gridRow 解析
      document.querySelectorAll('.pattern11-bar').forEach(b => {
        const gc = b.style.gridColumn.split(' / ')[0] - 1;   // 起始列线-1 = 列索引
        const gr = b.style.gridRow.split(' / ')[0] - 1;      // 起始行线-1 = 行索引
        const v = b.classList.contains('p11-v');
        const span = v ? 2 : 2;   // 横占2列、竖占2行
        if (v) { mat[gr][gc] = 'V'; mat[gr+1][gc] = 'V'; }
        else { mat[gr][gc] = 'H'; mat[gr][gc+1] = 'H'; }
      });
      out.push(mat.map(row => row.join(' ')).join('\n'));
    }
    return out;
  });
  r.forEach((m, i) => { console.log('===== 局' + (i+1) + ' ====='); console.log(m); });
  await browser.close();
})();
