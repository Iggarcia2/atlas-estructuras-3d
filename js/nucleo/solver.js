// js/nucleo/solver.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   SOLVER 3D DE PÓRTICOS  (primer y segundo orden)
   · 6 GDL por nudo · barra = elemento viga-columna exacto (js/nucleo/elemento.js) con 12 GDL
   · cargas en barra: uniformes, parciales, trapezoidales, puntuales, momentos, temperatura
   · uniones de extremo: rígida / articulada / semirrígida (resorte de giro) / torsión liberada
   · apoyos: restringidos, elásticos (resortes) y con asentamiento impuesto
   · segundo orden: P-Δ y P-δ por iteración sobre la carga axial de cada barra, combinación por combinación
   Unidades internas: mm · N · MPa.  Entrada: kN, kN/m, kN·m.
   ════════════════════════════════════════════════════════════════════════════ */
const NC = CASES.length;
const Q_DIR = {D: 'grav', L: 'grav', S: 'grav', Hx: 'X', Hy: 'Y', Wx: 'X', Wy: 'Y', Ex: 'X', Ey: 'Y'};
const DIRV = {grav: [0, 0, -1], X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1]};
const LOCDIR = {lx: 0, ly: 1, lz: 2};
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const emptyLC = () => ({ax: [], py: [], pz: [], eps0: 0, kTy: 0, kTz: 0});

/* ── cargas de barra → primitivas en ejes locales ── */
function buildMemberLoads(m, fr, L, P, legacy, selfW) {
  const lc = CASES.map(emptyLC), direct = CASES.map(() => null), warns = [];
  const eps = Math.max(1e-6, 1e-9 * L);
  const comps = (c, kind) => {                          // c: {dir} → componentes locales del vector unitario
    let d = c.dir || 'grav';
    if (d in LOCDIR) { const v = [0, 0, 0]; v[LOCDIR[d]] = 1; return v; }
    const g = DIRV[d] || DIRV.grav; return [dot3(fr.ex, g), dot3(fr.ey, g), dot3(fr.ez, g)];
  };
  const dist = (ci, cv, w1, w2, a, b) => {
    if (!(b - a > 1e-9) || (!w1 && !w2)) return; const t = lc[ci];
    if (cv[0]) t.ax.push({t: 'U', a, b, w1: w1 * cv[0], w2: w2 * cv[0]});
    if (cv[1]) t.py.push({t: 'U', a, b, w1: w1 * cv[1], w2: w2 * cv[1]});
    if (cv[2]) t.pz.push({t: 'U', a, b, w1: -w1 * cv[2], w2: -w2 * cv[2]});
  };
  const addDirect = (ci, vec12) => { if (!direct[ci]) direct[ci] = new Float64Array(12); for (let i = 0; i < 12; i++) direct[ci][i] += vec12[i]; };
  const point = (ci, cv, F, a) => {
    if (!F) return;
    if (a <= eps || a >= L - eps) { const v = new Float64Array(12), o = a <= eps ? 0 : 6; v[o] = F * cv[0]; v[o + 1] = F * cv[1]; v[o + 2] = F * cv[2]; addDirect(ci, v); return; }
    const t = lc[ci]; if (cv[0]) t.ax.push({t: 'F', a, F: F * cv[0]}); if (cv[1]) t.py.push({t: 'F', a, F: F * cv[1]}); if (cv[2]) t.pz.push({t: 'F', a, F: -F * cv[2]});
  };
  const moment = (ci, cv, M, a) => {
    if (!M) return;
    if (a <= eps || a >= L - eps) { const v = new Float64Array(12), o = a <= eps ? 0 : 6; v[o + 3] = M * cv[0]; v[o + 4] = M * cv[1]; v[o + 5] = M * cv[2]; addDirect(ci, v); return; }
    const t = lc[ci]; if (cv[2]) t.py.push({t: 'M', a, M: M * cv[2]}); if (cv[1]) t.pz.push({t: 'M', a, M: M * cv[1]});
    if (cv[0]) warns.push(`Barra ${m.id}: un momento torsor puntual dentro del tramo no está soportado (se ignora).`);
  };
  // 1) cargas uniformes rápidas (m.q) y peso propio
  const q = m.q || {};
  const qv = key => { if (legacy) { if (key === 'Hx') return q.Wx || 0; if (key === 'Hy') return q.Wy || 0; if (key === 'Wx' || key === 'Wy') return 0; } return q[key] || 0; };
  CASES.forEach((key, ci) => {
    if (!Q_DIR[key]) return; let w = qv(key); if (key === 'D') w += selfW;
    if (w) dist(ci, comps({dir: Q_DIR[key]}), w, w, 0, L);
  });
  // 2) cargas generales
  for (const ld of (m.loads || [])) {
    const ci = CASES.indexOf(ld.c || 'D'); if (ci < 0) continue; const cv = comps(ld), a = Math.max(0, ld.a || 0), b = ld.b == null ? L : Math.min(L, ld.b);
    const k = ld.k || 'U';
    if (k === 'U') dist(ci, cv, ld.w1 || 0, ld.w1 || 0, a, b);
    else if (k === 'T') dist(ci, cv, ld.w1 || 0, ld.w2 || 0, a, b);
    else if (k === 'P') point(ci, cv, (ld.F || 0) * 1000, a);
    else if (k === 'M') moment(ci, cv, (ld.M || 0) * 1e6, a);
    else if (k === 'TH') {
      const al = ld.alpha || 1.2e-5, t = lc[ci];
      t.eps0 += al * (ld.dT || 0);
      if (ld.dTy) t.kTy += -al * ld.dTy / (P.h || 1);   // ΔT = T(+y) − T(−y): la cara +y se alarga → curvatura negativa
      if (ld.dTz) t.kTz += al * ld.dTz / (P.b || P.h || 1);
    }
  }
  return {lc, direct, warns};
}
function scaleLC(lc, f) {
  const sc = p => { const o = Object.assign({}, p); for (const k of ['w1', 'w2', 'F', 'M']) if (o[k] != null) o[k] *= f; return o; };
  return {ax: lc.ax.map(sc), py: lc.py.map(sc), pz: lc.pz.map(sc), eps0: lc.eps0 * f, kTy: lc.kTy * f, kTz: lc.kTz * f};
}
function sumLC(lcs, fct) {
  const o = emptyLC();
  fct.forEach((f, c) => { if (!f || !lcs[c]) return; const s = scaleLC(lcs[c], f); o.ax.push(...s.ax); o.py.push(...s.py); o.pz.push(...s.pz); o.eps0 += s.eps0; o.kTy += s.kTy; o.kTz += s.kTz; });
  return o;
}
const lcEmpty = lc => !lc.ax.length && !lc.py.length && !lc.pz.length && !lc.eps0 && !lc.kTy && !lc.kTz;

