// js/nucleo/diseno.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   VERIFICACIÓN DE RESISTENCIA  ·  CIRSOC 301-2005 (= AISC-LRFD 1999)
   · compresión con pandeo flexional / torsional / flexo-torsional y pandeo local (factor Q)
   · flexión con pandeo lateral-torsional (Cb del diagrama de momentos real) y pandeo local de ala y alma
   · corte con pandeo del alma (Cv) · interacción H1-1a/b sección por sección
   · vigas armadas monosimétricas o de alma esbelta: AISC 360-05 §F4-F5 (el CIRSOC 301 las trata en el Ap. G de LRFD-99)
   Unidades: mm · N · MPa
   ════════════════════════════════════════════════════════════════════════════ */
const PHI_C = 0.85, PHI_T = 0.9, PHI_B = 0.9, PHI_V = 0.9;
const sq = x => x * x;
const clsOf = (lam, lp, lr) => lam <= lp ? 'compacta' : lam <= lr ? 'no compacta' : 'esbelta';

/* ───────────── pandeo local en compresión axil (factor Q) ───────────── */
function kcOf(P) {
  const w = P.lb && P.lb.web; if (!w) return 0.763;
  return Math.min(0.763, Math.max(0.35, 4 / Math.sqrt(w.b / w.t)));
}
function lrComp(el, lb, E, Fy, kc) {                     // λr de compresión axil, forma E
  const r = Math.sqrt(E / Fy);
  if (el.k === 'out') return lb.fam === 'ANG' ? 0.45 * r : lb.welded ? 0.64 * Math.sqrt(kc) * r : 0.56 * r;
  if (el.k === 'plate' || el.hss) return 1.40 * r;
  return 1.49 * r;
}
function qsOut(lam, lb, E, Fy, kc) {                     // Qs de elementos no rigidizados
  const x = lam * Math.sqrt(Fy / E);
  if (lb.fam === 'ANG') return x <= 0.45 ? 1 : x < 0.91 ? 1.340 - 0.76 * x : 0.53 / (x * x);
  if (lb.welded) { const y = x / Math.sqrt(kc); return y <= 0.64 ? 1 : y <= 1.17 ? 1.415 - 0.65 * y : 0.90 / (y * y); }
  return x <= 0.56 ? 1 : x <= 1.03 ? 1.415 - 0.74 * x : 0.69 / (x * x);
}
function beStiff(el, E, f) {                             // ancho efectivo de un elemento rigidizado comprimido (≤ b)
  const r = Math.sqrt(E / f), lam = el.b / el.t, wall = el.hss || el.k === 'plate', lim = wall ? 1.40 : 1.49, c = wall ? 0.34 : 0.38;
  if (lam <= lim * r) return el.b;
  return Math.min(el.b, 1.91 * el.t * r * (1 - c / lam * r));
}
function compLocal(P, E, Fy) {
  const lb = P.lb || {fam: 'GEN'}, kc = kcOf(P), loc = {Qs: 1, stiff: [], elems: [], chs: null, kc};
  if (lb.fam === 'CHS') {
    const x = lb.D / lb.t, lim = 0.11 * E / Fy;
    loc.chs = x <= lim ? 1 : x < 0.45 * E / Fy ? 0.038 * E / (Fy * x) + 2 / 3 : 0.038 * E / (Fy * 0.45 * E / Fy) + 2 / 3;
    loc.elems.push({n: 'pared del caño', lam: x, lr: lim, cls: x <= lim ? 'no esbelta' : 'esbelta'});
    return loc;
  }
  const out = (lb.top || []).concat(lb.bot || []).concat(lb.legs || []);
  const seen = new Set();
  for (const el of out) {
    const key = el.n + '|' + el.b + '|' + el.t; if (seen.has(key)) continue; seen.add(key);
    const lam = el.b / el.t, lr = lrComp(el, lb, E, Fy, kc);
    if (el.k === 'out') { loc.Qs = Math.min(loc.Qs, qsOut(lam, lb, E, Fy, kc)); loc.elems.push({n: el.n, lam, lr, cls: lam <= lr ? 'no esbelta' : 'esbelta'}); }
    else { loc.stiff.push({el, mult: 1}); loc.elems.push({n: el.n, lam, lr, cls: lam <= lr ? 'no esbelta' : 'esbelta'}); }
  }
  if (lb.web) { const el = lb.web, lam = el.b / el.t, lr = lrComp({k: 'stiff', hss: el.hss}, lb, E, Fy, kc); loc.stiff.push({el: {b: el.b, t: el.t, hss: el.hss, k: 'stiff'}, mult: lb.nWeb || 1}); loc.elems.push({n: 'alma', lam, lr, cls: lam <= lr ? 'no esbelta' : 'esbelta'}); }
  return loc;
}
function colFcrQ(Q, Fe, Fy) { const lc2 = Fy / Fe; return Q * lc2 <= 2.25 ? Q * Math.pow(0.658, Q * lc2) * Fy : 0.877 / lc2 * Fy; }
function solveQ(loc, Fe, E, Fy, A) {
  if (loc.chs != null) return {Q: loc.chs, Qs: 1, Qa: loc.chs, Fcr: colFcrQ(loc.chs, Fe, Fy)};
  let Qa = 1, Q = loc.Qs, Fcr = colFcrQ(Q, Fe, Fy);
  if (!loc.stiff.length) return {Q, Qs: loc.Qs, Qa: 1, Fcr};
  for (let it = 0; it < 80; it++) {
    const f = Math.min(Fy, Fcr); let Al = 0;
    for (const s of loc.stiff) Al += s.mult * (s.el.b - beStiff(s.el, E, f)) * s.el.t;
    const Qa2 = Math.max(0.05, 1 - Al / A), Q2 = loc.Qs * Qa2, F2 = colFcrQ(Q2, Fe, Fy);
    const done = Math.abs(F2 - Fcr) < 1e-10 * Fy; Qa = Qa2; Q = Q2; Fcr = F2; if (done) break;
  }
  return {Q, Qs: loc.Qs, Qa, Fcr};
}

