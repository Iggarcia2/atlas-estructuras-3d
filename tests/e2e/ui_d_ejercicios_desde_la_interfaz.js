// tests/e2e/ui_d_ejercicios_desde_la_interfaz.js
const { chromium, URL_APP, salida } = require('./_comun');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, colorScheme: 'dark', acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('requestfailed', r => errs.push('REQUESTFAILED: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto(URL_APP); await page.waitForTimeout(1200);
  await page.evaluate(() => { UI.bench = 'x'; });
  const out = await page.evaluate(async () => {
    const res = [];
    for (const ex of BENCH) {
      await bxLoad(ex.id); await new Promise(r => setTimeout(r, 120));
      let rows, err = null; try { rows = benchCompare(ex, benchParams(ex).vals, state, UI.results); } catch (e) { err = e.message; }
      res.push({id: ex.id, n: rows ? rows.length : 0, ok: rows ? rows.filter(q => q.ok).length : 0, err, uierr: UI.err});
    }
    return res;
  });
  let tot = 0, okc = 0; out.forEach(r => { tot += r.n; okc += r.ok; if (r.ok !== r.n || r.err || r.uierr) { process.exitCode = 1; console.log('PROBLEMA', JSON.stringify(r)); } });
  console.log('ejercicios', out.length, 'comprobaciones', okc, '/', tot);
  console.log('errs', errs); if (errs.length) process.exitCode = 1;
  await browser.close();
})();