/* ── carga axial: resultante acumulada y su integral ── */
function axW(ax, x) { let w = 0; for (const p of ax) { if (p.t === 'U') { if (x > p.a) { const xx = Math.min(x, p.b) - p.a, g = (p.w2 - p.w1) / (p.b - p.a); w += p.w1 * xx + g * xx * xx / 2; } } else if (x >= p.a) w += p.F; } return w; }
function axI(ax, x) {                                    // ∫0^x axW
  let I = 0;
  for (const p of ax) {
    if (p.t === 'U') {
      if (x <= p.a) continue; const d = p.b - p.a, g = (p.w2 - p.w1) / d;
      if (x <= p.b) { const xx = x - p.a; I += p.w1 * xx * xx / 2 + g * xx ** 3 / 6; }
      else I += p.w1 * d * d / 2 + g * d ** 3 / 6 + (p.w1 * d + g * d * d / 2) * (x - p.b);
    } else if (x > p.a) I += p.F * (x - p.a);
  }
  return I;
}
function axFeq(ax, L) {                                  // reacciones de empotramiento axial en i y j (fuerza hacia +x)
  let fi = 0, fj = 0;
  for (const p of ax) {
    if (p.t === 'U') { const d = p.b - p.a, g = (p.w2 - p.w1) / d, W = p.w1 * d + g * d * d / 2, Ms = p.w1 * (p.b * p.b - p.a * p.a) / 2 + g * ((p.b ** 3 - p.a ** 3) / 3 - p.a * (p.b * p.b - p.a * p.a) / 2); fi += W - Ms / L; fj += Ms / L; }
    else { fi += p.F * (L - p.a) / L; fj += p.F * p.a / L; }
  }
  return [fi, fj];
}

/* ── matriz de la barra (12×12) con carga axial Pax, y vector de cargas equivalentes ── */
const ZS = [-1, 1, -1, 1], ZIDX = [2, 4, 8, 10], YIDX = [1, 5, 7, 11];
function elemK12(mr, Pax, fEA, fEI) {
  const k = new Float64Array(144), set = (i, j, v) => { k[i * 12 + j] += v; if (i !== j) k[j * 12 + i] += v; };
  const L = mr.L, EA = mr.EA * fEA / L, GJ = mr.GJ / L;
  set(0, 0, EA); set(6, 6, EA); set(0, 6, -EA); set(3, 3, GJ); set(9, 9, GJ); set(3, 9, -GJ);
  const ky = planeK(mr.EIs * fEI, L, Pax, mr.gsY), kz = planeK(mr.EIw * fEI, L, Pax, mr.gsZ);
  if (!ky || !kz) return null;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { k[YIDX[i] * 12 + YIDX[j]] += ky[i * 4 + j]; k[ZIDX[i] * 12 + ZIDX[j]] += ZS[i] * ZS[j] * kz[i * 4 + j]; }
  return k;
}
function elemLoads(mr, Pax, comb, fEA, fEI) {
  const L = mr.L, SY = planeMake(mr.EIs * fEI, L, Pax, mr.gsY, comb.py, comb.kTy), SZ = planeMake(mr.EIw * fEI, L, Pax, mr.gsZ, comb.pz, comb.kTz);
  if (!SY || !SZ) return null;
  const fe = new Float64Array(12), ay = axFeq(comb.ax, L), EA = mr.EA * fEA;
  fe[0] = ay[0] - EA * comb.eps0; fe[6] = ay[1] + EA * comb.eps0;
  const fy = planeFeq(SY), fz = planeFeq(SZ); if (!fy || !fz) return null;
  for (let i = 0; i < 4; i++) { fe[YIDX[i]] = fy[i]; fe[ZIDX[i]] = ZS[i] * fz[i]; }
  return {fe, SY, SZ};
}

