// tests/e2e/ui_c_combinaciones_y_secciones.js
const { chromium, URL_APP, salida } = require('./_comun');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 }, colorScheme: 'dark', acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('requestfailed', r => errs.push('REQUESTFAILED: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto(URL_APP);
  await page.waitForTimeout(1200);
  const ok = (name, cond, extra) => { if (!cond) process.exitCode = 1; console.log((cond ? 'OK   ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : '')); };
  const calc = async () => { await page.click('#calcBtn'); await page.waitForTimeout(600); };

  /* modelo: pórtico de 1 vano, 2 columnas IPE 240 y viga IPE 300 */
  await page.evaluate(() => {
    loadModelObj({name: 'porticos', ver: 2, nodes: [
      {id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1]}, {id: 2, x: 6000, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1]},
      {id: 3, x: 0, y: 0, z: 4000}, {id: 4, x: 6000, y: 0, z: 4000}],
      members: [{id: 1, i: 1, j: 3, sec: 'IPE 240', beta: 90, tag: 'C1'}, {id: 2, i: 2, j: 4, sec: 'IPE 240', beta: 90, tag: 'C2'}, {id: 3, i: 3, j: 4, sec: 'IPE 300', beta: 0, tag: 'V1', q: {D: 8, L: 10}}], settings: {E: 200000, G: 77200, Fy: 235, selfWeight: true}});
    UI.sel.nodes.clear(); UI.sel.members = new Set([1, 2, 3]); showTab('loads');
  });
  await page.waitForTimeout(150);
  await page.click('#btnCombos'); await page.waitForTimeout(200);
  await page.screenshot({ path: salida('v2_c_combos.png') });
  // generador LRFD con S, viento y sismo
  for (const sel of ['gen.W', 'gen.E']) { const el = page.locator(`[data-gp="${sel}"]`); await el.check(); await page.waitForTimeout(100); }
  await page.click('#btnGenLRFD'); await page.waitForTimeout(200);
  const cmb = await page.evaluate(() => ({n: state.combos.length, uls: state.combos.filter(c => c.type === 'ULS').length, sls: state.combos.filter(c => c.type === 'SLS').length, names: state.combos.slice(0, 12).map(c => c.n), len: state.combos[0].f.length}));
  ok('E combinaciones generadas: 31 ULS + 3 SLS', cmb.uls === 31 && cmb.sls === 3 && cmb.len === 11, JSON.stringify(cmb));
  console.log('   ', cmb.names.join(' | '));
  const names09 = await page.evaluate(() => state.combos.filter(c => /^U\d+: 0,9D/.test(c.n)).length);
  ok('E combinaciones con 0,9D (4 viento + 8 sismo con 100/30... )', names09 === 4 + 8, names09);
  // generador de viento
  await page.locator('summary:has-text("Generador de viento")').click(); await page.waitForTimeout(100);
  await page.click('#btnGenWind'); await page.waitForTimeout(150);
  const wl = await page.evaluate(() => state.members.map(m => (m.loads || []).filter(l => l.gen === 'wind').map(l => [m.tag, l.c, l.k, +l.w1.toFixed(4), l.w2 != null ? +l.w2.toFixed(4) : null])));
  console.log('   viento:', JSON.stringify(wl));
  const msgW = await page.evaluate(() => UI.genMsg.wind);
  console.log('   ', msgW);
  // verificación independiente de q_z: columna C1 en Wx: z entre 0 y 4 m, Kz(z<4.57)=Kz(4.57)
  const ind = await page.evaluate(() => { const w = UI.wind; const kz = 2.01 * Math.pow(4.57 / 274.32, 2 / 9.5); const q = 0.613 * kz * 1 * 0.85 * 45 * 45 * 1 / 1000; const P = secProps(CAT['IPE 240']); return {q, w: q * 0.85 * 1.3 * Math.max(P.h, P.b) / 1000}; });
  const c1w = wl[0].find(x => x[1] === 'Wx');
  ok('F viento C1 en X: w = qz·G·Cf·ancho', c1w && Math.abs(c1w[3] - ind.w) < 1e-4, `${c1w && c1w[3]} vs ${ind.w.toFixed(4)}`);
  ok('F viento en la viga V1 (paralela a X) sin carga Wx, con Wy', !wl[2].some(x => x[1] === 'Wx') && wl[2].some(x => x[1] === 'Wy'));
  // sismo
  await page.locator('summary:has-text("Generador de sismo")').click(); await page.waitForTimeout(100);
  await page.click('#btnGenSeis'); await page.waitForTimeout(150);
  const sg = await page.evaluate(() => ({msg: UI.genMsg.seis, nodes: state.nodes.map(n => [n.id, n.P.Ex, n.P.Ey])}));
  console.log('   ', sg.msg); console.log('   ', JSON.stringify(sg.nodes));
  // verificación: W en nudos 3,4 = media de q.D*L... peso propio de columnas/2 + viga/2 + D
  const Wexp = await page.evaluate(() => { const g = 9.80665 / 1000; const c = secProps(CAT['IPE 240']).kg, v = secProps(CAT['IPE 300']).kg; const Wc = c * g * 4 / 2; const Wv = (v * g + 8) * 6 / 2; return {W: 2 * (Wc + Wv)}; });
  const Fsum = sg.nodes.filter(n => n[1]).reduce((t, n) => t + n[1][0], 0);
  ok('G sismo: V = C·W', Math.abs(Fsum - 0.1 * Wexp.W) < 1e-6, `${Fsum.toFixed(4)} vs ${(0.1 * Wexp.W).toFixed(4)}`);
  await page.click('#cbClose'); await page.waitForTimeout(100);
  await calc();
  const res = await page.evaluate(() => ({err: UI.err, nfail: UI.results && UI.results.nFail, rmax: UI.results && UI.results.maxR && +UI.results.maxR.r.toFixed(3), msgs: UI.results && UI.results.msgs}));
  ok('H cálculo con 34 combinaciones, viento y sismo', !res.err && res.rmax > 0, JSON.stringify(res));
  await page.screenshot({ path: salida('v2_c_res.png') });
  // dibujo: modos de carga
  for (const m of ['D', 'L', 'H', 'S', 'W', 'E', 'T']) { await page.evaluate(mm => { UI.showLoads = mm; scheduleDraw(); }, m); await page.waitForTimeout(80); }
  await page.evaluate(() => { UI.showLoads = 'W'; scheduleDraw(); }); await page.waitForTimeout(100);
  await page.screenshot({ path: salida('v2_c_wind.png') });
  await page.evaluate(() => { UI.showLoads = 'E'; scheduleDraw(); }); await page.waitForTimeout(100);
  await page.screenshot({ path: salida('v2_c_seis.png') });

  /* ── secciones armadas ── */
  await page.evaluate(() => showTab('model')); await page.waitForTimeout(100);
  await page.selectOption('#newSecType', 'WI'); await page.waitForTimeout(100);
  await page.click('#btnNewSec'); await page.waitForTimeout(150);
  const s1 = await page.evaluate(() => [UI.drawSec, JSON.stringify(state.customSections[UI.drawSec])]);
  ok('I sección WI creada', s1[1].includes('"type":"WI"'), s1.join(' '));
  await page.selectOption('#newSecType', 'IPL'); await page.waitForTimeout(100);
  await page.click('#btnNewSec'); await page.waitForTimeout(150);
  const s2 = await page.evaluate(() => [UI.drawSec, JSON.stringify(state.customSections[UI.drawSec])]);
  ok('I sección IPL creada', s2[1].includes('"type":"IPL"'), s2.join(' '));
  await page.selectOption('#newSecType', 'BOX'); await page.waitForTimeout(100);
  await page.click('#btnNewSec'); await page.waitForTimeout(150);
  const s3 = await page.evaluate(() => [UI.drawSec, JSON.stringify(state.customSections[UI.drawSec])]);
  ok('I sección BOX creada', s3[1].includes('"type":"BOX"'), s3.join(' '));
  await page.locator('summary:has-text("Propiedades y esbeltez")').click(); await page.waitForTimeout(150);
  await page.screenshot({ path: salida('v2_c_sec.png') });
  // asignar WI a la viga y recalcular
  await page.evaluate(() => { const wi = Object.keys(state.customSections).find(k => k.startsWith('PS ')); state.members[2].sec = wi; afterEdit(); }); await calc();
  const r3 = await page.evaluate(() => { const c = UI.results.rmap.get(3); return {r: +c.r.toFixed(3), cap: c.cap.cls, Cb: c.best.Cb, notes: c.cap.notes, eng: c.cap.flexEng}; });
  ok('J viga PS calculada', r3.r > 0, JSON.stringify(r3));
  // Excel (sin librería => CSV)
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.evaluate(() => { try { exportXLS(); } catch (e) { window.__xerr = e.message; } });
  const d = await dl; console.log('   export:', d ? d.suggestedFilename() : 'sin descarga', await page.evaluate(() => window.__xerr || 'sin error'));
  console.log('errs', errs); if (errs.length) process.exitCode = 1;
  await browser.close();
})();
