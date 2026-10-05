// js/vista/interaccion.js
'use strict';
/* Interacción con el ratón y el teclado. */
/* ── interacción ── */
let drag = null; const ptrs = new Map(); let pinch = null;
function svgXY(e) { const r = svg.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; }
svg.addEventListener('contextmenu', e => e.preventDefault());
svg.addEventListener('wheel', e => {
  e.preventDefault(); const p = svgXY(e); const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const xp = (p.x - V.W / 2 - V.pan.x) / V.zoom, up = -(p.y - V.H / 2 - V.pan.y) / V.zoom; V.zoom = Math.max(1e-4, Math.min(50, V.zoom * f));
  V.pan.x = p.x - V.W / 2 - xp * V.zoom; V.pan.y = p.y - V.H / 2 + up * V.zoom; scheduleDraw();
}, {passive: false});
svg.addEventListener('pointerdown', e => {
  try { svg.setPointerCapture(e.pointerId); } catch (_) {}
  ptrs.set(e.pointerId, svgXY(e));
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), z: V.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, pan: {...V.pan}}; drag = null; return; }
  const p = svgXY(e), btn = e.button, tgt = e.target.closest ? e.target.closest('[data-k]') : null;
  if (btn === 1 || (btn === 0 && UI.mode === 'pan')) { drag = {type: 'pan', x: e.clientX, y: e.clientY, pan: {...V.pan}}; e.preventDefault(); return; }
  if (btn === 2 || (btn === 0 && (UI.mode === 'orbit' || e.altKey))) { drag = {type: 'orbit', x: e.clientX, y: e.clientY, yaw: V.yaw, pitch: V.pitch, right: btn === 2, moved: false}; return; }
  if (btn !== 0) return;
  if (UI.mode === 'select') {
    if (tgt && tgt.dataset.k === 'n') {
      const id = +tgt.dataset.id, n = nodeById(id);
      if (e.shiftKey) { UI.sel.nodes.has(id) ? UI.sel.nodes.delete(id) : UI.sel.nodes.add(id); } else if (!UI.sel.nodes.has(id)) { UI.sel.nodes.clear(); UI.sel.members.clear(); UI.sel.nodes.add(id); }
      const val = UI.plane === 'XY' ? n.z : UI.plane === 'XZ' ? n.y : n.x, h0 = planeHit(p.x, p.y, UI.plane, val);
      const orig = new Map(); UI.sel.nodes.forEach(i => { const q = nodeById(i); orig.set(i, [q.x, q.y, q.z]); });
      drag = {type: 'node', id, h0, val, orig, moved: false, sx: p.x, sy: p.y}; if (!h0) toast('Para mover nudos elegí un plano de trabajo no paralelo a la vista (tecla T)'); renderProps(); scheduleDraw(); return;
    }
    if (tgt && tgt.dataset.k === 'm') { drag = {type: 'mclick', id: +tgt.dataset.id, shift: e.shiftKey, sx: p.x, sy: p.y, moved: false}; return; }
    drag = {type: 'box', x0: p.x, y0: p.y, x1: p.x, y1: p.y, moved: false, shift: e.shiftKey}; return;
  }
  if (UI.mode === 'node' || UI.mode === 'bar') { drag = {type: 'draw', sx: p.x, sy: p.y, shift: e.shiftKey, moved: false}; return; }
});
svg.addEventListener('pointermove', e => {
  const p = svgXY(e); if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const nz = Math.max(1e-4, Math.min(50, pinch.z * d / pinch.d)); const xp = (pinch.cx - V.W / 2 - pinch.pan.x) / pinch.z, up = -(pinch.cy - V.H / 2 - pinch.pan.y) / pinch.z;
    V.zoom = nz; V.pan.x = cx - V.W / 2 - xp * nz; V.pan.y = cy - V.H / 2 + up * nz; scheduleDraw(); return;
  }
  if (drag) {
    if (drag.type === 'pan') { V.pan.x = drag.pan.x + e.clientX - drag.x; V.pan.y = drag.pan.y + e.clientY - drag.y; scheduleDraw(); return; }
    if (drag.type === 'orbit') {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      V.yaw = drag.yaw - dx * 0.008; V.pitch = Math.max(-PI / 2, Math.min(PI / 2, drag.pitch + dy * 0.008)); scheduleDraw(); return;
    }
    if (drag.type === 'node') {
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 4) { drag.moved = true; pushUndo(); }
      if (drag.moved && drag.h0) {
        const h = planeHit(p.x, p.y, UI.plane, drag.val); if (h) {
          const o = drag.orig.get(drag.id); let d = [h.x - drag.h0.x, h.y - drag.h0.y, h.z - drag.h0.z];
          if (UI.snap) { const nx = [o[0] + d[0], o[1] + d[1], o[2] + d[2]]; const ax = UI.plane === 'XY' ? [0, 1] : UI.plane === 'XZ' ? [0, 2] : [1, 2]; ax.forEach(k => { d[k] = snapv(nx[k]) - o[k]; }); }
          if (UI.plane === 'XY') d[2] = 0; else if (UI.plane === 'XZ') d[1] = 0; else d[0] = 0;
          drag.orig.forEach((q, i) => { const n = nodeById(i); n.x = q[0] + d[0]; n.y = q[1] + d[1]; n.z = q[2] + d[2]; });
          UI.ver++; markStale(); scheduleDraw();
        }
      }
      return;
    }
    if (drag.type === 'mclick' || drag.type === 'draw') { if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 4) drag.moved = true; }
    if (drag.type === 'box') { drag.x1 = p.x; drag.y1 = p.y; if (Math.hypot(drag.x1 - drag.x0, drag.y1 - drag.y0) > 4) drag.moved = true; scheduleDraw(); return; }
  }
  if (UI.mode === 'node' || UI.mode === 'bar') { UI.cursor = pickCursor(p.x, p.y, e.shiftKey); drawOver(); }
  else { const h = planeHit(p.x, p.y, UI.plane, UI.planeVal); if (h) $('#readout').textContent = `X ${fmt(h.x, 0)} · Y ${fmt(h.y, 0)} · Z ${fmt(h.z, 0)}`; }
});
function endPtr(e) {
  const p = svgXY(e); ptrs.delete(e.pointerId); if (pinch && ptrs.size < 2) { pinch = null; drag = null; return; }
  const d = drag; drag = null; if (!d) return;
  if (d.type === 'orbit') { if (d.right && !d.moved && UI.chain) { UI.chain = null; scheduleDraw(); } return; }
  if (d.type === 'node') { if (d.moved) { afterEdit(); } else { renderProps(); scheduleDraw(); } return; }
  if (d.type === 'mclick' && !d.moved) {
    if (d.shift) { UI.sel.members.has(d.id) ? UI.sel.members.delete(d.id) : UI.sel.members.add(d.id); } else { UI.sel.nodes.clear(); UI.sel.members.clear(); UI.sel.members.add(d.id); }
    renderProps(); scheduleDraw(); if (UI.sel.members.size) showTab('props'); return;
  }
  if (d.type === 'box') {
    if (!d.moved) { if (!d.shift) { UI.sel.nodes.clear(); UI.sel.members.clear(); } renderProps(); scheduleDraw(); return; }
    if (!d.shift) { UI.sel.nodes.clear(); UI.sel.members.clear(); }
    const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
    const inside = id => { const s = scrPos.get(id); return s && s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1; };
    state.nodes.forEach(n => { if (inside(n.id)) UI.sel.nodes.add(n.id); }); state.members.forEach(m => { if (inside(m.i) && inside(m.j)) UI.sel.members.add(m.id); });
    renderProps(); scheduleDraw(); return;
  }
  if (d.type === 'draw' && !d.moved) {
    const c = pickCursor(p.x, p.y, d.shift); if (!c) { toast('El plano de trabajo es paralelo a la vista: rotá o cambiá de plano'); return; }
    if (UI.mode === 'node') { if (c.node) { toast('Ya existe un nudo ahí'); return; } pushUndo(); const n = newNode(c.x, c.y, c.z); UI.sel.nodes.clear(); UI.sel.members.clear(); UI.sel.nodes.add(n.id); afterEdit(); return; }
    if (UI.mode === 'bar') {
      pushUndo(); const nn = c.node ? nodeById(c.node) : getOrAddNode(c.x, c.y, c.z);
      if (UI.chain && UI.chain !== nn.id) { const m = newMember(UI.chain, nn.id); if (m) { UI.sel.members.clear(); UI.sel.nodes.clear(); UI.sel.members.add(m.id); } }
      UI.chain = nn.id; afterEdit(); updHint();
    }
  }
}
svg.addEventListener('pointerup', endPtr); svg.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch = null; drag = null; });
svg.addEventListener('dblclick', e => { if (UI.mode === 'bar') { UI.chain = null; scheduleDraw(); updHint(); } });
svg.addEventListener('pointerleave', () => { if (!drag) { UI.cursor = null; gOver.innerHTML = ''; } });

