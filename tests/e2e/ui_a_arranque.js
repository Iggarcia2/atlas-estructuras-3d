// tests/e2e/ui_a_arranque.js
const { chromium, URL_APP, salida } = require('./_comun');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('requestfailed', r => errs.push('REQUESTFAILED: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto(URL_APP);
  await page.waitForTimeout(1500);
  console.log('ver', await page.evaluate(() => [state.ver, state.settings, state.nodes.length, state.members.length, state.combos[0].f.length, UI.results && UI.results.maxR && UI.results.maxR.r, UI.err]));
  console.log('members q:', await page.evaluate(() => JSON.stringify(state.members.slice(0,3).map(m => m.q))));
  await page.screenshot({ path: salida('v2_a1.png') });
  // seleccionar barra, ver propiedades
  await page.evaluate(() => { UI.sel.members = new Set([state.members[0].id]); UI.sel.nodes.clear(); showTab('props'); renderProps(); scheduleDraw(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: salida('v2_a2.png') });
  console.log('errs', errs); if (errs.length) process.exitCode = 1;
  await browser.close();
})();