/* ── uniones de extremo (resortes de giro): condensación estática generalizada ──
   sp: [{dof, ks}] con ks en N·mm/rad (0 = articulación).  Los GDL con resorte se duplican (giro del nudo θ y giro de la barra φ). */
function condenseSetup(k, sp) {
  const nS = sp.length; if (!nS) return null;
  const sd = sp.map(s => s.dof), ad = []; for (let q = 0; q < 12; q++) if (!sd.includes(q)) ad.push(q);
  const na = ad.length, KSa = new Float64Array(nS * na), Z = new Float64Array(nS * nS), Ks = new Float64Array(nS);
  sd.forEach((r, i) => { ad.forEach((c, j) => KSa[i * na + j] = k[r * 12 + c]); sd.forEach((c, j) => Z[i * nS + j] = k[r * 12 + c]); Ks[i] = sp[i].ks; });
  for (let i = 0; i < nS; i++) Z[i * nS + i] += Ks[i];
  const tors = sp.filter(s => s.dof === 3 || s.dof === 9 ).length === 2 && sp.every(s => (s.dof !== 3 && s.dof !== 9) || s.ks === 0);
  if (tors) sd.forEach((r, i) => { if (r === 3 || r === 9) Z[i * nS + i] += 1e-9 * k[r * 12 + r]; });
  const I = new Float64Array(nS * nS); for (let i = 0; i < nS; i++) I[i * nS + i] = 1;
  const Zinv = solveSmall(Z, I, nS, nS); if (!Zinv) return null;
  const XSa = new Float64Array(nS * na), Xs = new Float64Array(nS * nS);
  for (let i = 0; i < nS; i++) { for (let j = 0; j < na; j++) { let s = 0; for (let q = 0; q < nS; q++) s += Zinv[i * nS + q] * KSa[q * na + j]; XSa[i * na + j] = s; } for (let j = 0; j < nS; j++) Xs[i * nS + j] = Zinv[i * nS + j] * Ks[j]; }
  const kc = new Float64Array(144);
  for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) { let s = k[ad[i] * 12 + ad[j]]; for (let q = 0; q < nS; q++) s -= KSa[q * na + i] * XSa[q * na + j]; kc[ad[i] * 12 + ad[j]] = s; }
  for (let i = 0; i < na; i++) for (let j = 0; j < nS; j++) { let s = 0; for (let q = 0; q < nS; q++) s += KSa[q * na + i] * Xs[q * nS + j]; kc[ad[i] * 12 + sd[j]] = s; kc[sd[j] * 12 + ad[i]] = s; }
  for (let i = 0; i < nS; i++) for (let j = 0; j < nS; j++) kc[sd[i] * 12 + sd[j]] = (i === j ? Ks[i] : 0) - Ks[i] * Xs[i * nS + j];
  return {sd, ad, nS, na, KSa, Zinv, XSa, Xs, Ks, kc, Z};
}
function isPDsmall(Z, n) {                                // Cholesky de una matriz chica: ¿definida positiva?
  const A = Float64Array.from(Z);
  for (let j = 0; j < n; j++) { let s = A[j * n + j]; for (let k = 0; k < j; k++) s -= A[j * n + k] ** 2; if (!(s > 0)) return false; const d = Math.sqrt(s); A[j * n + j] = d; for (let i = j + 1; i < n; i++) { let t = A[i * n + j]; for (let k = 0; k < j; k++) t -= A[i * n + k] * A[j * n + k]; A[i * n + j] = t / d; } }
  return true;
}
function condenseLoad(cd, fe) {
  const fS = cd.sd.map(r => fe[r]), xf = new Float64Array(cd.nS);
  for (let i = 0; i < cd.nS; i++) { let s = 0; for (let j = 0; j < cd.nS; j++) s += cd.Zinv[i * cd.nS + j] * fS[j]; xf[i] = s; }
  const fc = new Float64Array(12);
  cd.ad.forEach((r, j) => { let s = fe[r]; for (let q = 0; q < cd.nS; q++) s -= cd.KSa[q * cd.na + j] * xf[q]; fc[r] = s; });
  cd.sd.forEach((r, i) => fc[r] = cd.Ks[i] * xf[i]);
  return {fc, xf};
}
function condenseRecover(cd, xf, ulN) {                  // GDL de la barra a partir de los del nudo
  const ul = Float64Array.from(ulN);
  for (let i = 0; i < cd.nS; i++) {
    let s = xf[i]; for (let j = 0; j < cd.na; j++) s -= cd.XSa[i * cd.na + j] * ulN[cd.ad[j]];
    for (let j = 0; j < cd.nS; j++) s += cd.Xs[i * cd.nS + j] * ulN[cd.sd[j]];
    ul[cd.sd[i]] = s;
  }
  return ul;
}
function connSprings(conn) {                              // conn: {i:[s,w,t], j:[s,w,t]} con Infinity = rígido
  const sp = [];
  const ADD = [[5, 4, 3], [11, 10, 9]];
  [conn.i, conn.j].forEach((c, e) => c.forEach((ks, q) => { if (isFinite(ks)) sp.push({dof: ADD[e][q], ks}); }));
  return sp;
}
function normConn(m) {                                    // → [strong, weak, torsión] por extremo, N·mm/rad (Infinity rígido, 0 articulado)
  const one = (rel, spr, trel) => {
    let s = rel ? 0 : Infinity, w = rel ? 0 : Infinity, t = trel ? 0 : Infinity;
    if (spr) { if (spr.s != null && isFinite(spr.s) && spr.s >= 0) s = spr.s * 1e6; if (spr.w != null && isFinite(spr.w) && spr.w >= 0) w = spr.w * 1e6; if (spr.t != null && isFinite(spr.t) && spr.t >= 0) t = spr.t * 1e6; }
    return [s, w, t];
  };
  return {i: one(m.relI, m.sprI, m.trelI), j: one(m.relJ, m.sprJ, m.trelJ)};
}