function setMode(m) {
  UI.mode = m; if (m !== 'bar') UI.chain = null; $$('#modes .tb').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); svg.setAttribute('class', 'm-' + m); updHint(); scheduleDraw();
}
function updHint() {
  const t = {select: 'Clic: seleccionar · Shift: sumar · arrastrá un nudo para moverlo en el plano · arrastrá el vacío: selección por ventana · Supr: borrar',
    node: 'Clic: agregar un nudo en el plano de trabajo (snap a grilla y nudos) · Esc: salir',
    bar: UI.chain ? `Clic: siguiente nudo (nudo ${UI.chain} activo) · Shift: ortogonal · Enter / Esc / doble clic / clic derecho: terminar la cadena` : 'Clic: primer nudo de la barra · Shift: ortogonal · clic derecho / Esc: cortar la cadena',
    orbit: 'Arrastrá para rotar la vista · rueda: zoom · también clic derecho en cualquier modo', pan: 'Arrastrá para mover la vista · también rueda apretada'};
  $('#hint').textContent = t[UI.mode];
}
function doZoom(f) { const x = V.W / 2, y = V.H / 2; const xp = (x - V.W / 2 - V.pan.x) / V.zoom, up = -(y - V.H / 2 - V.pan.y) / V.zoom; V.zoom = Math.max(1e-4, Math.min(50, V.zoom * f)); V.pan.x = x - V.W / 2 - xp * V.zoom; V.pan.y = y - V.H / 2 + up * V.zoom; scheduleDraw(); }

