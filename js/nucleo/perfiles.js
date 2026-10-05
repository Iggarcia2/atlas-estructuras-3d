// js/nucleo/perfiles.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   NÚCLEO · catálogo de perfiles · solver matricial 3D de pórticos · verificación LRFD
   Unidades internas: mm · N · MPa  (entrada/salida en kN, kN·m)
   ════════════════════════════════════════════════════════════════════════════ */
const PI = Math.PI;
const CASES = ['D', 'L', 'Hx', 'Hy', 'S', 'Wx', 'Wy', 'Ex', 'Ey', 'T', 'A'];
const CASE_NAMES = {D: 'Permanentes (D)', L: 'Sobrecarga (L)', Hx: 'Horizontal X (H)', Hy: 'Horizontal Y (H)', S: 'Nieve / techo (S)', Wx: 'Viento X (W)', Wy: 'Viento Y (W)', Ex: 'Sismo X (E)', Ey: 'Sismo Y (E)', T: 'Temperatura (T)', A: 'Asentamientos (A)'};
const GRAV = 0.00980665;                       // kg/m → N/mm

/* ── Catálogo ── [h,b,tw,tf, A cm², Ix cm⁴, Iy cm⁴, Wx cm³, Wy cm³, kg/m, J cm⁴ (null = aprox.)] */
const CAT = {};
(function () {
  const UPN = {80: [80, 45, 6, 8, 11.0, 106, 19.4, 26.5, 6.36, 8.64], 100: [100, 50, 6, 8.5, 13.5, 206, 29.3, 41.2, 8.49, 10.6, 2.81],
    120: [120, 55, 7, 9, 17.0, 364, 43.2, 60.7, 11.1, 13.4, 4.15], 140: [140, 60, 7, 10, 20.4, 605, 62.7, 86.4, 14.8, 16.0],
    160: [160, 65, 7.5, 10.5, 24.0, 925, 85.3, 116, 18.3, 18.8, 7.39], 180: [180, 70, 8, 11, 28.0, 1350, 114, 150, 22.4, 22.0],
    200: [200, 75, 8.5, 11.5, 32.2, 1910, 148, 191, 27.0, 25.3], 220: [220, 80, 9, 12.5, 37.4, 2690, 197, 245, 33.6, 29.4],
    240: [240, 85, 9.5, 13, 42.3, 3600, 248, 300, 39.6, 33.2], 260: [260, 90, 10, 14, 48.3, 4820, 317, 371, 47.7, 37.9],
    300: [300, 100, 10, 16, 58.8, 8030, 495, 535, 67.8, 46.2]};
  const IPE = {100: [100, 55, 4.1, 5.7, 10.3, 171, 15.9, 34.2, 5.79, 8.1], 120: [120, 64, 4.4, 6.3, 13.2, 318, 27.7, 53.0, 8.65, 10.4],
    140: [140, 73, 4.7, 6.9, 16.4, 541, 44.9, 77.3, 12.3, 12.9], 160: [160, 82, 5.0, 7.4, 20.1, 869, 68.3, 109, 16.7, 15.8],
    180: [180, 91, 5.3, 8.0, 23.9, 1317, 101, 146, 22.2, 18.8], 200: [200, 100, 5.6, 8.5, 28.5, 1943, 142, 194, 28.5, 22.4],
    220: [220, 110, 5.9, 9.2, 33.4, 2772, 205, 252, 37.3, 26.2], 240: [240, 120, 6.2, 9.8, 39.1, 3892, 284, 324, 47.3, 30.7],
    270: [270, 135, 6.6, 10.2, 45.9, 5790, 420, 429, 62.2, 36.1], 300: [300, 150, 7.1, 10.7, 53.8, 8356, 604, 557, 80.5, 42.2],
    330: [330, 160, 7.5, 11.5, 62.6, 11770, 788, 713, 98.5, 49.1], 360: [360, 170, 8.0, 12.7, 72.7, 16270, 1043, 904, 123, 57.1],
    400: [400, 180, 8.6, 13.5, 84.5, 23130, 1318, 1156, 146, 66.3]};
  for (const k in UPN) { const r = UPN[k]; CAT['UPN ' + k] = {type: 'UPN', h: r[0], b: r[1], tw: r[2], tf: r[3], A: r[4], Is: r[5], Iw: r[6], Ss: r[7], Sw: r[8], kg: r[9], J: r[10] || null}; }
  for (const k in IPE) { const r = IPE[k]; CAT['IPE ' + k] = {type: 'I', h: r[0], b: r[1], tw: r[2], tf: r[3], A: r[4], Is: r[5], Iw: r[6], Ss: r[7], Sw: r[8], kg: r[9], J: null}; }
  const IPE_R = {100: 7, 120: 7, 140: 7, 160: 9, 180: 9, 200: 12, 220: 12, 240: 15, 270: 15, 300: 15, 330: 18, 360: 18, 400: 21};   // radio de acuerdo alma-ala (DIN 1025-5)
  for (const k in IPE) CAT['IPE ' + k].r = IPE_R[k];
  for (const k in UPN) CAT['UPN ' + k].r = UPN[k][3];                  // UPN: r1 = tf
  CAT['L 63,5x6,35'] = {type: 'ANG', a: 63.5, t: 6.35, A: 7.66, kg: 6.10};
  CAT['Vínculo rígido'] = {type: 'RIGID', A: 240, Is: 92500, Iw: 92500, J: 7390, kg: 0};
})();
const SEC_FAMILIES = ['UPN', 'IPE', 'L ', 'Vínculo'];