/* ── solución de una barra a partir de los desplazamientos de sus nudos ── */
function elemSolve(mr, ek, el, ulN, Pax) {
  const cd = ek.cd; let ul = ulN, xf = null;
  if (cd) { xf = condenseLoad(cd, el.fe).xf; ul = condenseRecover(cd, xf, ulN); }
  const k = ek.k12, fe = el.fe, q = new Float64Array(12);
  for (let r = 0; r < 12; r++) { let s = 0; for (let c = 0; c < 12; c++) s += k[r * 12 + c] * ul[c]; q[r] = s - fe[r]; }
  if (cd) cd.sd.forEach((r, i) => { if (cd.Ks[i] === 0) q[r] = 0; });
  const stY = planeSolve(el.SY, ul[1], ul[5], ul[7], ul[11]), stZ = planeSolve(el.SZ, -ul[2], ul[4], -ul[8], ul[10]);
  if (!stY || !stZ) return null;
  return {ul, q, SY: el.SY, stY, SZ: el.SZ, stZ, ax: el.ax, EA: el.EA, eps0: el.eps0, Pax};
}
function solEval(sol, x) {
  const y = planeEval(sol.SY, sol.stY, x), z = planeEval(sol.SZ, sol.stZ, x), q = sol.q;
  const Wx = axW(sol.ax, x);
  return {N: -q[0] - Wx, Vy: y.Q, Vz: -z.Q, T: -q[3], Mz: y.M, My: z.M, vy: y.u, vz: -z.u, ux: sol.ul[0] + (-q[0] * x - axI(sol.ax, x)) / sol.EA + sol.eps0 * x};
}
function solPax(mr, sol) { return sol.q[0] + axW(sol.ax, mr.L / 2); }   // compresión +

