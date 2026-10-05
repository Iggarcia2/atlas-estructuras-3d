// js/vista/operaciones.js
'use strict';
/* Operaciones sobre el modelo: nudos, barras, copiar, mover, subdividir, uniones. */
/* ── operaciones de modelo ── */
function newNode(x, y, z) { const n = {id: UI.nextN++, x, y, z, sup: [0, 0, 0, 0, 0, 0], P: {D: [0, 0, 0], L: [0, 0, 0], H: [0, 0, 0]}, tag: ''}; state.nodes.push(n); UI.ver++; return n; }
function findNodeAt(x, y, z, tol) { tol = tol || 0.5; return state.nodes.find(n => Math.abs(n.x - x) < tol && Math.abs(n.y - y) < tol && Math.abs(n.z - z) < tol); }
function getOrAddNode(x, y, z) { return findNodeAt(x, y, z) || newNode(x, y, z); }
function newMember(i, j, base) {
  if (i === j) return null;
  if (state.members.some(m => (m.i === i && m.j === j) || (m.i === j && m.j === i))) return null;
  const m = Object.assign({sec: UI.drawSec, beta: 0, relI: false, relJ: false, K: 1, tag: '', q: {D: 0, L: 0, Hx: 0, Hy: 0}}, base ? clone(base) : {});
  m.id = UI.nextM++; m.i = i; m.j = j; state.members.push(m); UI.ver++; return m;
}
function delSelection() {
  if (!UI.sel.nodes.size && !UI.sel.members.size) return;
  pushUndo(); const nset = UI.sel.nodes, mset = UI.sel.members;
  state.members = state.members.filter(m => !mset.has(m.id) && !nset.has(m.i) && !nset.has(m.j));
  state.nodes = state.nodes.filter(n => !nset.has(n.id)); UI.sel.nodes.clear(); UI.sel.members.clear(); afterEdit();
}
const LOC_AX = {lx: 0, ly: 1, lz: 2};
/* Reparte las cargas generales entre el tramo [x0, x1] de la barra original (mm desde el nudo i). Las cargas U/T llegan con b explícito. */
function loadsForSegment(loads, x0, x1, last) {
  const out = [], EPS = 1e-6;
  for (const ld of (loads || [])) {
    const k = ld.k || 'U';
    if (k === 'U' || k === 'T') {
      const a = ld.a || 0, b = ld.b, lo = Math.max(a, x0), hi = Math.min(b, x1);
      if (!(hi - lo > EPS)) continue;
      const w1 = ld.w1 || 0, w2 = k === 'T' ? (ld.w2 || 0) : w1, at = x => (b - a) > 0 ? w1 + (w2 - w1) * (x - a) / (b - a) : w1;
      const c = clone(ld); c.a = lo - x0; c.b = hi - x0; c.w1 = at(lo); if (k === 'T') c.w2 = at(hi); out.push(c);
    } else if (k === 'P' || k === 'M') {
      const a = ld.a || 0, inside = a >= x0 - EPS && (a < x1 - EPS || (last && a <= x1 + EPS));   // el punto pertenece al tramo [x0, x1); el último incluye su extremo
      if (inside) { const c = clone(ld); c.a = Math.min(x1 - x0, Math.max(0, a - x0)); out.push(c); }
    } else out.push(clone(ld));                          // temperatura: igual en todos los tramos
  }
  return out;
}
function splitMember(id, n) {
  const m = memberById(id); if (!m || n < 2) return; const a = nodeById(m.i), b = nodeById(m.j); pushUndo();
  const L0 = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const k = state.members.indexOf(m), news = [];
  for (let s = 1; s < n; s++) { const t = s / n; const nn = newNode(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); news.push(nn.id); }
  const chain = [m.i, ...news, m.j]; state.members.splice(k, 1);
  const src = (m.loads || []).map(ld => { const c = clone(ld); if ((c.k === 'U' || c.k === 'T') && c.b == null) c.b = L0; return c; });   // b explícito = fin de la barra original
  const out = [];
  for (let s = 0; s < n; s++) {
    const c = Object.assign(clone(m), {id: UI.nextM++, i: chain[s], j: chain[s + 1]});
    c.loads = loadsForSegment(src, L0 * s / n, L0 * (s + 1) / n, s === n - 1);
    if (s > 0) { c.relI = false; c.sprI = null; c.trelI = false; }
    if (s < n - 1) { c.relJ = false; c.sprJ = null; c.trelJ = false; }
    out.push(c);
  }
  state.members.splice(k, 0, ...out); UI.sel.members.clear(); out.forEach(c => UI.sel.members.add(c.id)); afterEdit();
  toast(`Barra dividida en ${n}`);
}
/* Invierte i ↔ j conservando la física: se reflejan uniones y cargas (las cargas en ejes locales se re-expresan en los ejes nuevos). */
function flipMember(m) {
  const a = nodeById(m.i), b = nodeById(m.j), d = [b.x - a.x, b.y - a.y, b.z - a.z], L = Math.hypot(d[0], d[1], d[2]);
  const f0 = memberFrame(d, L, m.beta || 0), f1 = memberFrame([-d[0], -d[1], -d[2]], L, m.beta || 0);
  const ax0 = {lx: f0.ex, ly: f0.ey, lz: f0.ez}, ax1 = {lx: f1.ex, ly: f1.ey, lz: f1.ez}, dotv = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  let warn = false;
  (m.loads || []).forEach(ld => {
    const k = ld.k || 'U';
    if (k === 'U' || k === 'T') { const a0 = ld.a || 0, b0 = ld.b == null ? L : ld.b; ld.a = L - b0; ld.b = L - a0; if (k === 'T') { const t = ld.w1; ld.w1 = ld.w2; ld.w2 = t; } }
    else if (k === 'P' || k === 'M') ld.a = L - (ld.a || 0);
    if (ld.dir in LOC_AX && k !== 'TH') {
      const v = ax0[ld.dir]; let best = null;
      for (const nm of ['lx', 'ly', 'lz']) { const c = dotv(v, ax1[nm]); if (Math.abs(Math.abs(c) - 1) < 1e-6) best = {nm, sg: c > 0 ? 1 : -1}; }
      if (best) { ld.dir = best.nm; const sg = best.sg; if (k === 'U') ld.w1 *= sg; else if (k === 'T') { ld.w1 *= sg; ld.w2 *= sg; } else if (k === 'P') ld.F *= sg; else if (k === 'M') ld.M *= sg; }
      else warn = true;
    }
  });
  [m.i, m.j] = [m.j, m.i]; [m.relI, m.relJ] = [m.relJ, m.relI]; [m.sprI, m.sprJ] = [m.sprJ, m.sprI]; [m.trelI, m.trelJ] = [m.trelJ, m.trelI];
  return warn;
}
/* Tipo de unión de un extremo: rigid · pin (articulada, ambos ejes) · pinS (solo eje fuerte) · pinW (solo eje débil) · semi (resorte) */
function jointKind(m, e) {
  if (m['rel' + e]) return 'pin';
  const s = m['spr' + e]; if (!s) return 'rigid';
  const ok = v => v != null && isFinite(v) && v >= 0, hs = ok(s.s), hw = ok(s.w);
  if (!hs && !hw) return 'rigid';
  if (hs && hw && s.s === 0 && s.w === 0) return 'pin';
  if (hs && s.s === 0 && !hw) return 'pinS';
  if (hw && s.w === 0 && !hs) return 'pinW';
  return 'semi';
}
function copySelection(dx, dy, dz, count, link) {
  const ids = new Set(UI.sel.nodes); UI.sel.members.forEach(id => { const m = memberById(id); if (m) { ids.add(m.i); ids.add(m.j); } });
  if (!ids.size) { toast('Seleccioná nudos o barras para copiar'); return; }
  pushUndo(); let last = new Map([...ids].map(i => [i, i])); const newSel = [];
  const srcMembers = state.members.filter(m => ids.has(m.i) && ids.has(m.j) && (UI.sel.members.size ? UI.sel.members.has(m.id) : true));
  for (let c = 1; c <= count; c++) {
    const map = new Map();
    ids.forEach(i => {
      const n = nodeById(i); let nn = findNodeAt(n.x + dx * c, n.y + dy * c, n.z + dz * c);
      if (!nn) { nn = newNode(n.x + dx * c, n.y + dy * c, n.z + dz * c); nn.sup = [...n.sup]; nn.P = clone(n.P); nn.tag = n.tag; if (n.Mo) nn.Mo = clone(n.Mo); if (n.spr) nn.spr = [...n.spr]; if (n.sd) nn.sd = [...n.sd]; }
      map.set(i, nn.id); newSel.push(nn.id);
    });
    srcMembers.forEach(m => newMember(map.get(m.i), map.get(m.j), m));
    if (link) ids.forEach(i => newMember(last.get(i), map.get(i), {tag: '', q: {D: 0, L: 0, Hx: 0, Hy: 0}, loads: [], relI: false, relJ: false, sprI: null, sprJ: null, trelI: false, trelJ: false}));
    last = map;
  }
  UI.sel.members.clear(); UI.sel.nodes = new Set(newSel); afterEdit(); toast(`Copiado ×${count}`);
}
function moveSelection(dx, dy, dz) {
  const ids = new Set(UI.sel.nodes); UI.sel.members.forEach(id => { const m = memberById(id); if (m) { ids.add(m.i); ids.add(m.j); } });
  if (!ids.size) return; pushUndo(); ids.forEach(i => { const n = nodeById(i); n.x += dx; n.y += dy; n.z += dz; }); afterEdit();
}