/* ───────────── compresión ───────────── */
function compCap(P, E, G, Fy, kls, klw) {
  const A = P.A, out = {};
  const loc = compLocal(P, E, Fy); out.loc = loc;
  if (P.type === 'ANG') {
    const Fe = PI * PI * E / sq(Math.max(kls, klw) / P.rmin), q = solveQ(loc, Fe, E, Fy, A);
    Object.assign(out, q, {Fe, lam: Math.max(kls, klw) / P.rmin, phiPc: PHI_C * A * q.Fcr}); return out;
  }
  const rs = Math.sqrt(P.Is / A), rw = Math.sqrt(P.Iw / A);
  const Fe_w = PI * PI * E / sq(klw / rw), Fe_s = PI * PI * E / sq(kls / rs);
  const x0 = P.x0 || 0, Cw = P.Cw || 0, r02 = x0 * x0 + (P.Is + P.Iw) / A, H = 1 - x0 * x0 / r02;
  const Fe_z = (PI * PI * E * Cw / (klw * klw) + G * P.J) / (A * r02);
  const Fey = P.ftAx === 'w' ? Fe_w : Fe_s;                                   // el flexional que se acopla con la torsión es el del eje de simetría
  const Fe_ft = (Fey + Fe_z) / (2 * H) * (1 - Math.sqrt(Math.max(0, 1 - 4 * Fey * Fe_z * H / sq(Fey + Fe_z))));
  const Fe = Math.min(P.ftAx === 'w' ? Fe_s : Fe_w, Fe_ft);
  const q = solveQ(loc, Fe, E, Fy, A);
  Object.assign(out, q, {Fe, Fe_s, Fe_w, Fe_z, Fe_ft, lam: Math.max(kls / rs, klw / rw), phiPc: PHI_C * A * q.Fcr});
  return out;
}

/* ───────────── flexión ───────────── */
function effModulus(I, A, cMax, Aloss, yf) {             // módulo elástico efectivo con una pérdida de área Aloss a la cota yf (>0 hacia la fibra comprimida)
  const Ar = A - Aloss, yp = -Aloss * yf / Ar, Ie = I - Aloss * yf * yf - Ar * yp * yp;
  return {Sc: Ie / (cMax - yp), St: Ie / (cMax + yp)};
}
// Aloss total de los elementos rigidizados de la pared comprimida para tensión f
function lossWalls(els, E, f) { let Al = 0; for (const el of els) Al += (el.b - beStiff(el, E, f)) * el.t; return Al; }

