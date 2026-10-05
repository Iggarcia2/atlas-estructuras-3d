// js/ui/resultados.js
'use strict';
/* Panel de resultados. */
/* ════════ RESULTADOS ════════ */
function kpi(l, v, u, cls, sub) { return `<div class="kpi ${cls || ''}"><div class="l">${l}</div><div class="v">${v}<small>${u || ''}</small></div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`; }
function bomData() {
  const rows = new Map(), tags = new Map(); let kg = 0, len = 0;
  for (const m of state.members) {
    const a = nodeById(m.i), b = nodeById(m.j), spec = getSecSpec(state, m.sec); if (!a || !b || !spec) continue; const P = secProps(spec);
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), w = P.kg * L / 1000;
    const add = (map, key, extra) => { let r = map.get(key); if (!r) { r = Object.assign({n: 0, L: 0, kg: 0, lens: []}, extra); map.set(key, r); } r.n++; r.L += L; r.kg += w; r.lens.push(Math.round(L)); };
    add(rows, m.sec, {sec: m.sec, kgm: P.kg, rigid: P.rigid}); add(tags, (m.tag || '—') + '|' + m.sec, {tag: m.tag || '—', sec: m.sec, kgm: P.kg, rigid: P.rigid});
    if (!P.rigid) { kg += w; len += L; }
  }
  return {sec: [...rows.values()], tag: [...tags.values()], kg, len};
}
function lensTxt(lens) { const c = new Map(); lens.forEach(l => c.set(l, (c.get(l) || 0) + 1)); return [...c.entries()].sort((a, b) => b[0] - a[0]).map(([l, n]) => `${n}×${l}`).join(' · '); }
function ampKpi(R) {
  let best = null; R.checks.forEach(c => { if (!c.rigid && c.best && c.best.amp != null && (!best || c.best.amp > best.best.amp)) best = c; });
  if (!best) return '';
  const a = best.best.amp; return kpi('Amplificación 2.º orden máx.', fmt(a, 3), '×', a > 1.5 ? 'bad' : a > 1.1 ? 'warn' : 'ok', `B${best.id} ${esc(best.tag)} · ${esc(best.best.combo)}`);
}
function renderResults() {
  const t = UI.rtab, el = $('#r-' + t); if (!el) return; const R = UI.results, fresh = resultsFresh();
  const note = R && !fresh ? `<div class="msg warn" style="margin-bottom:8px">El modelo cambió desde el último cálculo: los resultados están desactualizados. Presioná ▶ Calcular.</div>` : '';
  if (t === 'bom') { el.innerHTML = renderBom(); return; }
  if (t === 'ver') { el.innerHTML = renderVerTab(); return; }
  if (!R) { el.innerHTML = UI.err ? `<div class="msgs"><div class="msg bad">${esc(UI.err)}</div></div>` : `<div class="empty">Sin resultados todavía.<br>Dibujá o cargá un modelo y presioná <b>▶ Calcular</b> (Enter).</div>`; if (UI.badNode) el.innerHTML += `<button class="btn" data-goto="${UI.badNode}">Ir al nudo ${UI.badNode}</button>`; return; }
  if (t === 'sum') {
    const mx = R.maxR, eq = R.eq, rmax = mx ? mx.r : 0, c1 = R.slsName || '';
    const sumD = -eq[0].applied[2], sumL = -eq[1].applied[2], eqErr = Math.max(...eq.map(e => e.err));
    let h = note + `<div class="kpis">` + kpi('Nudos / barras', `${state.nodes.length} / ${state.members.length}`, '') + kpi('Peso de perfiles', fmt(R.weight, 0), 'kg') + kpi('Carga D total', fmt(sumD, 1), 'kN') + kpi('Carga L total', fmt(sumL, 1), 'kN') +
      kpi('r máximo', fmt(rmax, 2), '', rmax > 1 ? 'bad' : rmax > 0.9 ? 'warn' : 'ok', mx ? `B${mx.id} ${esc(mx.tag)} · ${esc(mx.sec)}` : '') +
      kpi('Flecha vertical máx.', R.maxUz ? fmt(Math.abs(R.maxUz.v), 1) : '—', 'mm', R.nDeflFail ? 'bad' : 'ok', R.maxUz ? `nudo ${R.maxUz.id} · ${esc(c1)}` : '') +
      kpi('Barras que no verifican', R.nFail, '', R.nFail ? 'bad' : 'ok') + kpi('Flechas que no verifican', R.nDeflFail, '', R.nDeflFail ? 'bad' : 'ok') + kpi('Equilibrio ΣF', fmt(eqErr, 4), 'kN', eqErr < 0.01 ? 'ok' : 'bad') + (R.order === 2 ? ampKpi(R) : '') + `</div><div class="msgs">`;
    if (R.nFail) h += `<div class="msg bad">No verifican por resistencia: ${R.checks.filter(c => !c.rigid && c.r > 1).sort((a, b) => b.r - a.r).slice(0, 8).map(c => `B${c.id} ${esc(c.tag)} (r=${fmt(c.r, 2)})`).join(', ')}.</div>`;
    if (R.nDeflFail) h += `<div class="msg bad">Flechas fuera de límite: ${R.defl.filter(d => d.ratio > 1).slice(0, 6).map(d => `B${d.id} ${esc(d.tag)} (${fmt(d.d, 1)} mm &gt; ${fmt(d.lim, 1)})`).join(', ')}.</div>`;
    if (!R.nFail && !R.nDeflFail) h += `<div class="msg ok">Todas las barras verifican por resistencia (r ≤ 1) y las flechas de servicio están dentro de los límites.</div>`;
    R.msgs.forEach(m => h += `<div class="msg warn">${esc(m.s)}</div>`);
    h += `<div class="msg">${R.order === 2 ? 'Análisis de <b>segundo orden</b> (P-Δ y P-δ, una solución por combinación' + (R.dam ? ', con rigidez reducida DAM' : '') + ').' : 'Análisis lineal de <b>primer orden</b> (sin P-Δ ni P-δ).'}${R.shearDef ? ' Con deformación por corte.' : ''} Verificación de barras según CIRSOC 301-2005 / AISC LRFD: tracción, compresión con pandeo flexional, flexo-torsional y local (Q), flexión con volcamiento (${state.settings.cbMode === 'unit' ? 'Cb = 1' : 'Cb del diagrama de momentos'}) y pandeo local de ala y alma, corte e interacción H1 en cada sección de la barra. No incluye uniones, anclajes, tracción en sección neta ni alabeo restringido. Resultados de un modelo simplificado: deben ser revisados y firmados por el profesional responsable.</div></div>`;
    el.innerHTML = h;
  } else if (t === 'nodes') {
    const c = curCombo();
    let h = note + `<div class="field" style="max-width:340px"><label>Combinación</label><select id="rCombo">${state.combos.map((x, k) => `<option value="${k}"${k === UI.comboIdx ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div><div class="tw"><table class="t"><thead><tr><th>Nudo</th><th>X</th><th>Y</th><th>Z</th><th class="l">Apoyo</th><th>Ux (mm)</th><th>Uy (mm)</th><th>Uz (mm)</th><th>Rx (mrad)</th><th>Ry (mrad)</th><th>Rz (mrad)</th></tr></thead><tbody>`;
    R.nodes.forEach((n, i) => { const u = nodeDisp(R, i, c.f), s = ['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'].map((d, q) => n.sup[q] ? d : (R.kspr && R.kspr[6 * i + q] > 0 ? 'k' + d : '')).filter(Boolean).join(' '); h += `<tr data-n="${n.id}" class="${UI.sel.nodes.has(n.id) ? 'sel' : ''}"><td>N${n.id}</td><td>${fmt(n.x, 0)}</td><td>${fmt(n.y, 0)}</td><td>${fmt(n.z, 0)}</td><td class="l">${s || '—'}</td><td>${fmt(u[0], 2)}</td><td>${fmt(u[1], 2)}</td><td>${fmt(u[2], 2)}</td><td>${fmt(u[3] * 1000, 2)}</td><td>${fmt(u[4] * 1000, 2)}</td><td>${fmt(u[5] * 1000, 2)}</td></tr>`; });
    el.innerHTML = h + '</tbody></table></div>';
  } else if (t === 'bars') {
    const rows = R.checks.filter(c => !c.rigid).slice(); if (UI.barSort === 'r') rows.sort((a, b) => b.r - a.r);
    const o2 = R.order === 2;
    let h = note + `<div class="tw"><table class="t"><thead><tr><th data-sort="id" style="cursor:pointer">Barra</th><th class="l">Pos.</th><th class="l">Perfil</th><th>L (mm)</th><th>Compr. (kN)</th><th>Tracc. (kN)</th><th>M fuerte (kN·m)</th><th>M débil (kN·m)</th><th>Corte (kN)</th><th>Cb</th>${o2 ? '<th>Amp.</th>' : ''}<th data-sort="r" style="cursor:pointer">r ▾</th><th class="l">Combinación</th><th class="l">Gobierna</th><th class="l">Estado</th></tr></thead><tbody>`;
    rows.forEach(c => { const b = c.best, g = b.gov || {}; h += `<tr data-m="${c.id}" class="${UI.sel.members.has(c.id) ? 'sel' : ''}"><td>B${c.id}</td><td class="l">${esc(c.tag)}</td><td class="l">${esc(c.sec)}</td><td>${fmt(c.L, 0)}</td><td>${fmt(b.Pc / 1e3, 1)}</td><td>${fmt(b.Pt / 1e3, 1)}</td><td>${fmt(b.Ms / 1e6, 2)}</td><td>${fmt(b.Mw / 1e6, 2)}</td><td>${fmt(Math.max(b.Vs, b.Vw) / 1e3, 1)}</td><td>${fmt(b.Cb, 2)}</td>${o2 ? `<td>${b.amp != null ? fmt(b.amp, 3) : '—'}</td>` : ''}<td><b>${fmt(c.r, 2)}</b></td><td class="l">${esc(b.combo)}</td><td class="l">${b.rV > b.rH ? 'corte' : esc(g.eq || '')} @${fmt(b.x, 0)}</td><td class="l"><span class="pill ${c.r > 1 ? 'bad' : c.r > 0.9 ? 'warn' : 'ok'}">${c.r > 1 ? 'NO VERIFICA' : 'VERIFICA'}</span></td></tr>`; });
    el.innerHTML = h + '</tbody></table></div>';
  } else if (t === 'reac') {
    const c = curCombo(), uls = R.combos.map((x, k) => ({x, k})).filter(o => o.x.type === 'ULS');
    let h = note + `<div class="field" style="max-width:340px"><label>Combinación</label><select id="rCombo">${state.combos.map((x, k) => `<option value="${k}"${k === UI.comboIdx ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div><div class="tw"><table class="t"><thead><tr><th>Nudo</th><th class="l">Descripción</th><th>Fx (kN)</th><th>Fy (kN)</th><th>Fz (kN)</th><th>Mx (kN·m)</th><th>My (kN·m)</th><th>Mz (kN·m)</th><th>Fz mín ULS</th><th>Fz máx ULS</th><th>H máx ULS</th></tr></thead><tbody>`;
    let sx = 0, sy = 0, sz = 0;
    R.reacNodes.forEach(i => {
      const n = R.nodes[i], re = nodeReac(R, i, c.f); sx += re[0]; sy += re[1]; sz += re[2]; let zmin = 1e18, zmax = -1e18, hmax = 0;
      uls.forEach(o => { const q = nodeReac(R, i, o.x.f); zmin = Math.min(zmin, q[2]); zmax = Math.max(zmax, q[2]); hmax = Math.max(hmax, Math.hypot(q[0], q[1])); });
      const fx = q => R.fixed[6 * i + q]; const cell = (q) => fx(q) ? fmt(re[q], 2) : '—';
      h += `<tr data-n="${n.id}"><td>N${n.id}</td><td class="l">${esc((n.tag || '').slice(0, 44))}</td><td>${cell(0)}</td><td>${cell(1)}</td><td>${cell(2)}</td><td>${cell(3)}</td><td>${cell(4)}</td><td>${cell(5)}</td><td>${uls.length ? fmt(zmin, 2) : '—'}</td><td>${uls.length ? fmt(zmax, 2) : '—'}</td><td>${uls.length ? fmt(hmax, 2) : '—'}</td></tr>`;
    });
    h += `<tr><td colspan="2" class="l"><b>Σ reacciones</b></td><td><b>${fmt(sx, 2)}</b></td><td><b>${fmt(sy, 2)}</b></td><td><b>${fmt(sz, 2)}</b></td><td colspan="6"></td></tr>`;
    el.innerHTML = h + `</tbody></table></div><div class="note" style="margin-top:8px">Fuerza que el apoyo ejerce sobre la estructura (Fz positiva = hacia arriba; negativa = arrancamiento). Reacciones por combinación; la última columna es la fuerza horizontal máxima en estado último.</div>`;
  } else if (t === 'defl') {
    const rows = R.defl.slice().sort((a, b) => b.ratio - a.ratio);
    let h = note + `<div class="tw"><table class="t"><thead><tr><th>Barra</th><th class="l">Pos.</th><th class="l">Combinación</th><th>δ (mm)</th><th>Límite (mm)</th><th>δ / límite</th><th class="l">Estado</th></tr></thead><tbody>`;
    rows.forEach(d => { h += `<tr data-m="${d.id}"><td>B${d.id}</td><td class="l">${esc(d.tag)}${d.cant ? ' (voladizo)' : ''}</td><td class="l">${esc(d.combo)}</td><td>${fmt(d.d, 2)}</td><td>${fmt(d.lim, 1)}</td><td>${fmt(d.ratio, 2)}</td><td class="l"><span class="pill ${d.ratio > 1 ? 'bad' : 'ok'}">${d.ratio > 1 ? 'NO VERIFICA' : 'VERIFICA'}</span></td></tr>`; });
    el.innerHTML = h + `</tbody></table></div><div class="note" style="margin-top:8px">Flecha relativa a la cuerda entre los nudos extremos de cada barra (en voladizos: respecto de la tangente en el empotramiento, con límite 2L/n). Es la flecha de la barra; no incluye el descenso de sus apoyos.</div>`;
  }
}
function renderBom() {
  const d = bomData();
  if (!state.members.length) return `<div class="empty">Sin barras en el modelo.</div>`;
  let h = `<div class="kpis">${kpi('Peso total de perfiles', fmt(d.kg, 1), 'kg')}${kpi('Longitud total', fmt(d.len / 1000, 2), 'm')}${kpi('Piezas', state.members.length, '')}</div>`;
  h += `<div class="hdr">Por perfil</div><div class="tw"><table class="t"><thead><tr><th class="l">Perfil</th><th>Piezas</th><th>Longitud total (m)</th><th>kg/m</th><th>Peso (kg)</th><th class="l">Largos (mm)</th></tr></thead><tbody>` +
    d.sec.sort((a, b) => b.kg - a.kg).map(r => `<tr><td class="l">${esc(r.sec)}${r.rigid ? ' <span class="pill">vínculo</span>' : ''}</td><td>${r.n}</td><td>${fmt(r.L / 1000, 2)}</td><td>${fmt(r.kgm, 2)}</td><td>${fmt(r.kg, 1)}</td><td class="l" style="white-space:normal;max-width:420px">${lensTxt(r.lens)}</td></tr>`).join('') + `<tr><td class="l"><b>Total</b></td><td><b>${state.members.length}</b></td><td><b>${fmt(d.len / 1000, 2)}</b></td><td></td><td><b>${fmt(d.kg, 1)}</b></td><td></td></tr></tbody></table></div>`;
  h += `<div class="hdr" style="margin-top:12px">Por posición</div><div class="tw"><table class="t"><thead><tr><th class="l">Pos.</th><th class="l">Perfil</th><th>Piezas</th><th>Longitud total (m)</th><th>Peso (kg)</th><th class="l">Largos (mm)</th></tr></thead><tbody>` +
    d.tag.sort((a, b) => (a.tag > b.tag ? 1 : -1)).map(r => `<tr><td class="l">${esc(r.tag)}</td><td class="l">${esc(r.sec)}</td><td>${r.n}</td><td>${fmt(r.L / 1000, 2)}</td><td>${fmt(r.kg, 1)}</td><td class="l" style="white-space:normal;max-width:420px">${lensTxt(r.lens)}</td></tr>`).join('') + `</tbody></table></div>
    <div class="note" style="margin-top:8px">Largos entre ejes de nudos; no incluye cartelas, placas, bulones, grating ni barandas.</div>`;
  return h;
}
document.addEventListener('change', e => { if (e.target.id === 'rCombo') { UI.comboIdx = +e.target.value; _stCache.key = ''; renderResults(); scheduleDraw(); } });
$('.res').addEventListener('click', e => {
  const s = e.target.closest('[data-sort]'); if (s) { UI.barSort = s.dataset.sort; renderResults(); return; }
  const g = e.target.closest('[data-goto]'); if (g) { UI.sel.nodes = new Set([+g.dataset.goto]); UI.sel.members.clear(); showTab('props'); scheduleDraw(); return; }
  const tr = e.target.closest('tr[data-n],tr[data-m]'); if (!tr) return;
  if (tr.dataset.n) { UI.sel.nodes = new Set([+tr.dataset.n]); UI.sel.members.clear(); } else { UI.sel.members = new Set([+tr.dataset.m]); UI.sel.nodes.clear(); }
  if (UI.tab === 'props') renderProps(); scheduleDraw(); $$('.res tr.sel').forEach(r => r.classList.remove('sel')); tr.classList.add('sel');
});