document.addEventListener('keydown', e => {
  const t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); undo(); return; }
  if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
  if (ctrl && (k === 'a' || k === 'A')) { e.preventDefault(); UI.sel.nodes = new Set(state.nodes.map(n => n.id)); UI.sel.members = new Set(state.members.map(m => m.id)); renderProps(); scheduleDraw(); return; }
  if (ctrl) return;
  const lk = k.toLowerCase();
  if (lk === 's') setMode('select'); else if (lk === 'n') setMode('node'); else if (lk === 'b') setMode('bar'); else if (lk === 'o') setMode('orbit'); else if (lk === 'p') setMode('pan');
  else if (k === '1') setViewPreset('top'); else if (k === '2') setViewPreset('front'); else if (k === '3') setViewPreset('side'); else if (k === '4') setViewPreset('iso');
  else if (lk === 'f') fitView(); else if (lk === 't') setPlane({XY: 'XZ', XZ: 'YZ', YZ: 'XY'}[UI.plane]);
  else if (k === 'Escape') { UI.chain = null; if (UI.mode !== 'select') setMode('select'); else { UI.sel.nodes.clear(); UI.sel.members.clear(); renderProps(); } scheduleDraw(); }
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); delSelection(); }
  else if (k === 'Enter') { if (UI.chain) { UI.chain = null; updHint(); scheduleDraw(); } else runCalc(); }
  else if (k === '+' || k === '=') doZoom(1.2); else if (k === '-') doZoom(1 / 1.2);
});
new ResizeObserver(() => scheduleDraw()).observe($('#canvasBox'));
