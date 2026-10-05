// js/bench/motor.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EJERCICIOS DE VERIFICACIÓN · motor
   Cada ejercicio define: parámetros (valores o fórmulas), un modelo, y una lista de
   comprobaciones «valor teórico (fórmula o dato publicado) vs. valor del programa».
   Las fórmulas se escriben con sintaxis de Excel (^, SQRT(), PI(), IF(), …) para que el
   mismo texto sirva en la app y en el informe Excel.
   Unidades de entrada de las fórmulas: mm · N · MPa (cargas de usuario en kN y kN/m);
   resultados comparados en mm, rad, kN, kN·m.
   ════════════════════════════════════════════════════════════════════════════ */
const BENCH = [];
const BENCH_FN = {SQRT: Math.sqrt, SIN: Math.sin, COS: Math.cos, TAN: Math.tan, ATAN: Math.atan, ABS: Math.abs, EXP: Math.exp, LN: Math.log, MIN: Math.min, MAX: Math.max, PI: () => Math.PI, IF: (c, a, b) => c ? a : b};
const _benchCache = new Map();
function benchEval(expr, vals) {
  const names = Object.keys(vals), key = expr + '|' + names.join(',');
  let f = _benchCache.get(key);
  if (!f) { f = new Function(...Object.keys(BENCH_FN), ...names, '"use strict"; return (' + String(expr).replace(/\^/g, '**') + ');'); _benchCache.set(key, f); }
  return f(...Object.values(BENCH_FN), ...names.map(n => vals[n]));
}
function benchParams(ex) {
  const vals = {}, rows = [];
  for (const [name, spec, unit, desc] of ex.params) {
    const v = typeof spec === 'number' ? spec : benchEval(spec, vals);
    vals[name] = v; rows.push({name, expr: typeof spec === 'string' ? spec : null, value: v, unit: unit || '', desc: desc || ''});
  }
  return {vals, rows};
}
const BENCH_DOF = {Ux: 0, Uy: 1, Uz: 2, Rx: 3, Ry: 4, Rz: 5}, BENCH_REAC = {Fx: 0, Fy: 1, Fz: 2, Mx: 3, My: 4, Mz: 5};
const BENCH_SCALE = {N: 1e3, Vy: 1e3, Vz: 1e3, T: 1e6, Mz: 1e6, My: 1e6, vy: 1, vz: 1, ux: 1};
function benchProgram(st, R, ref) {
  const c = ref.c || 0, f = st.combos[c].f;
  switch (ref.k) {
    case 'disp': return nodeDisp(R, R.idx.get(ref.n), f)[BENCH_DOF[ref.d]];
    case 'reac': return nodeReac(R, R.idx.get(ref.n), f)[BENCH_REAC[ref.d]];
    case 'reacsum': return ref.ns.reduce((s, n) => s + nodeReac(R, R.idx.get(n), f)[BENCH_REAC[ref.d]], 0);
    case 'mem': {
      const mr = R.mrec.find(r => r.m.id === ref.m), S = memberStations(R, mr, f, 801), x = ref.x * mr.L;
      let bi = 0, bd = Infinity; S.x.forEach((xx, i) => { const d = Math.abs(xx - x); if (d < bd) { bd = d; bi = i; } });
      return S[ref.f][bi] / BENCH_SCALE[ref.f];
    }
    case 'cap': { const rec = R.checks.find(q => q.id === ref.m); return rec.cap[ref.f] / (/^phiM/.test(ref.f) ? 1e6 : (ref.f === 'lam' || ref.f === 'Mn_ratio' || ref.f === 'Q' || ref.f === 'Qs' || ref.f === 'Qa' || ref.f === 'Fe' || ref.f === 'Fcr') ? 1 : 1e3); }   // kN, kN·m, m (Lp, Lr), adimensional
    case 'celem': { const rec = R.checks.find(q => q.id === ref.m); return rec.cap.compElems[ref.i][ref.f]; }   // elemento de la sección en compresión: lam (b/t) o lr (límite de esbeltez)
    case 'finfo': { const rec = R.checks.find(q => q.id === ref.m); return rec.cap.flexInfo[ref.i][ref.f]; }   // elemento en flexión: lam, lp (compacta) o lr (no compacta)
    case 'sec': { const mr = R.mrec.find(r => r.m.id === ref.m); return mr.P[ref.f]; }   // propiedad geométrica de la sección (mm, mm², mm³, mm⁴, mm⁶)
    case 'util': { const rec = R.checks.find(q => q.id === ref.m); return ref.f ? rec.best[ref.f] : rec.r; }   // f: r (total), rH (axil+flexión), rV (corte)
    case 'weight': return R.weight;
  }
  throw new Error('comprobación desconocida: ' + ref.k);
}
const BENCH_COMBO0 = () => [{n: 'C1: 1,0·D', f: [1, 0, 0, 0], type: 'ULS'}];
function benchBuild(ex) {
  const {vals, rows} = benchParams(ex), m = ex.model(vals);
  const st = {name: ex.id + ' · ' + ex.titulo, nodes: m.nodes, members: m.members, customSections: m.customSections || {}, combos: m.combos || BENCH_COMBO0(), ver: m.ver || undefined,
    settings: Object.assign({E: vals.E || 200000, G: vals.G || 77200, Fy: vals.Fy || 235, selfWeight: false}, m.settings || {})};
  return {vals, rows, st};
}
// compara cada comprobación del ejercicio contra los resultados R de un modelo st (el de la corrida o el que está en el lienzo)
function benchCompare(ex, vals, st, R) {
  return ex.checks.map(c => {
    let theory = benchEval(c.t, vals), prog = benchProgram(st, R, c.ref);
    if (c.abs) { theory = Math.abs(theory); prog = Math.abs(prog); }
    const diff = prog - theory, tol = c.tol != null ? c.tol : (ex.tol != null ? ex.tol : 1e-4), atol = c.atol != null ? c.atol : 1e-6;
    return {label: c.l, unit: c.u || '', expr: c.t, abs: !!c.abs, theory, program: prog, diff, err: Math.abs(theory) > 1e-12 ? diff / theory : null, tol, atol, ok: Math.abs(diff) <= Math.max(tol * Math.abs(theory), atol), note: c.note || '', pub: !!c.pub};
  });
}
function runBench(ex) {
  const b = benchBuild(ex), st = b.st, res = {ex, params: b.rows, vals: b.vals, st, ok: false, rows: [], pass: false};
  const R = analyzeModel(st);
  if (!R.ok) { res.error = R.error; return res; }
  checkAll(st, R); res.ok = true;
  res.rows = benchCompare(ex, b.vals, st, R);
  res.pass = res.rows.every(r => r.ok);
  return res;
}
function runBenchAll() { return BENCH.map(runBench); }

/* ── helpers para armar modelos ── */
const BN = (id, x, y, z, sup, P, tag) => ({id, x, y, z, sup: sup || [0, 0, 0, 0, 0, 0], P: Object.assign({D: [0, 0, 0], L: [0, 0, 0], H: [0, 0, 0]}, P || {}), tag: tag || ''});
const BM = (id, i, j, sec, o) => { const m = Object.assign({id, i, j, sec, beta: 0, relI: false, relJ: false, K: 1, tag: '', q: {D: 0, L: 0, Wx: 0, Wy: 0}}, o || {}); m.q = Object.assign({D: 0, L: 0, Wx: 0, Wy: 0}, m.q); return m; };
// combinación con los once casos (modelo v2): cmb('U6: 0,9D+1,3Wx', {D: .9, Wx: 1.3}, 'ULS')
const cmb = (n, fo, type) => ({n, f: CASES.map(k => fo[k] || 0), type: type || 'ULS'});
const SUP_FIX = [1, 1, 1, 1, 1, 1], SUP_PIN = [1, 1, 1, 1, 0, 0], SUP_ROL = [0, 1, 1, 0, 0, 0];