function rectSec(name, h, b, t) {                     // tubo rectangular / cuadrado
  return {type: 'RHS', h, b, t, kg: null};
}
/* Pila de rectángulos centrados en x = 0 (b = ancho, t = alto, y0 = cota inferior), contiguos y ordenados de abajo hacia arriba */
function stackProps(rects) {
  rects = rects.slice().sort((a, b) => a.y0 - b.y0);
  let A = 0, My = 0; for (const r of rects) { const a = r.b * r.t; A += a; My += a * (r.y0 + r.t / 2); }
  const yc = My / A; let Ix = 0, Iy = 0, Zy = 0;
  for (const r of rects) { const a = r.b * r.t, d = r.y0 + r.t / 2 - yc; Ix += r.b * r.t ** 3 / 12 + a * d * d; Iy += r.t * r.b ** 3 / 12; Zy += r.t * r.b * r.b / 4; }
  let cum = 0, yp = rects[0].y0;
  for (const r of rects) { const a = r.b * r.t; if (cum + a >= A / 2) { yp = r.y0 + (A / 2 - cum) / r.b; break; } cum += a; }
  let Zx = 0;
  for (const r of rects) {
    const lo = r.y0, hi = r.y0 + r.t;
    if (hi <= yp) Zx += r.b * r.t * (yp - (lo + hi) / 2);
    else if (lo >= yp) Zx += r.b * r.t * ((lo + hi) / 2 - yp);
    else { Zx += r.b * (yp - lo) * (yp - lo) / 2 + r.b * (hi - yp) * (hi - yp) / 2; }
  }
  const H = Math.max(...rects.map(r => r.y0 + r.t)) - Math.min(...rects.map(r => r.y0));
  return {A, yc, Ix, Iy, Zx, Zy, yp, H};
}
/* Propiedades derivadas (mm) ------------------------------------------------ */
function secProps(spec) {
  if (!spec) return null;
  if (spec._p) return spec._p;
  const P = {type: spec.type, kg: spec.kg || 0, rigid: false};
  const T = spec.type;
  if (T === 'UPN' || T === 'I') {
    const h = spec.h, b = spec.b, tw = spec.tw, tf = spec.tf;
    P.h = h; P.b = b; P.tw = tw; P.tf = tf; P.A = spec.A * 100; P.Is = spec.Is * 1e4; P.Iw = spec.Iw * 1e4;
    P.Ss = spec.Ss * 1e3; P.Sw = spec.Sw * 1e3;
    P.J = (spec.J ? spec.J : ((2 * b * tf ** 3 + (h - 2 * tf) * tw ** 3) / 3 * (T === 'UPN' ? 1.07 : 1.3)) / 1e4) * 1e4;
    const h0 = h - tf;
    if (T === 'UPN') {
      const bp = b - tw / 2, xbar = bp ** 2 * tf / (2 * bp * tf + h0 * tw), esc = 3 * bp ** 2 * tf / (6 * bp * tf + h0 * tw);
      P.x0 = xbar + esc;
      P.Cw = tf * bp ** 3 * h0 ** 2 / 12 * (3 * bp * tf + 2 * h0 * tw) / (6 * bp * tf + h0 * tw);
      P.Zs = b * tf * (h - tf) + tw * (h - 2 * tf) ** 2 / 4;
      // módulo plástico débil (eje neutro plástico): integración numérica
      const n = 2000, dx = b / n; let tot = 0; const dA = [];
      for (let i = 0; i < n; i++) { const xm = (i + .5) * dx, t = xm <= tw ? h : 2 * tf; dA.push(t * dx); tot += t * dx; }
      let cum = 0, xp = 0; for (let i = 0; i < n; i++) { cum += dA[i]; if (cum >= tot / 2) { xp = (i + .5) * dx; break; } }
      let Zw = 0; for (let i = 0; i < n; i++) Zw += Math.abs((i + .5) * dx - xp) * dA[i];
      P.Zw = Zw;
    } else {
      P.x0 = 0; P.Cw = P.Iw * h0 * h0 / 4;
      P.Zs = b * tf * (h - tf) + tw * (h - 2 * tf) ** 2 / 4; P.Zw = tf * b * b / 2 + (h - 2 * tf) * tw * tw / 4;
    }
    P.Zs = Math.min(P.Zs, 1.5 * P.Ss); P.Zw = Math.min(P.Zw, 1.5 * P.Sw);
    P.Aws = h * tw; P.Aww = 2 * b * tf; P.ltb = 'open';
    P.yc = h / 2; P.SsT = P.Ss; P.SsB = P.Ss; P.mono = false; P.ftAx = 's';
    const hw = h - 2 * (tf + (spec.r != null ? spec.r : tf));
    P.lb = T === 'I' ? {fam: 'I', welded: false, top: [{b: b / 2, t: tf, k: 'out', n: 'ala'}], bot: [{b: b / 2, t: tf, k: 'out', n: 'ala'}], web: {b: hw, t: tw}}
                     : {fam: 'UPN', welded: false, top: [{b: b, t: tf, k: 'out', n: 'ala'}], bot: [{b: b, t: tf, k: 'out', n: 'ala'}], web: {b: hw, t: tw}};
    P.hw = hw;
  } else if (T === 'WI' || T === 'IPL') {
    // I armada soldada (WI) o perfil laminado con platabandas (IPL). Eje y local hacia arriba: ala «sup» = +y.
    let rects, Ab, Isb, Iwb, Jb, Zwb, hh, bf0, tf0, tw0, kgb, bT, tT, bB, tB, Iyt, Iyb, yT, yB, welded = true, webB, webT;
    if (T === 'WI') {
      const tfT = spec.tft, tfB = spec.tfb, hwid = spec.hw; tw0 = spec.tw; bT = spec.bft; tT = tfT; bB = spec.bfb; tB = tfB;
      hh = tfB + hwid + tfT;
      rects = [{b: bB, t: tB, y0: 0}, {b: tw0, t: hwid, y0: tB}, {b: bT, t: tT, y0: tB + hwid}];
      Ab = 0; Jb = (bT * tT ** 3 + bB * tB ** 3 + hwid * tw0 ** 3) / 3; Zwb = 0;
      Iyt = tT * bT ** 3 / 12; Iyb = tB * bB ** 3 / 12; yT = tB + hwid + tT / 2; yB = tB / 2; kgb = 0; webB = tB; webT = tB + hwid;
      P.hw = hwid;
    } else {
      const base = CAT[spec.base]; if (!base || base.type !== 'I') return null;
      const pb = secProps(base), pt = spec.top || {b: 0, t: 0}, pbm = spec.bot || {b: 0, t: 0};
      hh = pb.h; tw0 = pb.tw; bf0 = pb.b; tf0 = pb.tf;
      const hwid = pb.h - 2 * tf0;
      rects = []; if (pbm.t > 0) rects.push({b: pbm.b, t: pbm.t, y0: -pbm.t});
      rects.push({b: bf0, t: tf0, y0: 0}, {b: tw0, t: hwid, y0: tf0}, {b: bf0, t: tf0, y0: tf0 + hwid}); if (pt.t > 0) rects.push({b: pt.b, t: pt.t, y0: hh});
      const y0min = pbm.t > 0 ? -pbm.t : 0; rects.forEach(r => r.y0 -= y0min);               // origen en la fibra inferior
      Ab = pb.A; Isb = pb.Is; Iwb = pb.Iw; Jb = pb.J + (pt.b * pt.t ** 3 + pbm.b * pbm.t ** 3) / 3; Zwb = pb.Zw; kgb = pb.kg;
      const yb = pb.h / 2 - y0min;                                                          // centroide del laminado desde la fibra inferior
      // propiedades elásticas exactas: laminado (catálogo) + platabandas
      const pl = [[pbm, -pbm.t / 2 - y0min], [pt, hh + pt.t / 2 - y0min]].filter(p => p[0].t > 0);
      let A = Ab, My = Ab * yb; pl.forEach(([p, yy]) => { A += p.b * p.t; My += p.b * p.t * yy; });
      const yc = My / A; let Is = Isb + Ab * (yb - yc) ** 2, Iw = Iwb; pl.forEach(([p, yy]) => { Is += p.b * p.t ** 3 / 12 + p.b * p.t * (yy - yc) ** 2; Iw += p.t * p.b ** 3 / 12; });
      P.__el = {A, yc, Is, Iw};
      const grpT = [[bf0, tf0, pb.h - tf0 / 2 - y0min]].concat(pt.t > 0 ? [[pt.b, pt.t, hh + pt.t / 2 - y0min]] : []), grpB = [[bf0, tf0, tf0 / 2 - y0min]].concat(pbm.t > 0 ? [[pbm.b, pbm.t, -pbm.t / 2 - y0min]] : []);
      const grp = g => { let a = 0, ay = 0, iy = 0; g.forEach(([b, t, y]) => { a += b * t; ay += b * t * y; iy += t * b ** 3 / 12; }); return {Iy: iy, y: ay / a, a}; };
      const gT = grp(grpT), gB = grp(grpB); Iyt = gT.Iy; Iyb = gB.Iy; yT = gT.y; yB = gB.y; bT = Math.max(bf0, pt.b || 0); bB = Math.max(bf0, pbm.b || 0); tT = tf0 + (pt.t || 0); tB = tf0 + (pbm.t || 0);
      P.hw = hwid - 0; P.__plates = {top: pt, bot: pbm, gT, gB, bf0, tf0};
      webB = (pbm.t > 0 ? pbm.t : 0) + tf0 - y0min * 0; webT = 0;
    }
    // propiedades de la pila de rectángulos (plástico, etc.)
    const st = stackProps(rects);
    if (T === 'WI') {
      P.A = st.A; P.Is = st.Ix; P.Iw = st.Iy; P.yc = st.yc;
    } else { P.A = P.__el.A; P.Is = P.__el.Is; P.Iw = P.__el.Iw; P.yc = P.__el.yc; }
    P.h = st.H; P.b = Math.max(...rects.map(r => r.b)); P.tw = tw0; P.tf = Math.min(tT, tB); P.tfTop = tT; P.tfBot = tB; P.yp = st.yp;
    P.SsT = P.Is / (P.h - P.yc); P.SsB = P.Is / P.yc; P.Ss = Math.min(P.SsT, P.SsB); P.Sw = P.Iw / (P.b / 2);
    P.Zs = Math.min(st.Zx, 1.5 * P.Ss); P.Zw = Math.min(st.Zy + (T === 'IPL' ? 0 : 0), 1.5 * P.Sw);
    P.J = T === 'WI' ? Jb : Jb;
    const hf = yT - yB; P.Cw = hf * hf * Iyt * Iyb / (Iyt + Iyb);
    P.hf = hf; const ysc = yB + hf * Iyt / (Iyt + Iyb); P.x0 = Math.abs(ysc - P.yc); P.y0s = ysc - P.yc; P.ftAx = 'w';   // centro de corte respecto del baricentro (sobre el eje de simetría)
    P.mono = Math.abs(Iyt - Iyb) > 1e-6 * (Iyt + Iyb) || Math.abs(P.yc - P.h / 2) > 1e-6 * P.h;
    if (T === 'WI') { P.kg = P.A * 7.85e-3; P.Aws = spec.hw * spec.tw; P.Aww = spec.bft * spec.tft + spec.bfb * spec.tfb; }
    else { const pl = [spec.top, spec.bot].filter(p => p && p.t > 0); P.kg = kgb + pl.reduce((s, p) => s + p.b * p.t * 7.85e-3, 0); P.Aws = P.h * tw0; P.Aww = 2 * bf0 * tf0 + pl.reduce((s, p) => s + p.b * p.t, 0); }
    P.ltb = 'open';
    if (T === 'WI') P.lb = {fam: 'WI', welded: true, top: [{b: spec.bft / 2, t: spec.tft, k: 'out', n: 'ala sup.'}], bot: [{b: spec.bfb / 2, t: spec.tfb, k: 'out', n: 'ala inf.'}], web: {b: spec.hw, t: spec.tw}};
    else {
      const pp = P.__plates, mk = (p, n, y) => p.t > 0 ? [{b: p.b, t: p.t, k: 'plate', n: 'platabanda ' + n, y}] : [];
      P.lb = {fam: 'IPL', welded: true, top: [{b: pp.bf0 / 2, t: pp.tf0, k: 'out', n: 'ala sup.'}].concat(mk(pp.top, 'sup.', P.h - (pp.top.t || 0) / 2)), bot: [{b: pp.bf0 / 2, t: pp.tf0, k: 'out', n: 'ala inf.'}].concat(mk(pp.bot, 'inf.', (pp.bot.t || 0) / 2)), web: {b: P.hw, t: tw0}};
    }
    delete P.__el; delete P.__plates;
  } else if (T === 'BOX') {
    const h = spec.h, b = spec.b, tw = spec.tw, tf = spec.tf;
    P.h = h; P.b = b; P.tw = tw; P.tf = tf; P.A = 2 * b * tf + 2 * tw * (h - 2 * tf);
    P.Is = (b * h ** 3 - (b - 2 * tw) * (h - 2 * tf) ** 3) / 12; P.Iw = (h * b ** 3 - (h - 2 * tf) * (b - 2 * tw) ** 3) / 12;
    P.Ss = P.Is / (h / 2); P.Sw = P.Iw / (b / 2); P.SsT = P.Ss; P.SsB = P.Ss; P.yc = h / 2; P.mono = false;
    P.Zs = (b * h * h - (b - 2 * tw) * (h - 2 * tf) ** 2) / 4; P.Zw = (h * b * b - (h - 2 * tf) * (b - 2 * tw) ** 2) / 4;
    const Am = (b - tw) * (h - tf); P.J = 4 * Am * Am / (2 * (b - tw) / tf + 2 * (h - tf) / tw); P.Cw = 0; P.x0 = 0;
    P.Aws = 2 * (h - 2 * tf) * tw; P.Aww = 2 * (b - 2 * tw) * tf; P.ltb = 'closed'; P.kg = P.A * 7.85e-3;
    P.lb = {fam: 'BOX', welded: true, top: [{b: b - 2 * tw, t: tf, k: 'stiff', hss: true, n: 'ala', y: h - tf / 2}], bot: [{b: b - 2 * tw, t: tf, k: 'stiff', hss: true, n: 'ala', y: tf / 2}], web: {b: h - 2 * tf, t: tw, hss: true}, nWeb: 2};
    P.hw = h - 2 * tf;
  } else if (T === 'RHS') {
    const h = spec.h, b = spec.b, t = spec.t;
    P.h = h; P.b = b; P.tw = t; P.tf = t;
    P.A = 2 * t * (h + b - 2 * t);
    P.Is = (b * h ** 3 - (b - 2 * t) * (h - 2 * t) ** 3) / 12; P.Iw = (h * b ** 3 - (h - 2 * t) * (b - 2 * t) ** 3) / 12;
    P.Ss = P.Is / (h / 2); P.Sw = P.Iw / (b / 2);
    P.Zs = (b * h * h - (b - 2 * t) * (h - 2 * t) ** 2) / 4; P.Zw = (h * b * b - (h - 2 * t) * (b - 2 * t) ** 2) / 4;
    const Am = (b - t) * (h - t), p = 2 * (b + h - 2 * t);
    P.J = 4 * Am * Am * t / p + t ** 3 * p / 3; P.Cw = 0; P.x0 = 0; P.Aws = 2 * (h - 3 * t) * t; P.Aww = 2 * (b - 3 * t) * t; P.ltb = 'closed';
    P.kg = P.A * 7.85e-3; P.yc = h / 2; P.SsT = P.Ss; P.SsB = P.Ss; P.mono = false;
    P.lb = {fam: 'RHS', welded: false, top: [{b: b - 3 * t, t, k: 'stiff', hss: true, n: 'ala', y: h - t / 2}], bot: [{b: b - 3 * t, t, k: 'stiff', hss: true, n: 'ala', y: t / 2}], web: {b: h - 3 * t, t, hss: true}, nWeb: 2}; P.hw = h - 3 * t;
  } else if (T === 'CHS') {
    const D = spec.D, t = spec.t, d = D - 2 * t;
    P.h = D; P.b = D; P.tw = t; P.tf = t; P.A = PI / 4 * (D * D - d * d); P.Is = PI / 64 * (D ** 4 - d ** 4); P.Iw = P.Is;
    P.Ss = 2 * P.Is / D; P.Sw = P.Ss; P.Zs = (D ** 3 - d ** 3) / 6; P.Zw = P.Zs; P.J = 2 * P.Is; P.Cw = 0; P.x0 = 0;
    P.Aws = P.A / 2; P.Aww = P.A / 2; P.ltb = 'closed'; P.kg = P.A * 7.85e-3; P.yc = D / 2; P.SsT = P.Ss; P.SsB = P.Ss; P.mono = false;
    P.lb = {fam: 'CHS', D, t};
  } else if (T === 'FLAT') {
    const h = spec.h, t = spec.t;
    P.h = h; P.b = t; P.tw = t; P.tf = t; P.A = h * t; P.Is = t * h ** 3 / 12; P.Iw = h * t ** 3 / 12;
    P.Ss = P.Is / (h / 2); P.Sw = P.Iw / (t / 2); P.Zs = t * h * h / 4; P.Zw = h * t * t / 4;
    P.J = h * t ** 3 / 3 * (1 - 0.63 * t / h); P.Cw = 0; P.x0 = 0; P.Aws = P.A; P.Aww = P.A; P.ltb = 'flat'; P.kg = P.A * 7.85e-3; P.yc = h / 2; P.SsT = P.Ss; P.SsB = P.Ss; P.mono = false; P.lb = {fam: 'FLAT'};
  } else if (T === 'ANG') {
    const a = spec.a, t = spec.t;
    P.h = a; P.b = a; P.tw = t; P.tf = t; P.A = (spec.A ? spec.A * 100 : t * (2 * a - t));
    const rmin = 0.195 * a; P.rmin = rmin; P.Imin = P.A * rmin * rmin;
    const yc = (a * t * a / 2 + (a - t) * t * t / 2) / (a * t + (a - t) * t);
    P.Is = t * a ** 3 / 12 + a * t * (a / 2 - yc) ** 2 + (a - t) * t ** 3 / 12 + (a - t) * t * (t / 2 - yc) ** 2; P.Iw = P.Is;
    P.Ss = P.Is / Math.max(yc, a - yc); P.Sw = P.Ss; P.Zs = 1.5 * P.Ss; P.Zw = P.Zs;
    P.J = 2 * a * t ** 3 / 3 * 0.9; P.Cw = 0; P.x0 = 0; P.Aws = a * t; P.Aww = a * t; P.ltb = 'ang'; P.kg = spec.kg || P.A * 7.85e-3; P.yc = yc; P.SsT = P.Ss; P.SsB = P.Ss; P.mono = false;
    P.lb = {fam: 'ANG', legs: [{b: a, t, k: 'out', n: 'ala'}]};
  } else if (T === 'GEN') {
    P.A = spec.A * 100; P.Is = spec.Is * 1e4; P.Iw = spec.Iw * 1e4; P.J = (spec.J || 0.01) * 1e4;
    P.Ss = spec.Ss * 1e3; P.Sw = spec.Sw * 1e3; P.Zs = 1.12 * P.Ss; P.Zw = 1.12 * P.Sw; P.h = spec.h || 0; P.b = spec.b || 0;
    P.Cw = 0; P.x0 = 0; P.Aws = P.A * 0.5; P.Aww = P.A * 0.5; P.ltb = 'closed'; P.yc = (spec.h || 0) / 2; P.SsT = P.Ss; P.SsB = P.Ss; P.mono = false; P.lb = {fam: 'GEN'};
  } else if (T === 'RIGID') {
    P.A = spec.A * 100; P.Is = spec.Is * 1e4; P.Iw = spec.Iw * 1e4; P.J = spec.J * 1e4; P.rigid = true; P.kg = 0;
    P.Ss = P.Sw = P.Zs = P.Zw = 1; P.Cw = 0; P.x0 = 0; P.Aws = P.Aww = P.A;
  }
  spec._p = P; return P;
}
function secListAll(st) {
  const names = Object.keys(CAT);
  for (const k in (st.customSections || {})) if (!names.includes(k)) names.push(k);
  return names;
}
function getSecSpec(st, name) { return (st.customSections && st.customSections[name]) || CAT[name] || null; }