/* Motor de flexión de eje fuerte. Devuelve {Mp, Lp, Lr, fn(Cb, pr) → {Mn, gov}, info} */
function strongEngine(P, E, G, Fy, Lb, sgn) {
  const lb = P.lb || {fam: 'GEN'}, r = Math.sqrt(E / Fy), A = P.A, kc = kcOf(P), top = sgn >= 0;
  const Mp = Fy * P.Zs, Sxc = top ? P.SsT : P.SsB, Sxt = top ? P.SsB : P.SsT;
  const flEls = (top ? lb.top : lb.bot) || [];
  const info = [];
  const mkInfo = (n, lam, lp, lrr) => info.push({n, lam, lp, lr: lrr, cls: clsOf(lam, lp, lrr)});
  /* ── perfiles abiertos (I, canal, I armada) ── */
  if (P.ltb === 'open') {
    const web = lb.web, lamW = web.b / web.t, slenderWeb = lamW > 5.70 * r;
    const useF45 = P.mono || slenderWeb;
    if (!useF45) {                                           // LRFD-99 cap. F (doble simetría respecto del eje de flexión)
      const ry = Math.sqrt(P.Iw / A), Fr = lb.welded ? 114 : 69, FL = Fy - Fr, Mr = FL * Sxc, Lp = 1.76 * ry * r;
      const X1 = PI / Sxc * Math.sqrt(E * G * P.J * A / 2), X2 = 4 * P.Cw / P.Iw * sq(Sxc / (G * P.J));
      const Lr = ry * X1 / FL * Math.sqrt(1 + Math.sqrt(1 + X2 * FL * FL));
      const Mcr0 = PI / Lb * Math.sqrt(E * P.Iw * G * P.J + sq(PI * E / Lb) * P.Iw * P.Cw);
      // pandeo local de ala(s)
      const flb = [];
      for (const el of flEls) {
        const lam = el.b / el.t;
        if (el.k === 'out') {
          const lp = 0.38 * r, lrr = lb.welded ? 0.95 * Math.sqrt(kc * E / FL) : 0.83 * Math.sqrt(E / FL); mkInfo(el.n, lam, lp, lrr);
          flb.push(lam <= lp ? {Mn: Mp} : lam <= lrr ? {Mn: Mp - (Mp - Mr) * (lam - lp) / (lrr - lp)} : {Mn: Sxc * (lb.welded ? 0.9 * E * kc : 0.69 * E) / (lam * lam)});
        } else {                                             // platabanda entre soldaduras
          const lp = 1.12 * r, lrr = 1.40 * r; mkInfo(el.n, lam, lp, lrr);
          if (lam <= lp) flb.push({Mn: Mp});
          else if (lam <= lrr) flb.push({Mn: Mp - (Mp - Fy * Sxc) * (lam - lp) / (lrr - lp)});
          else { const yf = top ? el.y - P.yc : P.yc - el.y, Al = (el.b - beStiff(el, E, Fy)) * el.t; const es = effModulus(P.Is, A, top ? P.h - P.yc : P.yc, Al, yf); flb.push({Mn: Fy * Math.min(es.Sc, es.St)}); }
        }
      }
      mkInfo('alma', lamW, 3.76 * r, 5.70 * r);
      const fn = (Cb, pr) => {
        let Mn = Mp, gov = 'plastificación';
        if (Lb > Lp) {
          const v = Lb <= Lr ? Cb * (Mp - (Mp - Mr) * (Lb - Lp) / (Lr - Lp)) : Cb * Mcr0;
          if (v < Mn) { Mn = v; gov = 'PLT'; }
        }
        for (const f of flb) if (f.Mn < Mn) { Mn = f.Mn; gov = 'pandeo local ala'; }
        const lpw = pr <= 0.125 ? 3.76 * r * (1 - 2.75 * pr) : Math.max(1.12 * r * (2.33 - pr), 1.49 * r), lrw = 5.70 * r * (1 - 0.74 * pr);
        if (lamW > lpw) {
          const v = lamW <= lrw ? Mp - (Mp - Fy * Sxc) * (lamW - lpw) / (lrw - lpw) : Fy * Sxc * sq(lrw / lamW);
          if (v < Mn) { Mn = v; gov = 'pandeo local alma'; }
        }
        return {Mn, gov};
      };
      return {Mp, Lp, Lr, Mr, fn, info, eng: 'F1'};
    }
    /* ── AISC 360-05 §F4-F5 (monosimétricas / alma esbelta) ── */
    const tfc = (top ? P.tfTop : P.tfBot) || P.tf, hfc = top ? P.h - P.yc : P.yc, hc = 2 * (hfc - tfc);
    const hp = 2 * (top ? (P.h - tfc) - (P.yp || P.h / 2) : (P.yp || P.h / 2) - tfc);
    let Afc = 0, Iyc = 0, bfc = 0, lamF = 0, lamFel = null;
    for (const el of flEls) { const w = el.k === 'out' ? 2 * el.b : el.b; Afc += w * el.t; Iyc += el.t * w ** 3 / 12; bfc = Math.max(bfc, w); if (el.k === 'out') { lamF = Math.max(lamF, el.b / el.t); lamFel = el; } }
    const rt = Math.sqrt(Iyc / (Afc + hc * P.tw / 6)), ho = P.hf || (P.h - tfc);
    const Myc = Fy * Sxc, Myt = Fy * Sxt, lamw = hc / P.tw, lamrw = 5.70 * r;
    const lpf = 0.38 * r;
    mkInfo('alma', lamw, 3.76 * r, lamrw);
    if (lamFel) mkInfo(lamFel.n, lamF, lpf, 0.95 * Math.sqrt(kc * E / (0.7 * Fy)));
    flEls.filter(e => e.k === 'plate').forEach(e => mkInfo(e.n, e.b / e.t, 1.12 * r, 1.40 * r));
    if (lamw <= lamrw) {                                     // F4
      const lpw = Math.min((hc / hp) * r / sq(0.54 * Mp / Myc - 0.09), lamrw);
      const ratio = (My) => lamw <= lpw ? Mp / My : Math.min(Mp / My, Mp / My - (Mp / My - 1) * (lamw - lpw) / (lamrw - lpw));
      const Rpc = ratio(Myc), Rpt = ratio(Myt);
      const FL = Sxt / Sxc >= 0.7 ? 0.7 * Fy : Math.max(Fy * Sxt / Sxc, 0.5 * Fy);
      const Lp = 1.1 * rt * r, a = P.J / (Sxc * ho), Lr = 1.95 * rt * E / FL * Math.sqrt(a + Math.sqrt(a * a + 6.76 * sq(FL / E)));
      const lrf = 0.95 * Math.sqrt(kc * E / FL), Mcfy = Rpc * Myc;
      const plateLoss = [];
      for (const el of flEls) if (el.k === 'plate' && el.b / el.t > 1.40 * r) { const yf = top ? el.y - P.yc : P.yc - el.y; const Al = (el.b - beStiff(el, E, Fy)) * el.t; const es = effModulus(P.Is, A, top ? P.h - P.yc : P.yc, Al, yf); plateLoss.push(Fy * Math.min(es.Sc, es.St)); }
      const fn = (Cb, pr) => {
        let Mn = Mcfy, gov = 'plastificación';
        if (Lb > Lp) {
          const v = Lb <= Lr ? Cb * (Mcfy - (Mcfy - FL * Sxc) * (Lb - Lp) / (Lr - Lp)) : Math.min(Mcfy, Cb * sq(PI) * E / sq(Lb / rt) * Math.sqrt(1 + 0.078 * a * sq(Lb / rt)) * Sxc);
          if (v < Mn) { Mn = Math.min(v, Mcfy); gov = 'PLT'; }
        }
        if (lamF > lpf) { const v = lamF <= lrf ? Mcfy - (Mcfy - FL * Sxc) * (lamF - lpf) / (lrf - lpf) : 0.9 * E * kc * Sxc / (lamF * lamF); if (v < Mn) { Mn = v; gov = 'pandeo local ala'; } }
        for (const v of plateLoss) if (v < Mn) { Mn = v; gov = 'pandeo local platabanda'; }
        if (Sxt < Sxc) { const v = Rpt * Myt; if (v < Mn) { Mn = v; gov = 'fluencia ala traccionada'; } }
        return {Mn, gov};
      };
      return {Mp, Lp, Lr, Mr: FL * Sxc, fn, info, eng: 'F4'};
    }
    const aw = Math.min(10, hc * P.tw / (bfc * tfc)), Rpg = Math.min(1, 1 - aw / (1200 + 300 * aw) * (lamw - 5.7 * r));
    const Lp = 1.1 * rt * r, Lr = PI * rt * Math.sqrt(E / (0.7 * Fy)), lrf = 0.95 * Math.sqrt(kc * E / (0.7 * Fy));
    const fn = (Cb, pr) => {
      let Fcr = Fy, gov = 'fluencia';
      if (Lb > Lp) { const v = Lb <= Lr ? Cb * Fy * (1 - 0.3 * (Lb - Lp) / (Lr - Lp)) : Cb * sq(PI) * E / sq(Lb / rt); if (v < Fcr) { Fcr = Math.min(v, Fy); gov = 'PLT'; } }
      if (lamF > lpf) { const v = lamF <= lrf ? Fy * (1 - 0.3 * (lamF - lpf) / (lrf - lpf)) : 0.9 * E * kc / (lamF * lamF); if (v < Fcr) { Fcr = v; gov = 'pandeo local ala'; } }
      let Mn = Rpg * Fcr * Sxc; if (Rpg < 1 && gov === 'fluencia') gov = 'alma esbelta (Rpg)';
      if (Sxt < Sxc && Fy * Sxt < Mn) { Mn = Fy * Sxt; gov = 'fluencia ala traccionada'; }
      return {Mn, gov};
    };
    return {Mp, Lp, Lr, Mr: Fy * Sxc, fn, info, eng: 'F5', Rpg};
  }
  /* ── secciones cerradas (cajón armado, tubo rectangular) ── */
  if (P.ltb === 'closed' && (lb.fam === 'RHS' || lb.fam === 'BOX')) {
    const ry = Math.sqrt(P.Iw / A), Mr = Fy * Sxc, JA = Math.sqrt(P.J * A);
    const Lp = 0.13 * E * ry * JA / Mp, Lr = 2 * E * ry * JA / Mr;
    const fl = flEls[0], lamF = fl.b / fl.t, lamW = lb.web.b / lb.web.t, lpf = 1.12 * r, lrf = 1.40 * r, lpw = 3.76 * r, lrw = 5.70 * r;
    mkInfo('ala (pared comprimida)', lamF, lpf, lrf); mkInfo('alma', lamW, lpw, lrw);
    let Se = null;
    if (lamF > lrf) { const Al = (fl.b - beStiff(fl, E, Fy)) * fl.t, yf = top ? fl.y - P.yc : P.yc - fl.y; Se = effModulus(P.Is, A, top ? P.h - P.yc : P.yc, Al, yf); }
    const fn = (Cb, pr) => {
      let Mn = Mp, gov = 'plastificación';
      if (Lb > Lp) { const v = Lb <= Lr ? Cb * (Mp - (Mp - Mr) * (Lb - Lp) / (Lr - Lp)) : Cb * 2 * E * JA / (Lb / ry); if (v < Mn) { Mn = v; gov = 'PLT'; } }
      if (lamF > lpf) { const v = lamF <= lrf ? Mp - (Mp - Mr) * (lamF - lpf) / (lrf - lpf) : Fy * Math.min(Se.Sc, Se.St); if (v < Mn) { Mn = v; gov = 'pandeo local ala'; } }
      if (lamW > lpw) { const v = lamW <= lrw ? Mp - (Mp - Mr) * (lamW - lpw) / (lrw - lpw) : Mr * sq(lrw / lamW); if (v < Mn) { Mn = v; gov = lamW <= lrw ? 'pandeo local alma' : 'alma esbelta (aprox. conservadora)'; } }
      return {Mn, gov};
    };
    return {Mp, Lp, Lr, Mr, fn, info, eng: 'HSS'};
  }
  if (lb.fam === 'CHS') {
    const x = lb.D / lb.t, lp = 0.07 * E / Fy, lrr = 0.31 * E / Fy, lmax = 0.45 * E / Fy; mkInfo('pared del caño', x, lp, lrr);
    const S = P.Ss; let Mn = Mp, gov = 'plastificación';
    if (x > lp) { Mn = x <= lrr ? Math.min(Mp, (0.0207 * E / x + Fy) * S) : 0.33 * E / x * S; gov = 'pandeo local'; }
    return {Mp, Lp: Infinity, Lr: Infinity, Mr: Fy * S, fn: () => ({Mn, gov}), info, eng: 'CHS'};
  }
  if (P.ltb === 'flat') {                                    // barra plana
    const Lp = Infinity; const fn = (Cb) => { const v = Cb * PI / Lb * Math.sqrt(E * P.Iw * G * P.J); return v < Mp ? {Mn: v, gov: 'PLT'} : {Mn: Mp, gov: 'plastificación'}; };
    return {Mp, Lp, Lr: Infinity, Mr: Fy * P.Ss, fn, info, eng: 'FLAT'};
  }
  const Mn = P.type === 'ANG' ? Fy * P.Ss : Mp;              // ángulos: fluencia de la sección elástica (conservador); GEN: plástico
  return {Mp: Mn, Lp: Infinity, Lr: Infinity, Mr: Mn, fn: () => ({Mn, gov: P.type === 'ANG' ? 'fluencia' : 'plastificación'}), info, eng: P.type};
}
/* Flexión de eje débil (sin pandeo lateral) */
function weakEngine(P, E, Fy) {
  const lb = P.lb || {fam: 'GEN'}, r = Math.sqrt(E / Fy), info = [];
  let Mp = Fy * P.Zw, Mn = Mp, gov = 'plastificación';
  if (P.type === 'ANG') { return {Mn: Fy * P.Sw, gov: 'fluencia', info}; }
  if (P.ltb === 'open' && lb.top && lb.top[0]) {
    const el = lb.top[0], lam = el.b / el.t, lp = 0.38 * r, lrr = 1.0 * r; info.push({n: el.n + ' (eje débil)', lam, lp, lr: lrr, cls: clsOf(lam, lp, lrr)});
    if (lam > lp) { Mn = lam <= lrr ? Mp - (Mp - 0.7 * Fy * P.Sw) * (lam - lp) / (lrr - lp) : 0.69 * E * P.Sw / (lam * lam); gov = 'pandeo local ala'; }
  } else if (lb.fam === 'RHS' || lb.fam === 'BOX') {         // las paredes laterales trabajan como alas
    const lamF = lb.web.b / lb.web.t, lamW = lb.top[0].b / lb.top[0].t, lp = 1.12 * r, lrr = 1.40 * r;
    info.push({n: 'pared lateral (eje débil)', lam: lamF, lp, lr: lrr, cls: clsOf(lamF, lp, lrr)});
    const Mr = Fy * P.Sw;
    if (lamF > lp) {
      if (lamF <= lrr) { Mn = Mp - (Mp - Mr) * (lamF - lp) / (lrr - lp); gov = 'pandeo local pared'; }
      else {
        const wall = {b: lb.web.b, t: lb.web.t, hss: true, k: 'stiff'}, Al = (wall.b - beStiff(wall, E, Fy)) * wall.t * 2 / 2;   // una pared comprimida
        const xf = (lb.fam === 'BOX' ? P.b / 2 - lb.web.t / 2 : P.b / 2 - lb.web.t / 2), es = effModulus(P.Iw, P.A, P.b / 2, Al, xf);
        Mn = Fy * Math.min(es.Sc, es.St); gov = 'pared esbelta';
      }
    }
    if (lamW > 3.76 * r) { const v = lamW <= 5.70 * r ? Mp - (Mp - Mr) * (lamW - 3.76 * r) / (1.94 * r) : Mr * sq(5.70 * r / lamW); if (v < Mn) { Mn = v; gov = 'pandeo local pared'; } }
  } else if (lb.fam === 'CHS') { return null; }
  return {Mn, gov, info};
}