/* ════════════ ANÁLISIS ════════════ */
function analyzeModel(st) {
  try { return analyzeModel0(st); } catch (e) { if (e && e.atlasMsg) return {ok: false, msgs: [], error: e.atlasMsg, badNode: e.badNode}; throw e; }
}
function analyzeModel0(st) {
  const out = {ok: false, msgs: []};
  const nN = st.nodes.length;
  if (nN < 2 || !st.members.length) { out.error = 'El modelo necesita al menos 2 nudos y 1 barra.'; return out; }
  const S0 = st.settings, E = S0.E, G = S0.G, Fy = S0.Fy, legacy = (st.ver || 1) < 2;
  const order = (S0.order === 2 || S0.order === '2') ? 2 : 1, shearDef = !!S0.shearDef, dam = !!S0.dam;
  const idx = new Map(); st.nodes.forEach((n, i) => idx.set(n.id, i));
  const nd = 6 * nN;
  const mrec = []; let weight = 0, totLen = 0;
  { const mn = [1e18, 1e18, 1e18], mx = [-1e18, -1e18, -1e18]; st.nodes.forEach(n => [n.x, n.y, n.z].forEach((v, k) => { mn[k] = Math.min(mn[k], v); mx[k] = Math.max(mx[k], v); })); out.lref = Math.max(1, Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2])); }
  for (const m of st.members) {
    const a = idx.get(m.i), b = idx.get(m.j);
    if (a == null || b == null || a === b) { out.msgs.push({t: 'warn', s: `Barra ${m.id}: nudos inválidos, se ignora.`}); continue; }
    const ni = st.nodes[a], nj = st.nodes[b];
    const d = [nj.x - ni.x, nj.y - ni.y, nj.z - ni.z], L = Math.hypot(d[0], d[1], d[2]);
    if (L < 1e-6) { out.msgs.push({t: 'warn', s: `Barra ${m.id}: longitud nula, se ignora.`}); continue; }
    const spec = getSecSpec(st, m.sec), P = secProps(spec);
    if (!P) { out.error = `Barra ${m.id}: la sección «${m.sec}» no existe.`; return out; }
    const fr = memberFrame(d, L, m.beta || 0), T = [fr.ex, fr.ey, fr.ez];
    const selfW = S0.selfWeight ? P.kg * GRAV : 0;
    const ml = buildMemberLoads(m, fr, L, P, legacy, selfW);
    ml.warns.forEach(s => out.msgs.push({t: 'warn', s}));
    const dofs = []; for (let q = 0; q < 6; q++) dofs.push(6 * a + q); for (let q = 0; q < 6; q++) dofs.push(6 * b + q);
    const conn = normConn(m);
    mrec.push({m, a, b, L, T, fr, P, spec, dofs, idx: mrec.length, conn, sp: connSprings(conn), lc: ml.lc, direct: ml.direct, selfW,
      EA: E * P.A, EIs: E * P.Is, EIw: E * P.Iw, GJ: G * P.J,
      gsY: (shearDef && !P.rigid && P.Aws > 0) ? 1 / (G * P.Aws) : 0, gsZ: (shearDef && !P.rigid && P.Aww > 0) ? 1 / (G * P.Aww) : 0, sol: new Array(NC).fill(null)});
    weight += P.kg * L / 1000; totLen += L;
  }
  // ── nudos: cargas, apoyos, resortes y asentamientos ──
  const Fnod = CASES.map(() => new Float64Array(nd)), upres = CASES.map(() => null), caseUsed = new Array(NC).fill(false);
  st.nodes.forEach((n, i) => {
    const p = n.P || {};
    CASES.forEach((key, c) => {
      let v = null;
      if (key === 'Hx') v = [(p.H || [])[0] || 0, 0, 0]; else if (key === 'Hy') v = [0, (p.H || [])[1] || 0, 0]; else if (key !== 'T' && key !== 'A') v = p[key];
      if (v) for (let q = 0; q < 3; q++) if (v[q]) { Fnod[c][6 * i + q] += v[q] * 1000; caseUsed[c] = true; }
      const mo = (n.Mo || {})[key];
      if (mo) for (let q = 0; q < 3; q++) if (mo[q]) { Fnod[c][6 * i + 3 + q] += mo[q] * 1e6; caseUsed[c] = true; }
    });
  });
  const fixed = new Uint8Array(nd), kspr = new Float64Array(nd), dspr = new Float64Array(nd);   // dspr: asentamiento (mm, rad) del apoyo
  const cA = CASES.indexOf('A');
  st.nodes.forEach((n, i) => {
    for (let q = 0; q < 6; q++) {
      const sd = ((n.sd || [])[q] || 0) * (q < 3 ? 1 : 1e-3);
      if (n.sup && n.sup[q]) fixed[6 * i + q] = 1; else if ((n.spr || [])[q] > 0) kspr[6 * i + q] = n.spr[q] * (q < 3 ? 1 : 1e6);
      if (sd && (fixed[6 * i + q] || kspr[6 * i + q])) { dspr[6 * i + q] = sd; caseUsed[cA] = true; }
    }
  });
  const nFixed = fixed.reduce((s, v) => s + v, 0) + kspr.reduce((s, v) => s + (v > 0 ? 1 : 0), 0);
  if (nFixed < 6) { out.error = 'Faltan apoyos: un modelo 3D necesita al menos 6 grados de libertad restringidos (3 traslaciones + 3 giros). Por ejemplo, un empotramiento, o articulaciones en varios nudos que impidan también el movimiento fuera del plano.'; return out; }
  // ── primer orden: matrices de barra (P = 0) ──
  for (const mr of mrec) {
    const k12 = elemK12(mr, 0, 1, 1); if (!k12) { out.error = `Barra ${mr.m.id}: no se pudo armar la matriz de rigidez.`; return out; }
    const cd = condenseSetup(k12, mr.sp); if (mr.sp.length && !cd) { out.error = `Barra ${mr.m.id}: unión de extremo inválida.`; return out; }
    mr.ek0 = {k12, cd, kc: cd ? cd.kc : k12};
    mr.lc.forEach((lc, c) => { if (!lcEmpty(lc) || mr.direct[c]) caseUsed[c] = true; });
  }
  const assemble = (kcOf) => {
    const Kf = new Float64Array(nd * nd);
    for (const mr of mrec) { const kg = kGlobal(kcOf(mr), mr.T); for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) Kf[mr.dofs[r] * nd + mr.dofs[c]] += kg[r * 12 + c]; }
    for (let i = 0; i < nd; i++) if (kspr[i] > 0) Kf[i * nd + i] += kspr[i];
    return Kf;
  };
  const freeIdx = []; for (let i = 0; i < nd; i++) if (!fixed[i]) freeIdx.push(i);
  const nf = freeIdx.length, isTrans = freeIdx.map(f => (f % 6) < 3);
  const factor = Kf => {
    const Kff = new Float64Array(nf * nf);
    for (let r = 0; r < nf; r++) { const ro = freeIdx[r] * nd; for (let c = 0; c <= r; c++) Kff[r * nf + c] = Kf[ro + freeIdx[c]]; }
    let dmax = 0; for (let r = 0; r < nf; r++) if (!isTrans[r]) dmax = Math.max(dmax, Kff[r * nf + r]);
    const zero = [];                                    // giros sin ninguna rigidez (articulación pura): se estabilizan; si tienen carga aplicada es un mecanismo
    for (let i = 0; i < nN; i++) for (let q = 3; q < 6; q++) { const f = freeIdx.indexOf(6 * i + q); if (f >= 0) { if (Kff[f * nf + f] <= 1e-9 * dmax) zero.push(f); Kff[f * nf + f] += 1.0; } }
    const bad = choleskyLower(Kff, nf, isTrans); return {Kff, bad, zero};
  };
  const badMsg = (bad, extra) => {
    const gd = freeIdx[bad], nid = st.nodes[Math.floor(gd / 6)].id, dn = ['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'][gd % 6];
    return {error: `Modelo inestable (mecanismo)${extra || ''} cerca del nudo ${nid}, grado de libertad ${dn}. Revisá apoyos, articulaciones y barras que conectan ese nudo.`, badNode: nid};
  };
  // vector de cargas global de un conjunto de cargas de barra + nudos (Fn) y solución
  const solveSystem = (Kf, fac, F, up) => {
    const bf = new Float64Array(nf);
    for (let r = 0; r < nf; r++) bf[r] = F[freeIdx[r]];
    if (fac.zero && fac.zero.length) {
      let bmax = 0; for (let r = 0; r < nf; r++) bmax = Math.max(bmax, Math.abs(bf[r]));
      for (const z of fac.zero) if (Math.abs(bf[z]) > 1e-6 * bmax + 1e-3) {
        const gd = freeIdx[z], nid = st.nodes[Math.floor(gd / 6)].id, dn = ['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'][gd % 6];
        throw {atlasMsg: `Modelo inestable (mecanismo): hay un momento aplicado en el nudo ${nid} (${dn}) y ninguna barra le opone rigidez a ese giro (articulaciones o torsión liberada). Revisá las uniones de las barras que llegan a ese nudo.`, badNode: nid};
      }
    }
    if (up) for (let r = 0; r < nf; r++) { const ro = freeIdx[r] * nd; let s = 0; for (let j = 0; j < nd; j++) if (fixed[j] && up[j]) s += Kf[ro + j] * up[j]; bf[r] -= s; }
    for (let r = 0; r < nf; r++) if (kspr[freeIdx[r]] > 0 && up) bf[r] += kspr[freeIdx[r]] * up[freeIdx[r]];
    const x = cholSolve(fac.Kff, nf, bf), u = new Float64Array(nd);
    // Verificación de equilibrio: la estabilización (+1 N·mm/rad en cada giro) solo es inocua si no hay carga sobre un movimiento de cuerpo rígido.
    // El residuo del sistema sin estabilizar es 1·x_giro: si no es despreciable frente a las cargas, la estructura es un mecanismo (p. ej. barra articulada en voladizo).
    { let sf = 0, sm = 0; for (let r = 0; r < nf; r++) { const a = Math.abs(bf[r]); if (isTrans[r]) sf = Math.max(sf, a); else sm = Math.max(sm, a); }
      const scale = Math.max(sf * out.lref, sm, 1);
      for (let r = 0; r < nf; r++) if (!isTrans[r] && Math.abs(x[r]) > 1e-6 * scale + 1e-3) {
        const gd = freeIdx[r], nid = st.nodes[Math.floor(gd / 6)].id, dn = ['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'][gd % 6];
        throw {atlasMsg: `Modelo inestable (mecanismo): hay una parte de la estructura que se mueve como cuerpo rígido bajo las cargas (giro sin rigidez en el nudo ${nid}, ${dn}). Suele ser una barra articulada en voladizo o dos articulaciones seguidas sin arriostramiento. Revisá las uniones de las barras que llegan a ese nudo.`, badNode: nid};
      } }
    for (let r = 0; r < nf; r++) u[freeIdx[r]] = x[r];
    if (up) for (let j = 0; j < nd; j++) if (fixed[j]) u[j] = up[j];
    const Rr = new Float64Array(nd);
    for (let i = 0; i < nd; i++) {
      if (fixed[i]) { let s = 0; const ro = i * nd; for (let j = 0; j < nd; j++) { const kv = Kf[ro + j]; if (kv) s += kv * u[j]; } Rr[i] = s - F[i]; }
      else if (kspr[i] > 0) Rr[i] = -kspr[i] * (u[i] - (up ? up[i] : 0));
    }
    return {u, Rr};
  };
  const memberUl = (mr, u) => { const ug = new Float64Array(12); for (let r = 0; r < 12; r++) ug[r] = u[mr.dofs[r]]; return mulT12(mr.T, ug); };
  const Kf0 = assemble(mr => mr.ek0.kc), fac0 = factor(Kf0);
  if (fac0.bad >= 0) { Object.assign(out, badMsg(fac0.bad)); return out; }
  // ── casos de carga de primer orden ──
  const F = [], U = [], Rr = [];
  CASES.forEach((cn, c) => {
    const Fc = Float64Array.from(Fnod[c]);
    if (!caseUsed[c]) { F.push(Fc); U.push(new Float64Array(nd)); Rr.push(new Float64Array(nd)); return; }
    for (const mr of mrec) {
      const el = elemLoads(mr, 0, mr.lc[c], 1, 1); el.ax = mr.lc[c].ax; el.EA = mr.EA; el.eps0 = mr.lc[c].eps0; mr.sol[c] = {el};
      const fc = mr.ek0.cd ? condenseLoad(mr.ek0.cd, el.fe).fc : el.fe, fg = mulT12t(mr.T, fc);
      for (let r = 0; r < 12; r++) Fc[mr.dofs[r]] += fg[r];
      if (mr.direct[c]) { const dg = mulT12t(mr.T, mr.direct[c]); for (let r = 0; r < 12; r++) Fc[mr.dofs[r]] += dg[r]; }
    }
    let up = null; if (c === cA && dspr.some(v => v)) up = dspr;
    const sys = solveSystem(Kf0, fac0, Fc, up);
    F.push(Fc); U.push(sys.u); Rr.push(sys.Rr);
    for (const mr of mrec) { const el = mr.sol[c].el; mr.sol[c] = elemSolve(mr, mr.ek0, el, memberUl(mr, sys.u), 0); }
  });
  // equilibrio global por caso
  const eq = CASES.map((cn, ci) => {
    const s = [0, 0, 0], r = [0, 0, 0];
    for (let i = 0; i < nN; i++) for (let c = 0; c < 3; c++) { s[c] += F[ci][6 * i + c]; r[c] += Rr[ci][6 * i + c]; }
    return {applied: s.map(v => v / 1000), react: r.map(v => v / 1000), err: Math.max(...s.map((v, c) => Math.abs(v + r[c]))) / 1000};
  });
  const fixedR = Uint8Array.from(fixed, (v, i) => (v || kspr[i] > 0) ? 1 : 0);   // GDL con reacción (apoyo rígido o elástico)
  Object.assign(out, {ok: true, nodes: st.nodes, idx, mrec, U, Rr, F, fixed: fixedR, eq, weight, totLen, nd, E, G, Fy, order, shearDef, dam, kspr});
  out.reacNodes = []; st.nodes.forEach((n, i) => { for (let q = 0; q < 6; q++) if (fixed[6 * i + q] || kspr[6 * i + q] > 0) { out.reacNodes.push(i); break; } });
  out.combos = st.combos;
  // ── segundo orden: una solución por combinación ──
  if (order >= 2) {
    out.so = {combos: []}; out.soMap = new Map();
    for (let ci = 0; ci < st.combos.length; ci++) {
      const cb = st.combos[ci], f = cb.f.slice(0, NC); while (f.length < NC) f.push(0);
      const r = solveSecondOrder(f, cb.n);
      if (r.error) { out.ok = false; out.error = r.error; return out; }
      out.so.combos.push(r); out.soMap.set(cb.f, ci);
    }
  }
  return out;

  function solveSecondOrder(f, name) {
    const combs = mrec.map(mr => sumLC(mr.lc, f));
    const Fn = new Float64Array(nd); let up = null;
    for (let c = 0; c < NC; c++) { if (!f[c]) continue; for (let i = 0; i < nd; i++) Fn[i] += f[c] * Fnod[c][i]; if (c === cA && dspr.some(v => v)) { up = up || new Float64Array(nd); for (let i = 0; i < nd; i++) up[i] += f[c] * dspr[i]; } }
    for (const mr of mrec) for (let c = 0; c < NC; c++) if (f[c] && mr.direct[c]) { const dg = mulT12t(mr.T, mr.direct[c]); for (let r = 0; r < 12; r++) Fn[mr.dofs[r]] += f[c] * dg[r]; }
    let Pax = mrec.map(mr => { let p = 0; for (let c = 0; c < NC; c++) if (f[c] && mr.sol[c]) p += f[c] * solPax(mr, mr.sol[c]); return p; });
    let u = null, Rrr = null, sols = null, it = 0, conv = false, ekList = null;
    for (it = 1; it <= 40; it++) {
      const fEI = mrec.map((mr, i) => { if (!dam || mr.P.rigid) return 1; const r = Math.max(0, Pax[i]) / (Fy * mr.P.A); return 0.8 * (r <= 0.5 ? 1 : 4 * r * (1 - r)); });
      const fEA = dam ? 0.8 : 1;
      ekList = []; const Fc = Float64Array.from(Fn);
      for (let i = 0; i < mrec.length; i++) {
        const mr = mrec[i], k12 = elemK12(mr, Pax[i], fEA, fEI[i]), el = k12 && elemLoads(mr, Pax[i], combs[i], fEA, fEI[i]);
        if (!k12 || !el) return {error: `Segundo orden: la barra ${mr.m.id} supera su carga crítica en la combinación «${name}» (el modelo es inestable bajo esa carga).`};
        el.ax = combs[i].ax; el.EA = mr.EA * fEA; el.eps0 = combs[i].eps0;
        const cd = condenseSetup(k12, mr.sp);
        if (cd && !isPDsmall(cd.Z, cd.nS)) return {error: `Segundo orden: la barra ${mr.m.id} supera su carga crítica de pandeo con sus extremos articulados en la combinación «${name}».`};
        const fc = cd ? condenseLoad(cd, el.fe).fc : el.fe, fg = mulT12t(mr.T, fc);
        for (let r = 0; r < 12; r++) Fc[mr.dofs[r]] += fg[r];
        ekList.push({k12, cd, kc: cd ? cd.kc : k12, el});
      }
      const Kf = assemble(mr => ekList[mr.idx].kc), fac = factor(Kf);
      if (fac.bad >= 0) return {error: `Segundo orden: la combinación «${name}» supera la carga crítica de la estructura (inestable por P-Δ).`};
      const sys = solveSystem(Kf, fac, Fc, up); u = sys.u; Rrr = sys.Rr;
      sols = mrec.map((mr, i) => elemSolve(mr, ekList[i], ekList[i].el, memberUl(mr, u), Pax[i]));
      if (sols.some(s => !s)) return {error: `Segundo orden: inestabilidad en la combinación «${name}».`};
      const Pn = sols.map((s, i) => solPax(mrec[i], s));
      let dm = 0, pm = 1; Pn.forEach((p, i) => { dm = Math.max(dm, Math.abs(p - Pax[i])); pm = Math.max(pm, Math.abs(p)); });
      Pax = Pn; if (dm <= 1e-9 * pm + 1e-6) { conv = true; break; }
    }
    if (!conv) out.msgs.push({t: 'warn', s: `Segundo orden: la combinación «${name}» no convergió en 40 iteraciones (carga cercana a la crítica).`});
    return {U: u, Rr: Rrr, sols, iters: it, conv};
  }
}

