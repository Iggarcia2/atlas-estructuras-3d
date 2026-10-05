// js/vista/dibujo.js
'use strict';
/* Dibujo 3D en SVG. */
/* ── dibujo ── */
let scrPos = new Map(), drawPending = false;
function scheduleDraw() { if (drawPending) return; drawPending = true; requestAnimationFrame(() => { drawPending = false; draw(); }); }
const PAL = ['#7aa2d6', '#2dd4bf', '#f59e0b', '#a78bfa', '#f472b6', '#4ade80', '#60a5fa', '#fb923c', '#22d3ee', '#e879f9'];
function secColor(name) { const names = [...new Set(state.members.map(m => m.sec))]; const k = names.indexOf(name); return PAL[(k < 0 ? 0 : k) % PAL.length]; }
function utilColor(r) { return r > 1 ? '#f87171' : r > 0.9 ? '#f59e0b' : r > 0.6 ? '#4ade80' : '#38bdf8'; }
function curCombo() { return state.combos[UI.comboIdx] || state.combos[0]; }
function resultsFresh() { return UI.results && !UI.stale; }

function draw() {
  const r = svg.getBoundingClientRect(); V.W = r.width; V.H = r.height; if (!V.W) return;
  scrPos = new Map(); state.nodes.forEach(n => scrPos.set(n.id, proj(n.x, n.y, n.z)));
  drawGrid(); drawModel(); drawOver(); drawAxes(); updPlaneTag();
}
function drawGrid() {
  if (!UI.showGrid) { gGrid.innerHTML = ''; return; }
  const b = modelBox(); let step = UI.grid; while (step * V.zoom < 9) step *= 5;
  const pad = Math.max(2 * step, 0.2 * b.diag), lo = [Math.min(b.min[0], 0) - pad, Math.min(b.min[1], 0) - pad, Math.min(b.min[2], 0) - pad], hi = [b.max[0] + pad, b.max[1] + pad, b.max[2] + pad];
  const ax = UI.plane === 'XY' ? [0, 1, 2] : UI.plane === 'XZ' ? [0, 2, 1] : [1, 2, 0];     // [eje u, eje v, eje normal]
  let u0 = Math.floor(lo[ax[0]] / step) * step, u1 = Math.ceil(hi[ax[0]] / step) * step, v0 = Math.floor(lo[ax[1]] / step) * step, v1 = Math.ceil(hi[ax[1]] / step) * step;
  while ((u1 - u0) / step > 90) step *= 2; u0 = Math.floor(lo[ax[0]] / step) * step; u1 = Math.ceil(hi[ax[0]] / step) * step; v0 = Math.floor(lo[ax[1]] / step) * step; v1 = Math.ceil(hi[ax[1]] / step) * step;
  const mk = (u, v) => { const p = [0, 0, 0]; p[ax[0]] = u; p[ax[1]] = v; p[ax[2]] = UI.planeVal; const q = proj(p[0], p[1], p[2]); return q.x.toFixed(1) + ',' + q.y.toFixed(1); };
  let h = '<g stroke-width="1" style="stroke:var(--grid)">', hm = '<g stroke-width="1" style="stroke:var(--grid2)">';
  for (let u = u0, k = 0; u <= u1 + 1e-6; u += step, k++) { const s = `<polyline fill="none" points="${mk(u, v0)} ${mk(u, v1)}"/>`; if (Math.round(u / step) % 5 === 0) hm += s; else h += s; }
  for (let v = v0; v <= v1 + 1e-6; v += step) { const s = `<polyline fill="none" points="${mk(u0, v)} ${mk(u1, v)}"/>`; if (Math.round(v / step) % 5 === 0) hm += s; else h += s; }
  h += '</g>'; hm += '</g>';
  const o = proj(0, 0, 0);
  gGrid.innerHTML = `<polygon points="${mk(u0, v0)} ${mk(u1, v0)} ${mk(u1, v1)} ${mk(u0, v1)}" style="fill:var(--accent-d);opacity:.35;stroke:var(--accent-b)" stroke-width="1"/>` + h + hm +
    `<g style="stroke:var(--muted)" stroke-width="1.2"><line x1="${o.x - 7}" y1="${o.y}" x2="${o.x + 7}" y2="${o.y}"/><line x1="${o.x}" y1="${o.y - 7}" x2="${o.x}" y2="${o.y + 7}"/></g>`;
}
function drawModel() {
  const R = UI.results, fresh = resultsFresh(), rmap = R ? R.rmap : null; let h = '';
  const items = [];
  for (const m of state.members) { const pa = scrPos.get(m.i), pb = scrPos.get(m.j); if (!pa || !pb) continue; items.push({m, pa, pb, d: (pa.d + pb.d) / 2}); }
  items.sort((p, q) => q.d - p.d);
  const dg = UI.diagram !== 'none' && R && fresh ? diagramSVG() : '';
  const defo = UI.diagram === 'def' && R && fresh ? deformedSVG() : '';
  for (const it of items) {
    const m = it.m, sel = UI.sel.members.has(m.id), spec = getSecSpec(state, m.sec), P = spec ? secProps(spec) : null;
    let col = UI.colorBy === 'util' && rmap && rmap.get(m.id) && !rmap.get(m.id).rigid ? utilColor(rmap.get(m.id).r) : (UI.colorBy === 'uniform' ? 'var(--steel)' : secColor(m.sec));
    if (P && P.rigid) col = 'var(--faint)';
    const w = P && P.rigid ? 1.6 : 2.2 + 2.2 * Math.min(1, (P ? P.A : 1500) / 6000);
    const op = (UI.colorBy === 'util' && rmap && !fresh) ? .45 : 1;
    h += `<g class="mem" data-k="m" data-id="${m.id}" style="cursor:pointer">`;
    if (sel) h += `<line x1="${it.pa.x.toFixed(1)}" y1="${it.pa.y.toFixed(1)}" x2="${it.pb.x.toFixed(1)}" y2="${it.pb.y.toFixed(1)}" style="stroke:var(--accent)" stroke-width="${w + 5}" opacity=".28" stroke-linecap="round"/>`;
    h += `<line x1="${it.pa.x.toFixed(1)}" y1="${it.pa.y.toFixed(1)}" x2="${it.pb.x.toFixed(1)}" y2="${it.pb.y.toFixed(1)}" stroke="${col}" style="stroke:${col}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" opacity="${op}"${P && P.rigid ? ' stroke-dasharray="3 3"' : ''}${sel ? ' filter="url(#glow)"' : ''}/>`;
    // uniones de extremo: o = articulada · o punteado = liberada en un solo eje · ◇ = semirrígida · | = torsión liberada
    const L = Math.hypot(it.pb.x - it.pa.x, it.pb.y - it.pa.y);
    if (L > 26 && !(P && P.rigid)) {
      const ux = (it.pb.x - it.pa.x) / L, uy = (it.pb.y - it.pa.y) / L;
      for (const e of ['I', 'J']) {
        const kd = jointKind(m, e), tr = !!m['trel' + e]; if (kd === 'rigid' && !tr) continue;
        const sg = e === 'I' ? 1 : -1, bx = (e === 'I' ? it.pa.x : it.pb.x) + sg * ux * 7, by = (e === 'I' ? it.pa.y : it.pb.y) + sg * uy * 7;
        if (kd === 'pin') h += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="3" style="fill:var(--canvas);stroke:${col}" stroke-width="1.3"/>`;
        else if (kd === 'pinS' || kd === 'pinW') h += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="3" style="fill:var(--canvas);stroke:${col}" stroke-width="1.3" stroke-dasharray="${kd === 'pinS' ? '2 1.4' : '1 1.4'}"/>`;
        else if (kd === 'semi') h += `<path d="M${(bx - 3.6).toFixed(1)} ${by.toFixed(1)}L${bx.toFixed(1)} ${(by - 3.6).toFixed(1)}L${(bx + 3.6).toFixed(1)} ${by.toFixed(1)}L${bx.toFixed(1)} ${(by + 3.6).toFixed(1)}Z" style="fill:var(--canvas);stroke:var(--load)" stroke-width="1.3"/>`;
        if (tr) { const tx = bx + sg * ux * 7, ty = by + sg * uy * 7; h += `<line x1="${(tx - uy * 3.5).toFixed(1)}" y1="${(ty + ux * 3.5).toFixed(1)}" x2="${(tx + uy * 3.5).toFixed(1)}" y2="${(ty - ux * 3.5).toFixed(1)}" style="stroke:${col}" stroke-width="1.6"/>`; }
      }
    }
    h += `<line x1="${it.pa.x.toFixed(1)}" y1="${it.pa.y.toFixed(1)}" x2="${it.pb.x.toFixed(1)}" y2="${it.pb.y.toFixed(1)}" stroke="transparent" stroke-width="13" style="pointer-events:stroke"/></g>`;
  }
  h += dg + defo;
  // nudos
  const nitems = state.nodes.map(n => ({n, p: scrPos.get(n.id)})).sort((p, q) => q.p.d - p.p.d);
  const sup = UI.showSup ? supportsSVG() : '';
  h += sup;
  for (const it of nitems) {
    const n = it.n, p = it.p, sel = UI.sel.nodes.has(n.id), isCh = UI.chain === n.id;
    h += `<g class="nd" data-k="n" data-id="${n.id}" style="cursor:pointer"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${sel || isCh ? 5.5 : 3.6}" style="fill:${sel ? 'var(--accent)' : 'var(--node-fill)'};stroke:${isCh ? 'var(--load)' : (sel ? 'var(--accent)' : 'var(--node)')}" stroke-width="1.6"${sel ? ' filter="url(#glow)"' : ''}/>` +
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="10" fill="transparent" style="pointer-events:all"/></g>`;
  }
  // etiquetas
  let lb = '';
  if (UI.lbl.nodes && state.nodes.length < 400) for (const it of nitems) lb += `<text x="${(it.p.x + 7).toFixed(1)}" y="${(it.p.y - 7).toFixed(1)}" font-size="9" style="fill:var(--muted);font-family:var(--mono)">${it.n.id}</text>`;
  if (UI.lbl.members || UI.lbl.secs) for (const it of items) {
    const m = it.m; let t = ''; if (UI.lbl.members) t += (m.tag || 'B' + m.id); if (UI.lbl.secs) t += (t ? ' · ' : '') + m.sec;
    lb += `<text x="${((it.pa.x + it.pb.x) / 2 + 4).toFixed(1)}" y="${((it.pa.y + it.pb.y) / 2 - 5).toFixed(1)}" font-size="9" style="fill:var(--steel);font-family:var(--mono)">${esc(t)}</text>`;
  }
  h += lb + (UI.showLoads !== 'none' ? loadsSVG() : '');
  gModel.innerHTML = h;
  // leyenda
  const lg = $('#legend');
  if (UI.colorBy === 'util' && R) { lg.hidden = false; lg.innerHTML = `<b style="color:var(--text)">Aprovechamiento r</b>${fresh ? '' : ' <span style="color:var(--warn)">(desactualizado)</span>'}<span><i style="background:#38bdf8"></i>r ≤ 0,60</span><span><i style="background:#4ade80"></i>0,60 – 0,90</span><span><i style="background:#f59e0b"></i>0,90 – 1,00</span><span><i style="background:#f87171"></i>r &gt; 1,00 (no verifica)</span>`; }
  else if (UI.colorBy === 'section') { const names = [...new Set(state.members.map(m => m.sec))]; if (names.length) { lg.hidden = false; lg.innerHTML = names.slice(0, 12).map(n => `<span><i style="background:${secColor(n)}"></i>${esc(n)}</span>`).join(''); } else lg.hidden = true; }
  else lg.hidden = true;
}
function axisScr(v) {                                   // proyección en pantalla de un eje global/local unitario: {x,y} unitario o null si es casi perpendicular a la vista
  const a = proj(V.c[0], V.c[1], V.c[2]), b = proj(V.c[0] + v[0] * 1000, V.c[1] + v[1] * 1000, V.c[2] + v[2] * 1000), dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
  return l < 25 ? null : {x: dx / l, y: dy / l, l};
}
function zigzag(x, y, ux, uy, len, stroke) {            // resorte dibujado desde (x,y) a lo largo de (ux,uy)
  const n = 6, amp = 4, nx = -uy, ny = ux, pts = [[x, y], [x + ux * 4, y + uy * 4]];
  for (let k = 1; k <= n; k++) { const d = 4 + (len - 8) * (k - 0.5) / n, sg = k % 2 ? 1 : -1; pts.push([x + ux * d + nx * amp * sg, y + uy * d + ny * amp * sg]); }
  pts.push([x + ux * (len - 4), y + uy * (len - 4)], [x + ux * len, y + uy * len]);
  return `<polyline fill="none" points="${pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" style="stroke:${stroke}" stroke-width="1.3"/>`;
}
function supportsSVG() {
  let h = '';
  for (const n of state.nodes) {
    const s = n.sup || [0, 0, 0, 0, 0, 0], spr = n.spr || [], sd = n.sd || [];
    const hasSup = s.some(v => v), hasSpr = spr.some((v, q) => v > 0 && !s[q]), hasSd = sd.some(v => v);
    if (!hasSup && !hasSpr && !hasSd) continue;
    const p = scrPos.get(n.id), x = p.x, y = p.y + 4;
    const all3 = s[0] && s[1] && s[2];
    if (hasSup) {
      if (all3 && s[3] && s[4] && s[5]) h += `<rect x="${x - 7}" y="${y}" width="14" height="9" style="fill:var(--steel);opacity:.55;stroke:var(--steel)"/><path d="M${x - 9} ${y + 12}H${x + 9}" style="stroke:var(--steel)" stroke-width="2"/>`;
      else if (all3) h += `<path d="M${x} ${y} L${x - 8} ${y + 12} L${x + 8} ${y + 12} Z" style="fill:var(--accent-d);stroke:var(--accent)" stroke-width="1.5"/>`;
      else if (!s[0] && !s[1] && s[2]) h += `<path d="M${x} ${y} L${x - 7} ${y + 10} L${x + 7} ${y + 10} Z" style="fill:none;stroke:var(--ok)" stroke-width="1.4"/><circle cx="${x - 3.5}" cy="${y + 13}" r="2.3" style="fill:none;stroke:var(--ok)"/><circle cx="${x + 3.5}" cy="${y + 13}" r="2.3" style="fill:none;stroke:var(--ok)"/>`;
      else h += `<path d="M${x} ${y} L${x + 6} ${y + 6} L${x} ${y + 12} L${x - 6} ${y + 6} Z" style="fill:var(--load-d);stroke:var(--load)" stroke-width="1.4"/><text x="${x + 9}" y="${y + 11}" font-size="8" style="fill:var(--load);font-family:var(--mono)">${['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'].filter((_, q) => s[q]).join('')}</text>`;
    }
    if (hasSpr) {                                        // resortes elásticos: zigzag en la dirección del GDL
      const axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], names = ['x', 'y', 'z']; let lab = [];
      for (let q = 0; q < 3; q++) if (spr[q] > 0 && !s[q]) {
        let u = axisScr(q === 2 ? [0, 0, -1] : axes[q]); if (!u) u = {x: 0, y: 1};
        h += zigzag(p.x, p.y + 3, u.x, u.y, 26, 'var(--ok)') + `<rect x="${(p.x + u.x * 26 - 4).toFixed(1)}" y="${(p.y + 3 + u.y * 26 - 1.5).toFixed(1)}" width="8" height="3" style="fill:var(--ok)"/>`;
        lab.push('k' + names[q] + '=' + fmt(spr[q], 0));
      }
      for (let q = 3; q < 6; q++) if (spr[q] > 0 && !s[q]) lab.push('kθ' + 'xyz'[q - 3] + '=' + fmt(spr[q], 0));
      if (lab.length) h += `<text x="${(p.x + 9).toFixed(1)}" y="${(p.y + 30).toFixed(1)}" font-size="8" style="fill:var(--ok);font-family:var(--mono)">${lab.join(' ')}</text>`;
    }
    if (hasSd) {
      const t = sd.map((v, q) => v ? 'Δ' + ['x', 'y', 'z', 'θx', 'θy', 'θz'][q] + '=' + fmt(v, 1) : '').filter(Boolean).join(' ');
      h += `<text x="${(p.x - 8).toFixed(1)}" y="${(p.y + 42).toFixed(1)}" text-anchor="end" font-size="8" style="fill:var(--bad);font-family:var(--mono)">${t}</text>`;
    }
  }
  return h;
}
