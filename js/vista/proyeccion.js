// js/vista/proyeccion.js
'use strict';
/* Proyección ortogonal con órbita, plano de trabajo y snap. */
/* ── proyección ── */
function proj(x, y, z) {
  const dx = x - V.c[0], dy = y - V.c[1], dz = z - V.c[2];
  const cy = Math.cos(V.yaw), sy = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
  const xp = dx * cy + dy * sy, yp = -dx * sy + dy * cy, up = dz * cp + yp * sp, dep = yp * cp - dz * sp;
  return {x: V.W / 2 + V.pan.x + xp * V.zoom, y: V.H / 2 + V.pan.y - up * V.zoom, d: dep};
}
function planeHit(sx, sy, plane, val) {                // intersección del rayo de pantalla con el plano de trabajo
  const cy = Math.cos(V.yaw), sy_ = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
  const xp = (sx - V.W / 2 - V.pan.x) / V.zoom, up = -(sy - V.H / 2 - V.pan.y) / V.zoom;
  let dep, den;
  if (plane === 'XY') { den = sp; if (Math.abs(den) < 0.12) return null; dep = (up * cp - (val - V.c[2])) / sp; }
  else if (plane === 'XZ') { den = cp * cy; if (Math.abs(den) < 0.12) return null; dep = ((val - V.c[1]) - xp * sy_ - up * sp * cy) / (cp * cy); }
  else { den = cp * sy_; if (Math.abs(den) < 0.12) return null; dep = (xp * cy - (val - V.c[0]) - up * sp * sy_) / (cp * sy_); }
  const yp = up * sp + dep * cp, dz = up * cp - dep * sp, dx = xp * cy - yp * sy_, dy = xp * sy_ + yp * cy;
  return {x: V.c[0] + dx, y: V.c[1] + dy, z: V.c[2] + dz};
}
function modelBox() {
  if (!state.nodes.length) return {min: [-1000, -1000, 0], max: [4000, 3000, 2000], diag: 5000};
  const mn = [1e18, 1e18, 1e18], mx = [-1e18, -1e18, -1e18];
  state.nodes.forEach(n => { [n.x, n.y, n.z].forEach((v, k) => { mn[k] = Math.min(mn[k], v); mx[k] = Math.max(mx[k], v); }); });
  return {min: mn, max: mx, diag: Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1000};
}
function fitView() {
  const r = svg.getBoundingClientRect(); V.W = r.width || 800; V.H = r.height || 600;
  const b = modelBox(); V.c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]; V.pan = {x: 0, y: 0}; V.zoom = 1;
  let x0 = 1e18, x1 = -1e18, y0 = 1e18, y1 = -1e18;
  const pts = state.nodes.length ? state.nodes.map(n => [n.x, n.y, n.z]) : [[b.min[0], b.min[1], b.min[2]], [b.max[0], b.max[1], b.max[2]]];
  pts.forEach(p => { const q = proj(p[0], p[1], p[2]); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
  const w = Math.max(x1 - x0, 1), h = Math.max(y1 - y0, 1);
  V.zoom = Math.max(1e-4, Math.min((V.W - 120) / w, (V.H - 120) / h));
  scheduleDraw();
}
function setViewPreset(v) {
  document.querySelectorAll('#views .tb').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'top') { V.yaw = 0; V.pitch = PI / 2; setPlane('XY'); }
  else if (v === 'front') { V.yaw = 0; V.pitch = 0; setPlane('XZ'); }
  else if (v === 'side') { V.yaw = PI / 2; V.pitch = 0; setPlane('YZ'); }
  else { V.yaw = -38 * PI / 180; V.pitch = 28 * PI / 180; }
  fitView();
}

/* ── plano de trabajo y snap ── */
function setPlane(p, keepVal) {
  UI.plane = p; if (!keepVal) UI.planeVal = 0; $$('#planes .tb[data-plane]').forEach(b => b.classList.toggle('on', b.dataset.plane === p));
  $('#planeVal').value = fmt(UI.planeVal, 0); updPlaneTag(); scheduleDraw();
}
function updPlaneTag() { const ax = {XY: 'Z', XZ: 'Y', YZ: 'X'}[UI.plane]; $('#planeTag').textContent = `Plano ${UI.plane} · ${ax} = ${fmt(UI.planeVal, 0)} mm`; }
const snapv = v => UI.snap ? Math.round(v / UI.grid) * UI.grid : Math.round(v * 10) / 10;
function pickCursor(sx, sy, shift) {
  let best = null, bd = 1e9;
  for (const n of state.nodes) { const s = scrPos.get(n.id); if (!s) continue; const d = Math.hypot(s.x - sx, s.y - sy); if (d < bd) { bd = d; best = n; } }
  if (best && bd <= 13) return {x: best.x, y: best.y, z: best.z, node: best.id};
  const h = planeHit(sx, sy, UI.plane, UI.planeVal); if (!h) return null;
  let p = {x: h.x, y: h.y, z: h.z};
  if (UI.plane === 'XY') { p.x = snapv(h.x); p.y = snapv(h.y); p.z = UI.planeVal; } else if (UI.plane === 'XZ') { p.x = snapv(h.x); p.z = snapv(h.z); p.y = UI.planeVal; } else { p.y = snapv(h.y); p.z = snapv(h.z); p.x = UI.planeVal; }
  if (shift && UI.chain && nodeById(UI.chain)) {      // ortogonal respecto del último nudo
    const a = nodeById(UI.chain), d = [p.x - a.x, p.y - a.y, p.z - a.z]; const ax = d.map(Math.abs); const k = ax.indexOf(Math.max(...ax));
    p = {x: a.x, y: a.y, z: a.z}; if (k === 0) p.x += d[0]; else if (k === 1) p.y += d[1]; else p.z += d[2];
  }
  return p;
}