/* ───────────── corte ───────────── */
function shearCap(P, E, Fy) {
  const lb = P.lb, r = Math.sqrt(E / Fy); let Cv = 1, lam = 0;
  if (lb && lb.web && P.Aws > 0) {
    lam = lb.web.b / lb.web.t;
    if (lam > 2.45 * r) Cv = lam <= 3.07 * r ? 2.45 * r / lam : 4.52 * E / (0.6 * Fy * lam * lam);   // LRFD-99 F2.2 (kv = 5, sin rigidizadores)
  }
  return {Cv, lam, phiVs: PHI_V * 0.6 * Fy * P.Aws * Cv, phiVw: PHI_V * 0.6 * Fy * P.Aww};
}

/* ───────────── capacidad de una barra ───────────── */
function effLens(m, L) { const K = m.K || 1; return [m.kls || K * L, m.klw || K * L, m.lb || K * L]; }
function memberCapacity(R, P, kls, klw, lb) {
  const E = R.E, G = R.G, Fy = R.Fy, A = P.A;
  const cap = {KLs: kls, KLw: klw, Lb: lb, notes: []};
  const cc = compCap(P, E, G, Fy, kls, klw);
  cap.phiPc = cc.phiPc; cap.phiPt = PHI_T * A * Fy; cap.lam = cc.lam; cap.Fe = cc.Fe; cap.Fcr = cc.Fcr; cap.Q = cc.Q; cap.Qs = cc.Qs; cap.Qa = cc.Qa; cap.compElems = cc.loc.elems;
  if (cc.Q < 0.9999) cap.notes.push(`Elementos esbeltos en compresión: Q = ${cc.Q.toFixed(3)} (Qs = ${cc.Qs.toFixed(3)}, Qa = ${cc.Qa.toFixed(3)})`);
  const eng = {p: strongEngine(P, E, G, Fy, lb, 1), n: P.mono ? strongEngine(P, E, G, Fy, lb, -1) : null};
  if (!eng.n) eng.n = eng.p;
  cap.eng = eng;
  const e1 = eng.p.fn(1, 0), e2 = eng.n === eng.p ? e1 : eng.n.fn(1, 0);
  cap.Mp = eng.p.Mp; cap.Lp = eng.p.Lp; cap.Lr = eng.p.Lr;
  cap.MnS = (Cb, sgn, pr) => (sgn >= 0 ? eng.p : eng.n).fn(Cb, pr || 0);
  cap.Mn1 = Math.min(e1.Mn, e2.Mn);                          // Cb = 1, signo más desfavorable
  cap.Mn_ratio = e1.Mn / cap.Mp;
  cap.phiMs = PHI_B * e1.Mn;                                // referencia (Cb = 1; momento positivo)
  cap.phiMsMin = PHI_B * cap.Mn1;
  cap.flexInfo = eng.p.info; cap.flexGov = e1.gov; cap.flexEng = eng.p.eng;
  const wk = weakEngine(P, E, Fy);
  cap.phiMw = wk ? PHI_B * wk.Mn : PHI_B * Fy * P.Zw; cap.weakInfo = wk ? wk.info : [];
  const sh = shearCap(P, E, Fy); cap.phiVs = sh.phiVs; cap.phiVw = sh.phiVw; cap.Cv = sh.Cv;
  cap.Py = Fy * A;
  const cls = {};
  const worst = (arr) => arr.some(x => x.cls === 'esbelta') ? 'esbelta' : arr.some(x => x.cls === 'no compacta') ? 'no compacta' : 'compacta';
  const fl = eng.p.info.filter(x => x.n !== 'alma'), wb = eng.p.info.filter(x => x.n === 'alma');
  if (fl.length) cls.ala = worst(fl); if (wb.length) cls.alma = worst(wb);
  cap.cls = cls;
  if (cls.ala && cls.ala !== 'compacta') cap.notes.push('Ala en flexión ' + cls.ala);
  if (cls.alma && cls.alma !== 'compacta') cap.notes.push('Alma en flexión ' + cls.alma);
  if (cap.flexEng === 'F4' || cap.flexEng === 'F5') cap.notes.push('Flexión según AISC 360-05 §' + (cap.flexEng === 'F4' ? 'F4' : 'F5') + ' (sección monosimétrica o de alma esbelta)');
  if (P.lb && P.lb.fam === 'GEN') cap.notes.push('Perfil genérico: no se verifica el pandeo local (sin datos de espesores)');
  return cap;
}

