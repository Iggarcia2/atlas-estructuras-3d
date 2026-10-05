// js/vista/estado.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ESTADO · CÁMARA · DIBUJO 3D (SVG, proyección ortogonal con órbita) · INTERACCIÓN
   Misma dinámica que Hydra: modos, pan/zoom, plano de trabajo con snap, undo/redo.
   ════════════════════════════════════════════════════════════════════════════ */
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const fmt = (v, d) => { if (d == null) d = 2; if (v == null || !isFinite(v)) return '—'; let s = (+v).toFixed(d); if (/^-0(\.0+)?$/.test(s)) s = s.slice(1); return s.replace('.', ','); };
function pnum(raw) {                                   // acepta coma o punto decimal
  if (raw == null) return NaN; let s = String(raw).trim().replace(/\s/g, ''); if (!s) return NaN;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc >= 0 && ld >= 0) { if (lc > ld) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, ''); } else if (lc >= 0) s = s.replace(',', '.');
  const v = Number(s); return isFinite(v) ? v : NaN;
}
const DEF_SET = () => ({E: 200000, G: 77200, Fy: 235, selfWeight: true, order: 1, shearDef: false, dam: false, cbMode: 'real'});
const state = {name: 'Modelo nuevo', ver: 2, nodes: [], members: [], customSections: {}, combos: clone(DEF_COMBOS), settings: DEF_SET()};
/* Normaliza un modelo (archivo, historial) al formato actual (ver 2). Los archivos anteriores usaban Wx/Wy para las horizontales: pasan a Hx/Hy. */
function normModel(o) {
  const legacy = (o.ver || 1) < 2, NCs = CASES.length;
  const nodes = (o.nodes || []).map(n => Object.assign({}, n, {id: n.id, x: +n.x, y: +n.y, z: +n.z, sup: (n.sup || [0, 0, 0, 0, 0, 0]).map(v => v ? 1 : 0), P: Object.assign({D: [0, 0, 0], L: [0, 0, 0], H: [0, 0, 0]}, n.P || {}), tag: n.tag || ''}));
  const members = (o.members || []).map(m => {
    const q = Object.assign({}, m.q || {});
    if (legacy) { q.Hx = q.Wx || 0; q.Hy = q.Wy || 0; delete q.Wx; delete q.Wy; }
    return Object.assign({beta: 0, relI: false, relJ: false, K: 1, tag: ''}, m, {q: Object.assign({D: 0, L: 0, Hx: 0, Hy: 0}, q)});
  });
  let combos = (o.combos && o.combos.length) ? o.combos : clone(DEF_COMBOS);
  combos = combos.map(c => { const f = (c.f || []).slice(0, NCs); while (f.length < NCs) f.push(0); return Object.assign({}, c, {f}); });
  return {name: o.name, ver: 2, nodes, members, customSections: o.customSections || {}, combos, settings: Object.assign(DEF_SET(), o.settings || {})};
}
const UI = {
  mode: 'select', plane: 'XY', planeVal: 0, grid: 250, snap: true, sel: {nodes: new Set(), members: new Set()}, chain: null, cursor: null,
  drawSec: 'UPN 120', colorBy: 'section', showLoads: 'none', showSup: true, lbl: {nodes: true, members: false, secs: false}, diagram: 'none', defScale: 0,
  comboIdx: 7, results: null, stale: true, err: null, nextN: 1, nextM: 1, ver: 0, showGrid: true, pinned: false
};
const V = {yaw: -38 * PI / 180, pitch: 28 * PI / 180, zoom: 0.1, pan: {x: 0, y: 0}, c: [0, 0, 0], W: 800, H: 600};
const hist = {u: [], r: []};
const svg = $('#view');
const gGrid = $('#gGrid'), gModel = $('#gModel'), gOver = $('#gOver'), gAxes = $('#gAxes');

