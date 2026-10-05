// tests/e2e/ui_b_cargas_uniones_resortes.js
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
  const calc = async () => { await page.click('#calcBtn'); await page.waitForTimeout(400); };

  /* ── A: viga simplemente apoyada con carga puntual agregada desde la interfaz ── */
  await page.evaluate(() => {
    loadModelObj({name: 'viga', ver: 2, nodes: [
      {id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 0, 0]}, {id: 2, x: 6000, y: 0, z: 0, sup: [0, 1, 1, 0, 0, 0]}],
      members: [{id: 1, i: 1, j: 2, sec: 'IPE 300', beta: 0}], settings: {E: 200000, G: 77200, Fy: 235, selfWeight: false}});
    UI.sel.members = new Set([1]); UI.sel.nodes.clear(); showTab('props');
  });
  await page.waitForTimeout(150);
  await page.click('summary:has-text("Agregar carga")');
  await page.selectOption('[data-ldd=k]', 'P');
  await page.fill('[data-ldd=F]', '20'); await page.dispatchEvent('[data-ldd=F]', 'change');
  await page.fill('[data-ldd=a]', '3000'); await page.dispatchEvent('[data-ldd=a]', 'change');
  await page.click('[data-ldadd]');
  const lds = await page.evaluate(() => JSON.stringify(state.members[0].loads));
  ok('A carga puntual agregada', lds.includes('"k":"P"') && lds.includes('"F":20') && lds.includes('3000'), lds);
  await calc();
  const A = await page.evaluate(() => { const R = UI.results, mr = R.mrec[0], ci = R.combos.findIndex(c => c.n.indexOf('S0') === 0); const S = memberStations(R, mr, R.combos[ci].f, 21); return {Mz: mxabs(S.Mz) / 1e6, v: Math.max(...S.vz.map(Math.abs)), vy: Math.max(...S.vy.map(Math.abs)), uz: Math.min(...nodeDisp(R, 0, R.combos[ci].f).slice(0, 3)), names: R.combos.map(c => c.n)}; });
  ok('A momento PL/4 = 30 kN·m', Math.abs(A.Mz - 30) < 1e-6, A.Mz);
  const Ix = await page.evaluate(() => secProps(CAT['IPE 300']).Is); const dth = 20e3 * 6000 ** 3 / (48 * 200000 * Ix);
  ok('A flecha PL³/48EI', Math.abs(A.vy - dth) < 1e-3 * dth, `${A.vy.toFixed(4)} vs ${dth.toFixed(4)}`);

  /* ── B: unión semirrígida desde el selector ── */
  await page.evaluate(() => {
    loadModelObj({name: 'viga2', ver: 2, nodes: [
      {id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1]}, {id: 2, x: 4000, y: 0, z: 0, sup: [0, 1, 1, 1, 1, 1]}],
      members: [{id: 1, i: 1, j: 2, sec: 'IPE 200', beta: 0, q: {D: 2}}], settings: {E: 200000, G: 77200, Fy: 235, selfWeight: false}});
    UI.sel.members = new Set([1]); UI.sel.nodes.clear(); showTab('props');
  });
  await page.waitForTimeout(100);
  await page.selectOption('[data-jt=I]', 'semi'); await page.waitForTimeout(100);
  await page.fill('[data-b="jt.I.s"]', '50000'); await page.dispatchEvent('[data-b="jt.I.s"]', 'change');
  await page.selectOption('[data-jt=J]', 'pin'); await page.waitForTimeout(100);
  const jm = await page.evaluate(() => JSON.stringify([state.members[0].sprI, state.members[0].relJ, jointKind(state.members[0], 'I'), jointKind(state.members[0], 'J')]));
  ok('B uniones asignadas', jm === '[{"s":50000,"w":null},true,"semi","pin"]', jm);
  await calc();
  const B = await page.evaluate(() => { const R = UI.results, mr = R.mrec[0], f = R.combos.find(c => c.n.indexOf('S0') === 0).f, S = memberStations(R, mr, f, 21); return {M0: S.Mz[0] / 1e6, M1: S.Mz[S.Mz.length - 1] / 1e6, Mmax: mxabs(S.Mz) / 1e6, Is: mr.P.Is}; });
  // teoría: viga con resorte kθ en i (nodo i empotrado), articulada en j, q uniforme: Mi (en el apoyo) 
  console.log('   B momentos', B.M0.toFixed(3), B.M1.toFixed(3), B.Mmax.toFixed(3));
  ok('B extremo j articulado: M≈0', Math.abs(B.M1) < 1e-6, B.M1);
  // verificación por equilibrio: con kθ→∞ vale wL²/8=4; con kθ=0 → 0 en i. Valor intermedio:
  const EI = 200000 * B.Is, L = 4000, w = 2, ks = 5e4 * 1e6; // viga con articulación en j y resorte en i: Mi = wL²/8 / (1+3EI/(ks L))
  const Mi = (w * L * L / 8) / (1 + 3 * EI / (ks * L)) / 1e6;
  ok('B momento en i con resorte (teoría)', Math.abs(Math.abs(B.M0) - Mi) < 1e-3 * Mi, `${Math.abs(B.M0).toFixed(4)} vs ${Mi.toFixed(4)}`);

  /* ── C: resorte de apoyo y asentamiento desde la interfaz de nudo ── */
  await page.evaluate(() => {
    loadModelObj({name: 'resorte', ver: 2, nodes: [
      {id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1]}, {id: 2, x: 3000, y: 0, z: 0, sup: [0, 1, 0, 1, 1, 1]}],
      members: [{id: 1, i: 1, j: 2, sec: 'IPE 200', beta: 0}], settings: {E: 200000, G: 77200, Fy: 235, selfWeight: false}});
    UI.sel.nodes = new Set([2]); UI.sel.members.clear(); showTab('props');
  });
  await page.waitForTimeout(100);
  await page.click('summary:has-text("Apoyos elásticos")');
  await page.fill('[data-b="n.spr.2"]', '500'); await page.dispatchEvent('[data-b="n.spr.2"]', 'change');
  await page.waitForTimeout(100);
  await page.click('summary:has-text("Apoyos elásticos")').catch(() => {});
  await page.click('[data-nc="D"]');
  await page.fill('[data-b="n.P.D.2"]', '-10'); await page.dispatchEvent('[data-b="n.P.D.2"]', 'change');
  const nn = await page.evaluate(() => JSON.stringify(state.nodes[1]));
  ok('C resorte y carga guardados', nn.includes('"spr":[0,0,500') && nn.includes('"D":[0,0,-10]'), nn);
  await calc();
  const C = await page.evaluate(() => { const R = UI.results, f = R.combos.find(c => c.n.indexOf('S0') === 0).f, u = nodeDisp(R, 1, f), re = nodeReac(R, 1, f), P = secProps(CAT['IPE 200']); return {uz: u[2], re: re[2], Is: P.Is}; });
  const kb = 12 * 200000 * C.Is / 3000 ** 3, ks2 = 500, uz = -10e3 / (kb + ks2) ;  // voladizo (k=3EI/L³) en serie... están en paralelo: el resorte y la barra comparten el nudo
  ok('C reacción del resorte = ks·u', Math.abs(C.re - (-ks2 * C.uz / 1000)) < 1e-6, `${C.re} vs ${-ks2 * C.uz / 1000}`);
  ok('C desplazamiento = P/(kb+ks)', Math.abs(C.uz - uz) < 1e-3 * Math.abs(uz), `${C.uz} vs ${uz}`);

  /* ── D: segundo orden desde el selector y amplificación ── */
  await page.evaluate(() => {
    loadModelObj({name: 'col', ver: 2, nodes: [
      {id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1]}, {id: 2, x: 0, y: 0, z: 3000, sup: [0, 0, 0, 0, 0, 0], P: {D: [0, 0, -100], L: [0, 0, 0], H: [20, 0, 0]}}],
      members: [{id: 1, i: 1, j: 2, sec: 'IPE 300', beta: 90}], settings: {E: 200000, G: 77200, Fy: 235, selfWeight: false}});
    showTab('loads');
  });
  await page.waitForTimeout(100);
  await page.selectOption('[data-b="s.order"]', '2'); await page.waitForTimeout(150);
  ok('D orden 2 guardado', await page.evaluate(() => state.settings.order === 2));
  await page.evaluate(() => { state.combos = [{n: 'U: 1,2D+1,6Hx', f: padF([1.2, 0, 1.6]), type: 'ULS'}, {n: 'S: D+Hx', f: padF([1, 0, 1]), type: 'SLS', lim: 250}]; afterEdit(); });
  await calc();
  console.log('   err:', await page.evaluate(() => UI.err));
  const D = await page.evaluate(() => { const R = UI.results, c = R.checks[0]; return {order: R.order, amp: c.best.amp, ampS: c.best.ampS, ampN: c.best.ampN, r: c.r, uxSO: nodeDisp(R, 1, R.combos[1].f)[0]}; });
  const P0 = 100e3, H0 = 20e3, L0 = 3000, EIw = 200000 * (await page.evaluate(() => secProps(CAT['IPE 300']).Iw)), u = L0 * Math.sqrt(P0 / EIw), d2 = H0 * L0 ** 3 / (3 * EIw) * 3 * (Math.tan(u) - u) / u ** 3;
  ok('D amplificación > 1 y flecha exacta (voladizo)', D.order === 2 && D.amp > 1.05, JSON.stringify(D));
  console.log('   flecha teórica 2.º orden con D completo (Hx=1 y D=1):', d2.toFixed(3), 'calc', D.uxSO.toFixed(3));
  ok('D flecha = tan(u)', Math.abs(D.uxSO - d2) < 2e-3 * d2);
  await page.screenshot({ path: salida('v2_b_so.png') });

  console.log('errs', errs); if (errs.length) process.exitCode = 1;
  await browser.close();
})();