/* ───────────── Cb a partir del diagrama de momentos real (LRFD-99 F1.2a: Cb = 12,5·Mmax/(2,5·Mmax + 3·MA + 4·MB + 3·MC) ≤ 2,3) ───────────── */
function momentFn(R, mr, fct) {
  const src = solsFor(R, mr, fct);
  return x => { let m = 0; for (const {f, sol} of src) m += f * planeEval(sol.SY, sol.stY, x).M; return m; };
}
function cbSegment(ev, S, a, b) {
  const l = b - a; if (!(l > 0)) return 1;
  const MA = Math.abs(ev(a + l / 4)), MB = Math.abs(ev(a + l / 2)), MC = Math.abs(ev(a + 3 * l / 4));
  let Mmax = Math.max(MA, MB, MC, Math.abs(ev(a)), Math.abs(ev(b)));
  for (let k = 0; k < S.x.length; k++) if (S.x[k] >= a - 1e-9 && S.x[k] <= b + 1e-9) Mmax = Math.max(Mmax, Math.abs(S.Mz[k]));
  if (Mmax < 1e-6) return 1;
  return Math.min(2.3, 12.5 * Mmax / (2.5 * Mmax + 3 * MA + 4 * MB + 3 * MC));
}
function cbMember(R, mr, fct, S, lb, opts) {
  if (opts.override > 0) return opts.override;
  if (opts.unit || opts.cant) return 1;
  const L = mr.L, ev = momentFn(R, mr, fct), n = lb >= L * (1 - 1e-6) ? 1 : Math.ceil(L / lb - 1e-9);
  let cb = Infinity; for (let i = 0; i < n; i++) cb = Math.min(cb, cbSegment(ev, S, L * i / n, L * (i + 1) / n));
  return cb;
}

