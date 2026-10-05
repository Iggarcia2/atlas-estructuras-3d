// js/ui/edicion.js
'use strict';
/* Edición de campos y cargas de barra desde los paneles. */
/* ── edición ── */
function parseField(el) {
  const t = el.dataset.t; if (t === 'c') return el.checked; if (t === 's') return el.value;
  if (t === 'o') { if (el.value.trim() === '') return null; const v = pnum(el.value); return isFinite(v) ? v : NaN; }
  return pnum(el.value);
}
function setJointKind(ms, e, kind) {
  ms.forEach(m => {
    m['rel' + e] = false; m['spr' + e] = null;
    if (kind === 'pin') m['rel' + e] = true; else if (kind === 'pinS') m['spr' + e] = {s: 0}; else if (kind === 'pinW') m['spr' + e] = {w: 0};
    else if (kind === 'semi') m['spr' + e] = {s: kthRef(m), w: null};
  });
}
function jointField(ms, e, f, v) {
  ms.forEach(m => {
    if (f === 't') { m['trel' + e] = !!v; return; }
    if (v != null && v < 0) v = 0;
    const sp = Object.assign({}, m['spr' + e] || {}); sp[f] = v; m['spr' + e] = sp;
  });
}
function applyLdField(ld, f, el) {
  if (f === 'c' || f === 'dir') { ld[f] = el.value; return true; }
  if (f === 'k') { ld.k = el.value; return true; }
  if (f === 'b' && el.value.trim() === '') { ld.b = null; return true; }
  const v = pnum(el.value); if (!isFinite(v)) return false;
  if (f === 'alpha') ld.alpha = v * 1e-6; else ld[f] = v;
  return true;
}
function ldChange(el) {
  const draft = el.dataset.ldd != null, key = draft ? el.dataset.ldd : el.dataset.ldm;
  if (draft) {
    const d = UI.ldDraft, kOld = d.k;
    if (!applyLdField(d, key, el)) { toast('Valor inválido'); renderSide(); return; }
    if (key === 'c') d.dir = CASE_DIR[d.c] || 'grav';
    if (key === 'k') { if (d.k === 'TH') d.c = 'T'; else if (kOld === 'TH') { d.c = 'D'; d.dir = 'grav'; } }
    renderSide(); return;
  }
  const [i, f] = key.split('.'), m = memberById([...UI.sel.members][0]); if (!m || !m.loads || !m.loads[+i]) return;
  const L = memberLen(m), ld = m.loads[+i]; pushUndo();
  if (!applyLdField(ld, f, el)) { toast('Valor inválido'); renderProps(); return; }
  if (f === 'a' || f === 'b') { if (ld.a != null) ld.a = Math.min(L, Math.max(0, ld.a)); if (ld.b != null) ld.b = Math.min(L, Math.max(0, ld.b)); if ((ld.k === 'U' || ld.k === 'T') && ld.b != null && ld.b <= ld.a) { toast('«hasta b» debe ser mayor que «desde a»'); } }
  delete ld.gen; afterEdit();
}
function ldAdd() {
  const ms = [...UI.sel.members].map(memberById).filter(Boolean); if (!ms.length) { toast('Seleccioná barras primero'); return; }
  const d = clone(UI.ldDraft), k = d.k; let ld = {k, c: d.c};
  if (k !== 'TH') ld.dir = d.dir;
  if (k === 'U') { ld.w1 = d.w1; ld.a = d.a || 0; ld.b = d.b; }
  else if (k === 'T') { ld.w1 = d.w1; ld.w2 = d.w2; ld.a = d.a || 0; ld.b = d.b; }
  else if (k === 'P') { ld.F = d.F; ld.a = d.a || 0; }
  else if (k === 'M') { ld.M = d.M; ld.a = d.a || 0; }
  else { ld.dT = d.dT; ld.dTy = d.dTy; ld.dTz = d.dTz; ld.alpha = d.alpha; }
  const val = k === 'U' ? ld.w1 : k === 'T' ? (ld.w1 || ld.w2) : k === 'P' ? ld.F : k === 'M' ? ld.M : (ld.dT || ld.dTy || ld.dTz);
  if (!val) { toast('La carga vale 0: completá el valor'); return; }
  pushUndo(); let bad = 0;
  ms.forEach(m => {
    const L = memberLen(m), c = clone(ld);
    if (c.a != null) { if (c.a > L) { c.a = L; bad++; } c.a = Math.max(0, c.a); }
    if (c.b != null) { if (c.b > L) { c.b = L; bad++; } }
    if ((k === 'U' || k === 'T') && c.b != null && c.b <= c.a) { bad++; return; }
    m.loads = m.loads || []; m.loads.push(c);
  });
  afterEdit(); toast(`Carga agregada a ${ms.length - 0} barra(s)` + (bad ? ' (posiciones ajustadas al largo)' : ''));
}
function bindLoadEditor(pane) {
  pane.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.ldadd) { ldAdd(); return; }
    if (t.dataset.lddel != null) { e.preventDefault(); e.stopPropagation(); const m = memberById([...UI.sel.members][0]); if (!m) return; pushUndo(); m.loads.splice(+t.dataset.lddel, 1); afterEdit(); }
  });
}
$('#pane-props').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.det) UI.det[d.dataset.det] = d.open; }, true);
$('#pane-props').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.ldd != null || el.dataset.ldm != null) { ldChange(el); return; }
  if (el.dataset.jt != null) { if (!el.value) return; pushUndo(); setJointKind([...UI.sel.members].map(memberById).filter(Boolean), el.dataset.jt, el.value); afterEdit(); return; }
  const b = el.dataset.b; if (!b) return; const parts = b.split('.');
  let v = parseField(el); if (v !== null && typeof v === 'number' && !isFinite(v)) { toast('Valor inválido'); renderProps(); return; }
  if (v === null && el.dataset.t !== 'o') { toast('Valor inválido'); renderProps(); return; }
  if (b === 'm.sec' && v === '') return;
  pushUndo();
  if (parts[0] === 'jt') { jointField([...UI.sel.members].map(memberById).filter(Boolean), parts[1], parts[2], v); afterEdit(); return; }
  const targets = parts[0] === 'n' ? [...UI.sel.nodes].map(nodeById) : [...UI.sel.members].map(memberById);
  const coord = parts[0] === 'n' && ['x', 'y', 'z'].includes(parts[1]);
  (coord ? targets.slice(0, 1) : targets).forEach(o => {
    if (!o) return; let r = o;
    for (let k = 1; k < parts.length - 1; k++) {
      if (r[parts[k]] == null) r[parts[k]] = /^\d+$/.test(parts[k + 1]) ? (parts[k] === 'spr' || parts[k] === 'sd' ? [0, 0, 0, 0, 0, 0] : [0, 0, 0]) : {};
      r = r[parts[k]];
    }
    const last = parts[parts.length - 1]; if (Array.isArray(r)) r[+last] = (el.dataset.t === 'c') ? (v ? 1 : 0) : v; else r[last] = v;
  });
  if (parts[1] === 'P') targets.forEach(n => { n.P = n.P || {}; ['D', 'L', 'H'].forEach(k => { if (!n.P[k]) n.P[k] = [0, 0, 0]; }); });
  afterEdit();
});
$('#pane-props').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.sup) { pushUndo(); UI.sel.nodes.forEach(i => { nodeById(i).sup = [...SUP_PRESETS[t.dataset.sup]]; }); afterEdit(); return; }
  if (t.dataset.nc) { UI.nodeCase = t.dataset.nc; renderProps(); return; }
  if (t.id === 'btnDelSel' || t.id === 'btnDelSel2') { delSelection(); return; }
  if (t.id === 'btnPlaneNode') { const n = nodeById([...UI.sel.nodes][0]); UI.planeVal = UI.plane === 'XY' ? n.z : UI.plane === 'XZ' ? n.y : n.x; $('#planeVal').value = fmt(UI.planeVal, 0); scheduleDraw(); toast('Plano llevado al nudo'); return; }
  if (t.id === 'btnSplit') { const n = pnum(prompt2('Dividir la barra en cuántos tramos?', '2')); if (n >= 2 && n <= 50) splitMember([...UI.sel.members][0], Math.round(n)); return; }
  if (t.id === 'btnFlip') { pushUndo(); const w = flipMember(memberById([...UI.sel.members][0])); afterEdit(); if (w) toast('Barra invertida: revisá las cargas en ejes locales'); }
});
bindLoadEditor($('#pane-props'));
function prompt2(q, def) { try { return window.prompt(q, def); } catch (_) { return def; } }

