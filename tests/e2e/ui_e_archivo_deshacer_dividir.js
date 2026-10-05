// tests/e2e/ui_e_archivo_deshacer_dividir.js
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
  const ok = (name, cond, extra) => { if (!cond) process.exitCode = 1; console.log((cond ? 'OK   ' : 'FAIL ') + name + (extra !== undefined ? '  ' + extra : '')); };
  const calc = async () => { await page.click('#calcBtn'); await page.waitForTimeout(500); };
  await page.evaluate(() => {
    loadModelObj({name: 'todo', ver: 2, nodes: [
      {id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1]},
      {id: 2, x: 6000, y: 0, z: 0, sup: [0, 1, 0, 1, 0, 1], spr: [0, 0, 800, 0, 0, 0], sd: [0, 0, -12, 0, 0, 0]},
      {id: 3, x: 6000, y: 3000, z: 0, sup: [0, 0, 0, 0, 0, 0]}],
      members: [
        {id: 1, i: 1, j: 2, sec: 'IPE 300', beta: 0, tag: 'V1', sprI: {s: 80000, w: null}, relJ: false, trelJ: true, sprJ: {s: 0}, loads: [
          {k: 'U', c: 'D', dir: 'grav', a: 1000, b: 5000, w1: 3},
          {k: 'T', c: 'D', dir: 'grav', a: 0, b: null, w1: 1, w2: 6},
          {k: 'P', c: 'L', dir: 'grav', a: 2500, F: 25},
          {k: 'M', c: 'L', dir: 'Y', a: 4500, M: 15},
          {k: 'TH', c: 'T', dT: 30, dTy: 20, alpha: 1.2e-5}]},
        {id: 2, i: 2, j: 3, sec: 'IPE 200', beta: 0, tag: 'V2', relI: false, q: {D: 2, Hx: 1}, loads: [{k: 'P', c: 'Wx', dir: 'X', a: 1500, F: 4}]}],
      settings: {E: 200000, G: 77200, Fy: 235, selfWeight: true}});
    UI.showLoads = 'D'; scheduleDraw();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: salida('v2_e_D.png') });
  await page.evaluate(() => { UI.showLoads = 'L'; scheduleDraw(); }); await page.waitForTimeout(150); await page.screenshot({ path: salida('v2_e_L.png') });
  await page.evaluate(() => { UI.showLoads = 'T'; scheduleDraw(); }); await page.waitForTimeout(150); await page.screenshot({ path: salida('v2_e_T.png') });
  await page.evaluate(() => { state.combos = clone(DEF_COMBOS).map(c => Object.assign(c, {f: padF(c.f)})); state.combos.push({n: 'X: D+L+T+A+Wx', f: padF([1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1]), type: 'ULS'}); afterEdit(); });
  await calc();
  const R1 = await page.evaluate(() => { const R = UI.results; return {err: UI.err, msgs: R.msgs, eq: R.eq.map(e => e.err), r: R.checks.map(c => +c.r.toFixed(3))}; });
  ok('K modelo completo calcula', !R1.err, JSON.stringify(R1));
  const snap0 = await page.evaluate(() => snapJSON());
  // undo/redo conserva todo
  await page.evaluate(() => { pushUndo(); state.members[0].loads.pop(); state.nodes[1].spr[2] = 1; afterEdit(); undo(); });
  const snap1 = await page.evaluate(() => snapJSON());
  ok('L undo restaura cargas, resortes y uniones', snap0 === snap1);
  // guardar y reabrir
  const reopened = await page.evaluate(() => { const j = snapJSON(); loadModelObj(JSON.parse(j), 'x'); return snapJSON() === j; });
  ok('M guardar/abrir idempotente', reopened);
  // dividir la barra 1 en 3: se conserva la resultante
  const before = await page.evaluate(() => { const m = state.members[0]; return (m.loads || []).length; });
  const tot = (loads, L) => { let f = 0; (loads || []).forEach(l => { if (l.c !== 'D' && l.c !== 'L') return; const a = l.a || 0, b = l.b == null ? L : l.b; if (l.k === 'U') f += l.w1 * (b - a) / 1000; else if (l.k === 'T') f += (l.w1 + l.w2) / 2 * (b - a) / 1000; else if (l.k === 'P') f += l.F; }); return f; };
  const f0 = await page.evaluate(() => { const m = state.members[0]; const L = memberLen(m); let f = 0; m.loads.forEach(l => { if (l.c !== 'D' && l.c !== 'L') return; const a = l.a || 0, b = l.b == null ? L : l.b; if (l.k === 'U') f += l.w1 * (b - a) / 1000; else if (l.k === 'T') f += (l.w1 + l.w2) / 2 * (b - a) / 1000; else if (l.k === 'P') f += l.F; }); return f; });
  await calc();
  const prev = await page.evaluate(() => { const R = UI.results, f = R.combos[R.combos.length - 1].f; return {z2: nodeDisp(R, 1, f)[2], reac1: nodeReac(R, 0, f).slice(0, 3), reac2: nodeReac(R, 1, f).slice(0, 3)}; });
  await page.evaluate(() => { UI.sel.members = new Set([1]); splitMember(1, 3); });
  const f1 = await page.evaluate(() => { let f = 0; state.members.filter(m => m.tag === 'V1').forEach(m => { const L = memberLen(m); (m.loads || []).forEach(l => { if (l.c !== 'D' && l.c !== 'L') return; const a = l.a || 0, b = l.b == null ? L : l.b; if (l.k === 'U') f += l.w1 * (b - a) / 1000; else if (l.k === 'T') f += (l.w1 + l.w2) / 2 * (b - a) / 1000; else if (l.k === 'P') f += l.F; }); }); return f; });
  ok('N dividir en 3 conserva la resultante de las cargas', Math.abs(f1 - f0) < 1e-9, `${f0} vs ${f1}`);
  await calc();
  const after = await page.evaluate(() => { const R = UI.results, f = R.combos[R.combos.length - 1].f; const n2 = state.nodes.find(n => n.x === 6000 && n.y === 0).id; const i2 = R.idx.get(n2), i1 = R.idx.get(1); return {z2: nodeDisp(R, i2, f)[2], reac1: nodeReac(R, i1, f).slice(0, 3), reac2: nodeReac(R, i2, f).slice(0, 3), err: UI.err}; });
  ok('N resultados iguales antes y después de dividir (flecha nudo 2)', Math.abs(after.z2 - prev.z2) < 1e-6 * Math.max(1, Math.abs(prev.z2)), `${prev.z2} vs ${after.z2}`);
  ok('N reacciones iguales', after.reac1.every((v, k) => Math.abs(v - prev.reac1[k]) < 1e-6 * (1 + Math.abs(v))) && after.reac2.every((v, k) => Math.abs(v - prev.reac2[k]) < 1e-6 * (1 + Math.abs(v))), JSON.stringify([prev.reac1, after.reac1]));
  // invertir barra: mismos resultados
  await page.evaluate(() => { const m = state.members.find(m => m.tag === 'V2'); UI.sel.members = new Set([m.id]); });
  const pre = await page.evaluate(() => { const R = UI.results, f = R.combos[R.combos.length - 1].f; const m = state.members.find(m => m.tag === 'V2'); const mr = R.mrec.find(x => x.m.id === m.id); const S = memberStations(R, mr, f, 21); return {Mz: mxabs(S.Mz), My: mxabs(S.My), N: mxabs(S.N), vm: Math.max(...S.vy.map(Math.abs))}; });
  await page.evaluate(() => { pushUndo(); const m = state.members.find(m => m.tag === 'V2'); window.__w = flipMember(m); afterEdit(); });
  await calc();
  const post = await page.evaluate(() => { const R = UI.results, f = R.combos[R.combos.length - 1].f; const m = state.members.find(m => m.tag === 'V2'); const mr = R.mrec.find(x => x.m.id === m.id); const S = memberStations(R, mr, f, 21); return {Mz: mxabs(S.Mz), My: mxabs(S.My), N: mxabs(S.N), vm: Math.max(...S.vy.map(Math.abs))}; });
  ok('O invertir i↔j conserva esfuerzos máximos', Math.abs(pre.Mz - post.Mz) < 1e-6 * (1 + pre.Mz) && Math.abs(pre.My - post.My) < 1e-6 * (1 + pre.My) && Math.abs(pre.N - post.N) < 1e-6 * (1 + pre.N), JSON.stringify([pre, post]));
  console.log('errs', errs); if (errs.length) process.exitCode = 1;
  await browser.close();
})();