/* ───────────── verificación de todas las barras ───────────── */
function checkAll(st, R) {
  const uls = R.combos.map((c, i) => ({c, i})).filter(o => o.c.type === 'ULS');
  const sls = R.combos.map((c, i) => ({c, i})).filter(o => o.c.type === 'SLS');
  const cbUnit = (st.settings && st.settings.cbMode === 'unit');
  const deg = new Map(); st.members.forEach(m => { deg.set(m.i, (deg.get(m.i) || 0) + 1); deg.set(m.j, (deg.get(m.j) || 0) + 1); });
  const free = n => !n.sup || !n.sup.some(v => v);
  R.checks = []; R.defl = [];
  for (const mr of R.mrec) {
    const m = mr.m, P = mr.P; const rec = {mr, id: m.id, tag: m.tag || '', sec: m.sec, L: mr.L, rigid: P.rigid};
    const iDeg = deg.get(m.i) || 0, jDeg = deg.get(m.j) || 0, ni = st.nodes[mr.a], nj = st.nodes[mr.b];
    let cant = 0; if (iDeg === 1 && free(ni)) cant = 1; else if (jDeg === 1 && free(nj)) cant = 2;   // 1: extremo libre = i ; 2: libre = j
    if (!P.rigid) {
      const [kls, klw, lb] = effLens(m, mr.L); const cap = memberCapacity(R, P, kls, klw, lb); rec.cap = cap; rec.best = null; rec.cant = cant;
      for (const {c, i} of uls) {
        const S = memberStations(R, mr, c.f, 21);
        const Cb = cbMember(R, mr, c.f, S, lb, {override: m.cb, unit: cbUnit, cant});
        let bestSt = null, Pc = 0, Pt = 0, Ms = 0, Mw = 0;
        for (let k = 0; k < S.x.length; k++) {
          const N = S.N[k], Pu = Math.max(0, -N), Tu = Math.max(0, N), mz = S.Mz[k], mw = Math.abs(S.My[k]);
          Pc = Math.max(Pc, Pu); Pt = Math.max(Pt, Tu); Ms = Math.max(Ms, Math.abs(mz)); Mw = Math.max(Mw, mw);
          const sgn = mz >= 0 ? 1 : -1, pr = Pu / cap.Py / PHI_B;
          const en = cap.MnS(Cb, sgn, pr), phiMs = PHI_B * en.Mn;
          const mom = Math.abs(mz) / phiMs + mw / cap.phiMw;
          const ra = Pu > 0 ? Pu / cap.phiPc : Tu / cap.phiPt;
          const rH = ra >= 0.2 ? ra + 8 / 9 * mom : ra / 2 + mom;
          if (!bestSt || rH > bestSt.rH) bestSt = {rH, k, x: S.x[k], Pu, Tu, mz, mw, phiMs, gov: en.gov, ra, mom, eq: ra >= 0.2 ? 'H1-1a' : 'H1-1b'};
        }
        const Vs = mxabs(S.Vy), Vw = mxabs(S.Vz), T = mxabs(S.T);
        const rV = Math.max(Vs / cap.phiVs, Vw / cap.phiVw), rH = bestSt ? bestSt.rH : 0, r = Math.max(rH, rV);
        const o = {combo: c.n, ci: i, Pc, Pt, Ms, Mw, Vs, Vw, T, rH, rV, r, Cb, x: bestSt ? bestSt.x : 0, gov: bestSt, phiMsUsed: bestSt ? bestSt.phiMs : cap.phiMs};
        if (R.order >= 2 && R.soMap) {                       // amplificación de los efectos por segundo orden (respecto de la misma combinación en primer orden)
          const S1 = memberStations(R, mr, c.f.slice(), 21), a1 = mxabs(S1.Mz), a2 = mxabs(S1.My);
          o.ampS = a1 > 1e-3 * Math.max(1, Ms) ? Ms / a1 : 1; o.ampW = a2 > 1e-3 * Math.max(1, Mw) ? Mw / a2 : 1; o.amp = Math.max(o.ampS, o.ampW);
          const n1 = Math.max(0, ...S1.N.map(v => -v)); o.ampN = n1 > 1e-3 * Math.max(1, Pc) ? Pc / n1 : 1;
        }
        if (!rec.best || r > rec.best.r) rec.best = o;
      }
      rec.r = rec.best ? rec.best.r : 0;
    } else rec.r = 0;
    R.checks.push(rec);
    // flechas de servicio
    if (!P.rigid) {
      for (const {c, i} of sls) {
        if (!c.lim) continue;
        const S = memberStations(R, mr, c.f, 21), L = mr.L, ul = S.ul; let d = 0;
        if (!cant) for (let k = 0; k < S.x.length; k++) {
          const x = S.x[k], ry = S.vy[k] - (S.vy[0] + (S.vy[S.vy.length - 1] - S.vy[0]) * x / L), rz = S.vz[k] - (S.vz[0] + (S.vz[S.vz.length - 1] - S.vz[0]) * x / L);
          d = Math.max(d, Math.hypot(ry, rz));
        } else if (cant === 2) {
          const ry = S.vy[S.vy.length - 1] - S.vy[0] - ul[5] * L, rz = S.vz[S.vz.length - 1] - S.vz[0] + ul[4] * L; d = Math.hypot(ry, rz);
        } else {
          const ry = S.vy[0] - (S.vy[S.vy.length - 1] - ul[11] * L), rz = S.vz[0] - (S.vz[S.vz.length - 1] + ul[10] * L); d = Math.hypot(ry, rz);
        }
        const lim = (cant ? 2 * L : L) / c.lim;
        R.defl.push({id: m.id, tag: m.tag || '', combo: c.n, d, lim, ratio: d / lim, cant: !!cant});
      }
    }
  }
  R.maxR = R.checks.reduce((b, c) => (!c.rigid && c.r > (b ? b.r : -1)) ? c : b, null);
  R.nFail = R.checks.filter(c => !c.rigid && c.r > 1).length;
  R.nDeflFail = R.defl.filter(d => d.ratio > 1).length;
  const sl = sls.find(o => o.c.n.indexOf('D+L') >= 0) || sls[0];
  R.maxUz = null;
  if (sl) { let best = {v: 0, id: null, hv: 0, hid: null}; R.nodes.forEach((n, i) => { const u = nodeDisp(R, i, sl.c.f); if (Math.abs(u[2]) > Math.abs(best.v)) { best.v = u[2]; best.id = n.id; } const h = Math.hypot(u[0], u[1]); if (h > best.hv) { best.hv = h; best.hid = n.id; } }); R.maxUz = best; R.slsName = sl.c.n; }
}