/* ── combinación lineal y consulta de resultados ── */
function comboVec(fct, arrs) { const n = arrs[0].length, o = new Float64Array(n); for (let c = 0; c < arrs.length && c < fct.length; c++) { const f = fct[c]; if (!f) continue; const a = arrs[c]; for (let i = 0; i < n; i++) o[i] += f * a[i]; } return o; }
function soIdx(R, fct) { if (!R.soMap) return -1; const k = R.soMap.get(fct); return k === undefined ? -1 : k; }
function nodeDisp(R, ni, fct) {                         // desplazamientos del nudo (mm, rad) para una combinación
  const k = soIdx(R, fct), o = [0, 0, 0, 0, 0, 0];
  if (k >= 0) { for (let q = 0; q < 6; q++) o[q] = R.so.combos[k].U[6 * ni + q]; return o; }
  for (let c = 0; c < fct.length && c < NC; c++) { const f = fct[c]; if (!f) continue; for (let q = 0; q < 6; q++) o[q] += f * R.U[c][6 * ni + q]; } return o;
}
function nodeReac(R, ni, fct) {                          // reacciones (kN, kN·m)
  const k = soIdx(R, fct), o = [0, 0, 0, 0, 0, 0];
  if (k >= 0) { for (let q = 0; q < 6; q++) o[q] = R.so.combos[k].Rr[6 * ni + q]; }
  else for (let c = 0; c < fct.length && c < NC; c++) { const f = fct[c]; if (!f) continue; for (let q = 0; q < 6; q++) o[q] += f * R.Rr[c][6 * ni + q]; }
  return o.map((v, q) => v / (q < 3 ? 1000 : 1e6));
}
function solsFor(R, mr, fct) {                           // → [{f, sol}] que componen la combinación en la barra
  const k = soIdx(R, fct); if (k >= 0) return [{f: 1, sol: R.so.combos[k].sols[mr.idx]}];
  const o = []; for (let c = 0; c < fct.length && c < NC; c++) if (fct[c] && mr.sol[c]) o.push({f: fct[c], sol: mr.sol[c]}); return o;
}
function memberStations(R, mr, fct, ns) {
  ns = ns || 21; const L = mr.L, src = solsFor(R, mr, fct);
  const xs = []; for (let i = 0; i < ns; i++) xs.push(L * i / (ns - 1));
  const tol = 1e-7 * L;
  for (const {sol} of src) for (const S of [sol.SY, sol.SZ]) for (const p of S.real) {
    const add = x => { if (x > tol && x < L - tol) xs.push(x); };
    if (p.t === 'U') { add(p.a); add(p.b); } else { add(p.a); add(p.a - 2 * tol); }
  }
  for (const {sol} of src) for (const p of sol.ax) { if (p.a > tol && p.a < L - tol) xs.push(p.a); if (p.t === 'U' && p.b > tol && p.b < L - tol) xs.push(p.b); }
  xs.sort((a, b) => a - b);
  const ux = [xs[0]]; for (let i = 1; i < xs.length; i++) if (xs[i] - ux[ux.length - 1] > tol * 0.5) ux.push(xs[i]);
  const Qy = x => { let s = 0; for (const {f, sol} of src) s += f * planeEval(sol.SY, sol.stY, x).Q; return s; };
  const Qz = x => { let s = 0; for (const {f, sol} of src) s += f * planeEval(sol.SZ, sol.stZ, x).Q; return s; };
  const extra = [];
  for (const Qf of [Qy, Qz]) {                           // puntos de cortante nulo (máximos de momento)
    let xa = ux[0], qa = Qf(xa);
    for (let i = 1; i < ux.length; i++) {
      const xb = ux[i], qb = Qf(xb);
      if (qa * qb < 0 && xb - xa > 1e-5 * L) { let lo = xa, hi = xb, ql = qa; for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2, qm = Qf(mid); if (ql * qm <= 0) hi = mid; else { lo = mid; ql = qm; } } extra.push((lo + hi) / 2); }
      xa = xb; qa = qb;
    }
  }
  const all = ux.concat(extra).sort((a, b) => a - b);
  const q = new Float64Array(12), ul = new Float64Array(12);
  for (const {f, sol} of src) for (let i = 0; i < 12; i++) { q[i] += f * sol.q[i]; ul[i] += f * sol.ul[i]; }
  const Sx = {x: all, N: [], Vy: [], Vz: [], T: [], Mz: [], My: [], vy: [], vz: [], ux: [], q, ul, w: [0, 0, 0]};
  const keys = ['N', 'Vy', 'Vz', 'T', 'Mz', 'My', 'vy', 'vz', 'ux'];
  for (const x of all) {
    const acc = {N: 0, Vy: 0, Vz: 0, T: 0, Mz: 0, My: 0, vy: 0, vz: 0, ux: 0};
    for (const {f, sol} of src) { const e = solEval(sol, x); for (const k of keys) acc[k] += f * e[k]; }
    for (const k of keys) Sx[k].push(acc[k]);
  }
  return Sx;
}
const mxabs = a => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
