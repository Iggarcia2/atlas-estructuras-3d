// js/vista/cargas.js
'use strict';
/* Cargas en el modelo y su dibujo. */
/* ── cargas en el modelo ── */
const LOAD_VIEW = {D: ['D'], L: ['L'], H: ['Hx', 'Hy'], S: ['S'], W: ['Wx', 'Wy'], E: ['Ex', 'Ey'], T: ['T']};
const LOAD_COL = {D: 'var(--muted)', L: 'var(--load)'}, LOAD_MK = {D: 'arrD', L: 'arrL'};
const LD_DIR_NAMES = {grav: 'gravedad ↓', X: '+X', Y: '+Y', Z: '+Z', lx: 'local x', ly: 'local y', lz: 'local z'};
function nodeVecOf(n, key) {
  const P = n.P || {};
  if (key === 'Hx') return [(P.H || [])[0] || 0, 0, 0]; if (key === 'Hy') return [0, (P.H || [])[1] || 0, 0];
  const v = P[key]; return v ? [v[0] || 0, v[1] || 0, v[2] || 0] : [0, 0, 0];
}
function loadsSVG() {
  const mode = UI.showLoads, keys = LOAD_VIEW[mode]; if (!keys) return '';
  const col = LOAD_COL[mode] || 'var(--violet)', mk = LOAD_MK[mode] || 'arrW'; let h = '';
  const arrow = (x, y, dirv, len, sw) => { const u = axisScr(dirv); if (!u) return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" style="fill:none;stroke:${col}" stroke-width="1.2"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1" style="fill:${col}"/>`; return `<line x1="${(x - u.x * len).toFixed(1)}" y1="${(y - u.y * len).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:${col}" stroke-width="${sw || 1.3}" marker-end="url(#${mk})"/>`; };
  const lab = (x, y, t) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="9" style="fill:${col};font-family:var(--mono)">${t}</text>`;
  const arcM = (x, y, sg) => `<path d="M${(x - 8).toFixed(1)} ${(y + 3).toFixed(1)} A 8 8 0 1 ${sg > 0 ? 1 : 0} ${(x + 8).toFixed(1)} ${(y + 3).toFixed(1)}" fill="none" style="stroke:${col}" stroke-width="1.5" marker-end="url(#${mk})"/>`;
  for (const m of state.members) {
    const pa = scrPos.get(m.i), pb = scrPos.get(m.j), na = nodeById(m.i), nb = nodeById(m.j); if (!pa || !pb || !na || !nb) continue;
    const Lm = Math.hypot(nb.x - na.x, nb.y - na.y, nb.z - na.z); if (Lm < 1e-6) continue;
    const fr = memberFrame([nb.x - na.x, nb.y - na.y, nb.z - na.z], Lm, m.beta || 0), Ls = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const at = x => ({x: pa.x + (pb.x - pa.x) * x / Lm, y: pa.y + (pb.y - pa.y) * x / Lm});
    const dirVec = nm => nm in LOC_AX ? [fr.ex, fr.ey, fr.ez][LOC_AX[nm]] : (DIRV[nm] || DIRV.grav);
    const distr = (a, b, w1, w2, dv, text) => {
      if (!(b > a) || (!w1 && !w2)) return '';
      const cnt = Math.max(2, Math.min(12, Math.round(Ls * (b - a) / Lm / 24))), wmax = Math.max(Math.abs(w1), Math.abs(w2)); let o = '';
      for (let k = 0; k < cnt; k++) {
        const t = (k + .5) / cnt, w = w1 + (w2 - w1) * t; if (!w) continue; const sg = w >= 0 ? 1 : -1, P = at(a + (b - a) * t);
        o += arrow(P.x, P.y, [dv[0] * sg, dv[1] * sg, dv[2] * sg], 8 + 14 * Math.abs(w) / wmax);
      }
      const M = at((a + b) / 2); return o + lab(M.x + 6, M.y - 14, text);
    };
    const q = m.q || {};
    for (const key of keys) { const w = q[key] || 0; if (w) h += distr(0, Lm, w, w, DIRV[Q_DIR[key]], fmt(w, 2) + ' kN/m'); }
    for (const ld of (m.loads || [])) {
      if (!keys.includes(ld.c || 'D')) continue; const k = ld.k || 'U', dv = dirVec(ld.dir || 'grav');
      const a = Math.max(0, ld.a || 0), b = ld.b == null ? Lm : Math.min(Lm, ld.b);
      if (k === 'U') h += distr(a, b, ld.w1 || 0, ld.w1 || 0, dv, fmt(ld.w1 || 0, 2) + ' kN/m');
      else if (k === 'T') h += distr(a, b, ld.w1 || 0, ld.w2 || 0, dv, fmt(ld.w1 || 0, 2) + '→' + fmt(ld.w2 || 0, 2));
      else if (k === 'P' && ld.F) { const P = at(Math.min(Lm, a)), sg = ld.F >= 0 ? 1 : -1; h += arrow(P.x, P.y, [dv[0] * sg, dv[1] * sg, dv[2] * sg], 30, 2.2) + `<circle cx="${P.x.toFixed(1)}" cy="${P.y.toFixed(1)}" r="2.4" style="fill:${col}"/>` + lab(P.x + 6, P.y - 18, fmt(ld.F, 2) + ' kN'); }
      else if (k === 'M' && ld.M) { const P = at(Math.min(Lm, a)); h += arcM(P.x, P.y - 4, ld.M >= 0 ? 1 : -1) + lab(P.x + 10, P.y - 12, fmt(ld.M, 2) + ' kN·m'); }
      else if (k === 'TH') { const P = at(Lm / 2), t = [ld.dT ? 'ΔT=' + fmt(ld.dT, 0) + '°C' : '', ld.dTy ? 'grad.f=' + fmt(ld.dTy, 0) : '', ld.dTz ? 'grad.d=' + fmt(ld.dTz, 0) : ''].filter(Boolean).join(' '); h += `<circle cx="${P.x.toFixed(1)}" cy="${P.y.toFixed(1)}" r="4.5" style="fill:none;stroke:${col}" stroke-width="1.3" stroke-dasharray="2 2"/>` + lab(P.x + 8, P.y - 8, 'T ' + t); }
    }
  }
  for (const n of state.nodes) {
    const p = scrPos.get(n.id); let row = 0;
    for (const key of keys) {
      const v = nodeVecOf(n, key);
      if (v.some(x => x)) {
        const u = axisScr(v), mag = Math.hypot(v[0], v[1], v[2]);
        h += u ? `<line x1="${(p.x - u.x * 36).toFixed(1)}" y1="${(p.y - u.y * 36).toFixed(1)}" x2="${(p.x - u.x * 5).toFixed(1)}" y2="${(p.y - u.y * 5).toFixed(1)}" style="stroke:${col}" stroke-width="2" marker-end="url(#${mk})"/>` : `<circle cx="${p.x}" cy="${p.y}" r="6" style="fill:none;stroke:${col}" stroke-width="1.6"/>`;
        h += lab(p.x + 8, p.y + 16 + 10 * row++, fmt(mag, 2) + ' kN');
      }
      const mo = (n.Mo || {})[key];
      if (mo && mo.some(x => x)) { h += arcM(p.x, p.y - 12, 1) + lab(p.x + 12, p.y - 18, 'M ' + fmt(Math.hypot(mo[0] || 0, mo[1] || 0, mo[2] || 0), 2) + ' kN·m'); }
    }
  }
  return h;
}
/* resultados sobre el modelo */
const _stCache = {key: '', map: new Map()};
function stationsFor(mr, ns) {
  const R = UI.results, c = curCombo(); const key = UI.comboIdx + '|' + ns + '|' + UI.ver;
  if (_stCache.key !== key) { _stCache.key = key; _stCache.map = new Map(); }
  let s = _stCache.map.get(mr.m.id); if (!s) { s = memberStations(R, mr, c.f, ns); _stCache.map.set(mr.m.id, s); } return s;
}
function worldPt(mr, x, off, dirv) { const a = nodeById(mr.m.i), e = mr.fr.ex; return [a.x + e[0] * x + (dirv ? dirv[0] * off : 0), a.y + e[1] * x + (dirv ? dirv[1] * off : 0), a.z + e[2] * x + (dirv ? dirv[2] * off : 0)]; }
function diagramSVG() {
  const R = UI.results, k = UI.diagram; if (!R || k === 'def' || k === 'none') return '';
  const key = {N: 'N', Vy: 'Vy', Vz: 'Vz', Mz: 'Mz', My: 'My', T: 'T'}[k]; if (!key) return '';
  const scale = (key[0] === 'M' || key === 'T') ? 1e-6 : 1e-3; let gmax = 0; const data = [];
  for (const mr of R.mrec) { if (mr.P.rigid) continue; const S = stationsFor(mr, 15); data.push({mr, S}); gmax = Math.max(gmax, mxabs(S[key]) * scale); }
  if (gmax < 1e-9) return ''; const b = modelBox(), maxOff = 0.07 * b.diag; let h = '<g pointer-events="none">';
  for (const {mr, S} of data) {
    const dirv = key === 'My' || key === 'Vz' ? mr.fr.ez : mr.fr.ey, sgn = key === 'Mz' ? -1 : 1;
    const pts = [], base = []; for (let i = 0; i < S.x.length; i++) { const v = S[key][i] * scale; const w = worldPt(mr, S.x[i], sgn * v / gmax * maxOff, dirv); const q = proj(w[0], w[1], w[2]); pts.push(q.x.toFixed(1) + ',' + q.y.toFixed(1)); const w0 = worldPt(mr, S.x[i], 0); const q0 = proj(w0[0], w0[1], w0[2]); base.push(q0.x.toFixed(1) + ',' + q0.y.toFixed(1)); }
    h += `<polygon points="${pts.join(' ')} ${base.reverse().join(' ')}" style="fill:var(--violet);fill-opacity:.22;stroke:var(--violet)" stroke-width="1"/>`;
    const imx = S[key].reduce((bi, v, i, arr) => Math.abs(v) > Math.abs(arr[bi]) ? i : bi, 0), vmx = S[key][imx] * scale;
    if (Math.abs(vmx) > 0.12 * gmax) { const w = worldPt(mr, S.x[imx], sgn * vmx / gmax * maxOff, dirv), q = proj(w[0], w[1], w[2]); h += `<text x="${(q.x + 3).toFixed(1)}" y="${(q.y - 3).toFixed(1)}" font-size="9" style="fill:var(--violet);font-family:var(--mono)">${fmt(vmx, 2)}</text>`; }
  }
  return h + '</g>';
}
function deformedSVG() {
  const R = UI.results; let umax = 0; const c = curCombo();
  R.nodes.forEach((n, i) => { const u = nodeDisp(R, i, c.f); umax = Math.max(umax, Math.hypot(u[0], u[1], u[2])); });
  if (umax < 1e-9) return ''; const b = modelBox(); const sc = UI.defScale > 0 ? UI.defScale : 0.06 * b.diag / umax; R.defAuto = sc; let h = '<g pointer-events="none" fill="none" style="stroke:var(--accent)" stroke-width="1.7" stroke-dasharray="5 3">';
  for (const mr of R.mrec) {
    if (mr.P.rigid) continue; const S = stationsFor(mr, 11), pts = [], T = mr.T;
    for (let i = 0; i < S.x.length; i++) {
      const o = worldPt(mr, S.x[i], 0), ux = S.ux[i], vy = S.vy[i], vz = S.vz[i];
      const w = [o[0] + sc * (ux * T[0][0] + vy * T[1][0] + vz * T[2][0]), o[1] + sc * (ux * T[0][1] + vy * T[1][1] + vz * T[2][1]), o[2] + sc * (ux * T[0][2] + vy * T[1][2] + vz * T[2][2])];
      const q = proj(w[0], w[1], w[2]); pts.push(q.x.toFixed(1) + ',' + q.y.toFixed(1));
    }
    h += `<polyline points="${pts.join(' ')}"/>`;
  }
  return h + `</g><text x="14" y="${V.H - 46}" font-size="10" style="fill:var(--accent);font-family:var(--mono)">deformada ×${fmt(sc, 0)} · ${esc(c.n)}</text>`;
}
function drawOver() {
  let h = '';
  if (UI.chain && UI.cursor && nodeById(UI.chain) && UI.mode === 'bar') {
    const a = scrPos.get(UI.chain), c = UI.cursor, q = proj(c.x, c.y, c.z);
    h += `<line x1="${a.x}" y1="${a.y}" x2="${q.x}" y2="${q.y}" style="stroke:var(--load)" stroke-width="2" stroke-dasharray="6 4"/>`;
  }
  if (UI.cursor && (UI.mode === 'node' || UI.mode === 'bar')) {
    const q = proj(UI.cursor.x, UI.cursor.y, UI.cursor.z);
    h += UI.cursor.node ? `<circle cx="${q.x}" cy="${q.y}" r="8" style="fill:none;stroke:var(--ok)" stroke-width="2"/>` : `<g style="stroke:var(--accent)" stroke-width="1.6"><line x1="${q.x - 6}" y1="${q.y}" x2="${q.x + 6}" y2="${q.y}"/><line x1="${q.x}" y1="${q.y - 6}" x2="${q.x}" y2="${q.y + 6}"/></g>`;
  }
  if (drag && drag.type === 'box' && drag.moved) { const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1), w = Math.abs(drag.x1 - drag.x0), hh = Math.abs(drag.y1 - drag.y0); h += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" style="fill:var(--accent-d);stroke:var(--accent)" stroke-dasharray="4 3"/>`; }
  gOver.innerHTML = h;
  // lectura
  const ro = $('#readout');
  if (UI.cursor) { let t = `X ${fmt(UI.cursor.x, 0)} · Y ${fmt(UI.cursor.y, 0)} · Z ${fmt(UI.cursor.z, 0)}`; if (UI.chain && nodeById(UI.chain)) { const a = nodeById(UI.chain); t += ` · L ${fmt(Math.hypot(UI.cursor.x - a.x, UI.cursor.y - a.y, UI.cursor.z - a.z), 0)} mm`; } ro.textContent = t; }
}
function drawAxes() {
  const x0 = 46, y0 = V.H - 52, L = 30; let h = '';
  const dirs = [[1, 0, 0, '#f87171', 'X'], [0, 1, 0, '#4ade80', 'Y'], [0, 0, 1, '#60a5fa', 'Z']];
  const o = proj(V.c[0], V.c[1], V.c[2]);
  dirs.forEach(d => { const q = proj(V.c[0] + d[0] * 1000, V.c[1] + d[1] * 1000, V.c[2] + d[2] * 1000); const sx = (q.x - o.x) / (1000 * V.zoom) * L, sy = (q.y - o.y) / (1000 * V.zoom) * L; h += `<line x1="${x0}" y1="${y0}" x2="${(x0 + sx).toFixed(1)}" y2="${(y0 + sy).toFixed(1)}" stroke="${d[3]}" stroke-width="2"/><text x="${(x0 + sx * 1.3 + 2).toFixed(1)}" y="${(y0 + sy * 1.3 + 3).toFixed(1)}" font-size="10" fill="${d[3]}" style="font-family:var(--mono)">${d[4]}</text>`; });
  gAxes.innerHTML = h;
}

