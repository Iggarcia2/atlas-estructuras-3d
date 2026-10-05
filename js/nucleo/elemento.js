// js/nucleo/elemento.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ELEMENTO VIGA-COLUMNA EXACTO (un plano de flexión)
   · Solución cerrada de la viga con carga axial P (compresión +) y, opcionalmente, deformación por corte.
   · Se resuelve en el momento M(x):  M'' + κs·M = r·(w − P·κT),   κs = r·P/EI,  r = 1/(1 − P/GAs)
     (con GAs → ∞ es la teoría de Euler-Bernoulli; con P = 0 las funciones Φ son polinomios y el resultado
      es el de primer orden, exacto para cualquier carga).
   · Funciones Φm(x;κ) = Σ (−κ)^n x^(2n+m)/(2n+m)!   (Φ0 = cos, Φ1 = sen/k, Φ2 = (1−cos)/κ, …; Φ'm = Φ(m−1))
   · Variables de plano (ũ, φ): desplazamiento transversal y giro de la sección, con φ = ũ' en Euler-Bernoulli.
   · Fuerzas en los nudos (q1, q5, q7, q11) = (cortante i, momento i, cortante j, momento j) que el nudo
     ejerce sobre la barra, en ejes fijos de la barra sin deformar (incluye los términos P-Δ).
   · Convención de momento: M(x) = EI·(φ' − κT)  (= EI·curvatura; igual que Mz del programa).
   ════════════════════════════════════════════════════════════════════════════ */
function PHI(x, kap) {                                  // → [Φ0 … Φ5] en x ≥ 0
  const p = [0, 0, 0, 0, 0, 0];
  if (x <= 0) { p[0] = 1; return p; }
  if (kap === 0) { p[0] = 1; p[1] = x; p[2] = x * x / 2; p[3] = p[2] * x / 3; p[4] = p[3] * x / 4; p[5] = p[4] * x / 5; return p; }
  const z = kap * x * x;
  if (Math.abs(z) < 1) {
    for (let m = 0; m < 6; m++) {
      let t = Math.pow(x, m), f = 1; for (let i = 2; i <= m; i++) f *= i;
      t /= f; let s = t;
      for (let n = 1; n < 40; n++) { t *= -z / ((2 * n + m) * (2 * n + m - 1)); s += t; if (Math.abs(t) < 1e-18 * Math.abs(s)) break; }
      p[m] = s;
    }
    return p;
  }
  if (kap > 0) { const k = Math.sqrt(kap); p[0] = Math.cos(k * x); p[1] = Math.sin(k * x) / k; }
  else { const k = Math.sqrt(-kap); p[0] = Math.cosh(k * x); p[1] = Math.sinh(k * x) / k; }
  p[2] = (1 - p[0]) / kap; p[3] = (x - p[1]) / kap; p[4] = (x * x / 2 - p[2]) / kap; p[5] = (x * x * x / 6 - p[3]) / kap;
  return p;
}
/* Respuesta de una primitiva de carga en los cuatro niveles: [M, M', ∫M, ∫∫M] en la abscisa x */
function _primResp4(pr, x, S, acc) {
  const r = S.r, kap = S.kap;
  if (x < pr.a) return;
  const pa = PHI(x - pr.a, kap), I = (p, i) => i === -1 ? -kap * p[1] : p[i];
  switch (pr.t) {
    case 'U': {
      const a = pr.a, b = pr.b, g = (pr.w2 - pr.w1) / (b - a), pb = x >= b ? PHI(x - b, kap) : null;
      for (let sh = -1; sh <= 2; sh++) {
        let v = pr.w1 * I(pa, 2 + sh) + g * I(pa, 3 + sh);
        if (pb) v += -pr.w1 * I(pb, 2 + sh) - g * I(pb, 3 + sh) - g * (b - a) * I(pb, 2 + sh);
        acc[sh === -1 ? 1 : sh === 0 ? 0 : sh + 1] += r * v;
      }
      return;
    }
    case 'F': for (let sh = -1; sh <= 2; sh++) acc[sh === -1 ? 1 : sh === 0 ? 0 : sh + 1] += r * pr.F * I(pa, 1 + sh); return;
    case 'M': for (let sh = -1; sh <= 2; sh++) acc[sh === -1 ? 1 : sh === 0 ? 0 : sh + 1] += -pr.M * I(pa, sh); return;
  }
}
/* Parámetros del plano: EI (N·mm²), L, P (N, compresión +), gs = 1/(G·As) (1/N), kT = curvatura térmica (1/mm) */
function planeMake(EI, L, P, gs, loads, kT) {
  const den = 1 - P * gs;
  if (!(den > 1e-9)) return null;                        // pandeo por corte: inestable
  const r = 1 / den, kap = P / EI * r;
  const all = (loads || []).slice();
  if (kT && P) all.push({t: 'U', a: 0, b: L, w1: -P * kT, w2: -P * kT, fict: true});
  let sumF = 0, sumFa = 0, sumM = 0, sumMs = 0;
  for (const pr of (loads || [])) {                      // resultantes de las cargas reales (equilibrio)
    if (pr.t === 'U') { const d = pr.b - pr.a, f = (pr.w1 + pr.w2) / 2 * d; sumF += f; sumFa += (pr.w1 * d * (pr.a + d / 2) + (pr.w2 - pr.w1) * d * (pr.a + d * 2 / 3) / 1) ; }
    else if (pr.t === 'F') { sumF += pr.F; sumFa += pr.F * pr.a; }
    else if (pr.t === 'M') { sumM += pr.M; }
  }
  return {EI, L, P, gs, r, kap, kT: kT || 0, loads: all, real: loads || [], sumF, sumM};
}
function planeSolve(S, u1, f1, u2, f2) {                 // → estado {M0, Q0, u1, f1}
  const L = S.L, EI = S.EI, gs = S.gs, p = PHI(L, S.kap);
  const acL = [0, 0, 0, 0]; for (const pr of S.loads) _primResp4(pr, L, S, acL);
  const Mp = acL[0], I1 = acL[2], I2 = acL[3];
  const a11 = p[1] / EI, a12 = p[2] / EI, a21 = p[2] / EI - gs * (p[0] - 1), a22 = p[3] / EI - gs * p[1];
  const b1 = f2 - f1 - S.kT * L - I1 / EI, b2 = u2 - u1 - f1 * L - S.kT * L * L / 2 - I2 / EI + gs * (Mp + S.sumM);   // sumM: saltos de M por momentos concentrados (no generan corte)
  const det = a11 * a22 - a12 * a21;
  if (!(Math.abs(det) > 1e-300)) return null;
  return {M0: (b1 * a22 - a12 * b2) / det, Q0: (a11 * b2 - a21 * b1) / det, u1, f1};
}
function planeEnd(S, st) {                               // fuerzas de extremo [q1, q5, q7, q11]
  const L = S.L, p = PHI(L, S.kap), acL = [0, 0, 0, 0];
  for (const pr of S.loads) _primResp4(pr, L, S, acL);
  const Mp = acL[0];
  const ML = st.M0 * p[0] + st.Q0 * p[1] + Mp;
  const q1 = st.Q0 / S.r + S.P * st.f1;
  return [q1, -st.M0, -(q1 + S.sumF), ML];
}
function planeEval(S, st, x) {                           // estado en la abscisa x: {u, f, M, Q, F}
  const p = PHI(x, S.kap), ac = [0, 0, 0, 0]; for (const pr of S.loads) _primResp4(pr, x, S, ac);
  const Mp = ac[0], Qp = ac[1], I1 = ac[2], I2 = ac[3];
  const EI = S.EI, gs = S.gs;
  const M = st.M0 * p[0] + st.Q0 * p[1] + Mp, Q = -S.kap * st.M0 * p[1] + st.Q0 * p[0] + Qp;
  const i1 = st.M0 * p[1] + st.Q0 * p[2] + I1, i2 = st.M0 * p[2] + st.Q0 * p[3] + I2;
  let mj = 0; for (const pr of S.loads) if (pr.t === 'M' && x >= pr.a) mj += pr.M;
  const f = st.f1 + S.kT * x + i1 / EI, u = st.u1 + st.f1 * x + S.kT * x * x / 2 + i2 / EI - gs * (M - st.M0 + mj);
  return {u, f, M, Q, F: Q + S.P * (f - Q * gs)};
}
/* Matriz 4×4 [ũ1, φ1, ũ2, φ2] y vector de cargas equivalentes (q = k·u − feq) */
function planeK(EI, L, P, gs) {
  const S = planeMake(EI, L, P, gs, [], 0); if (!S) return null;
  const k = new Float64Array(16);
  for (let j = 0; j < 4; j++) {
    const d = [0, 0, 0, 0]; d[j] = 1; const st = planeSolve(S, d[0], d[1], d[2], d[3]); if (!st) return null;
    const q = planeEnd(S, st); for (let i = 0; i < 4; i++) k[i * 4 + j] = q[i];
  }
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const v = (k[i * 4 + j] + k[j * 4 + i]) / 2; k[i * 4 + j] = v; k[j * 4 + i] = v; }
  return k;
}
function planeFeq(S) {                                   // −q con desplazamientos nodales nulos
  const st = planeSolve(S, 0, 0, 0, 0); if (!st) return null;
  return planeEnd(S, st).map(v => -v);
}
