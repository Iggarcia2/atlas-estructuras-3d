// js/ui/panel_cargas.js
'use strict';
/* Pestaña «Cargas». */
/* ── CARGAS ── */
const padF = f => { const a = (f || []).slice(0, CASES.length); while (a.length < CASES.length) a.push(0); return a; };
const fmtF = v => { let s = (+v).toFixed(3).replace('.', ','); s = s.replace(/0+$/, '').replace(/,$/, ''); return s; };
function facText(f) {
  let s = ''; f.forEach((v, q) => { if (!v) return; const a = Math.abs(v); s += (v < 0 ? ' − ' : (s ? ' + ' : '')) + (a === 1 ? '' : fmtF(a)) + CASES[q]; });
  return s.trim() || '—';
}
function renderLoads() {
  const pane = $('#pane-loads'); if (UI.tab !== 'loads') return; const S = state.settings;
  let h = `<div class="hdr">Material y criterio</div><div class="r3">${fld('E (MPa)', 's.E', fmt(S.E, 0))}${fld('G (MPa)', 's.G', fmt(S.G, 0))}${fld('Fy (MPa)', 's.Fy', fmt(S.Fy, 0))}</div>${chk('Incluir peso propio de los perfiles', 's.selfWeight', S.selfWeight)}`;
  h += `<div class="hdr">Opciones de análisis</div>` +
    selb('Orden de análisis', 's.order', [[1, '1 · primer orden (lineal)'], [2, '2 · segundo orden P-Δ + P-δ']], S.order, 'i') +
    chk('Deformación por corte en las barras (Timoshenko)', 's.shearDef', S.shearDef) +
    (S.order === 2 ? chk('Rigidez reducida DAM (0,8·EA y 0,8·τb·EI)', 's.dam', S.dam) : '') +
    selb('Cb de volcamiento', 's.cbMode', [['real', 'Del diagrama de momentos (F1-2)'], ['unit', 'Cb = 1,0 (conservador)']], S.cbMode || 'real', 's');
  h += S.order === 2
    ? `<div class="note"><b>Segundo orden:</b> cada combinación se resuelve en forma no lineal con la carga axial de cada barra (P-Δ entre nudos y P-δ dentro de la barra, con funciones de estabilidad exactas). Los momentos del diseño ya vienen amplificados: no se aplican B1/B2 aparte. Para el pandeo de columnas con rigidez nominal usá el K de nudos desplazables donde corresponda. ${S.dam ? '<b>DAM:</b> el programa reduce la rigidez pero <b>no agrega cargas ficticias</b>; cargalas vos como horizontales (0,2 % de la carga gravitatoria de cada nivel).' : ''}</div>`
    : `<div class="note"><b>Primer orden:</b> sin efectos P-Δ ni P-δ. Si la estructura es esbelta o desplazable, pasá a segundo orden: ahí cada barra muestra su amplificación.</div>`;
  h += `<div class="hdr">Cargas en barras seleccionadas</div><div class="flab">Distribuidas uniformes rápidas (kN/m)</div><div class="r2"><div class="field"><label>D · permanente ↓</label><input id="aqD" value="0"></div><div class="field"><label>L · sobrecarga ↓</label><input id="aqL" value="0"></div><div class="field"><label>Hx (+X)</label><input id="aqHx" value="0"></div><div class="field"><label>Hy (+Y)</label><input id="aqHy" value="0"></div></div><button class="btn" id="btnApplyQ">Aplicar a ${UI.sel.members.size} barra(s)</button>`;
  h += det('ldnew2', '＋ Carga puntual, parcial, trapezoidal, momento o temperatura', ldBuilderHTML(), false);
  h += `<div class="note">Las cargas se aplican sobre las barras seleccionadas, en direcciones globales (gravedad ↓, +X, +Y, +Z) o en los ejes locales. Las cargas de cada nudo (fuerzas, momentos, resortes y asentamientos) se editan en <b>Propiedades</b>.</div>`;
  h += `<div class="hdr">Combinaciones (${state.combos.length})</div>` + state.combos.slice(0, 40).map(c => `<div class="list-item" data-combo="1"><span class="dot" style="background:${c.type === 'ULS' ? 'var(--accent)' : 'var(--violet)'}"></span><span class="a">${esc(c.n)}</span><span class="b">${c.type}</span></div>`).join('') + (state.combos.length > 40 ? `<div class="note">… y ${state.combos.length - 40} más</div>` : '');
  h += `<button class="btn" id="btnCombos" style="margin-top:6px">Editar combinaciones y generadores (LRFD, viento, sismo)…</button>`;
  pane.innerHTML = h;
}
$('#pane-loads').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.det) UI.det[d.dataset.det] = d.open; }, true);
$('#pane-loads').addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.ldd != null) { ldChange(el); return; }
  if (el.dataset.b && el.dataset.b.startsWith('s.')) {
    const k = el.dataset.b.slice(2), t = el.dataset.t;
    if (t === 'c') state.settings[k] = el.checked;
    else if (t === 's') state.settings[k] = el.value;
    else if (t === 'i') state.settings[k] = Math.round(pnum(el.value)) === 2 ? 2 : 1;
    else { const v = pnum(el.value); if (!(v > 0)) { toast('Valor inválido'); renderLoads(); return; } state.settings[k] = v; }
    pushUndo(); afterEdit(); return;
  }
});
$('#pane-loads').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.ldadd) { ldAdd(); return; }
  if (t.id === 'btnCombos') { openComboDlg(); return; }
  if (t.id === 'btnApplyQ') {
    if (!UI.sel.members.size) { toast('Seleccioná barras primero'); return; }
    const q = ['D', 'L', 'Hx', 'Hy'].map(k => pnum($('#aq' + k).value)); if (!q.every(isFinite)) { toast('Valores inválidos'); return; }
    pushUndo(); UI.sel.members.forEach(id => { const m = memberById(id); m.q = Object.assign({}, m.q, {D: q[0], L: q[1], Hx: q[2], Hy: q[3]}); }); afterEdit(); toast('Cargas aplicadas');
  }
});
$('#pane-loads').addEventListener('click', e => { if (e.target.closest('.list-item[data-combo]')) openComboDlg(); });

