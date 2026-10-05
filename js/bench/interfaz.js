// js/bench/interfaz.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EJERCICIOS DE VERIFICACIÓN · diálogo, pestaña «Verificación» del panel de resultados y exportación
   ════════════════════════════════════════════════════════════════════════════ */
const BX_GROUPS = [
  ['apuntes', 'Con resultado publicado', 'Ejemplos de libros y apuntes de cátedra: se comparan contra los números impresos'],
  ['clasico', 'Soluciones clásicas', 'Fórmulas cerradas de resistencia de materiales y análisis estructural'],
  ['reglamento', 'Fórmulas del Reglamento', 'CIRSOC 301-2005 recalculado aparte (no es un libro: confirma la implementación)']];
let BX_RES = null;
UI.bench = null; UI.benchSel = null;
const bxNum = v => { if (v == null || !isFinite(v)) return '—'; if (v === 0) return '0'; const a = Math.abs(v); return (a >= 1e6 || a < 1e-3 ? v.toExponential(4) : String(+v.toPrecision(7))).replace('.', ','); };
const bxErr = q => {
  if (q.err == null) return 'Δ ' + bxNum(q.diff);
  if (Math.abs(q.err) < 5e-7) return '0,0000 %';
  return (q.err > 0 ? '+' : '') + (q.err * 100).toFixed(4).replace('.', ',') + ' %';
};
const bxTol = q => (Math.abs(q.theory) < 1e-9 || q.tol <= 0) ? '± ' + bxNum(q.atol) + ' (abs.)' : '± ' + bxNum(q.tol * 100) + ' %';
function bxRunAll() {
  BX_RES = new Map();
  BENCH.forEach(ex => { try { BX_RES.set(ex.id, runBench(ex)); } catch (e) { BX_RES.set(ex.id, {ex, ok: false, error: 'Error interno: ' + e.message, rows: [], pass: false, params: []}); } });
}
const bxOrder = () => { const o = BX_GROUPS.map(g => g[0]); return BENCH.slice().sort((a, b) => o.indexOf(a.grupo) - o.indexOf(b.grupo) || (a.id > b.id ? 1 : -1)); };
function bxPill(r) { return r.ok ? (r.pass ? '<span class="pill ok">verifica</span>' : '<span class="pill bad">difiere</span>') : '<span class="pill bad">error</span>'; }
function bxTable(rows) {
  let h = `<div class="tw"><table class="t"><thead><tr><th class="l">Comprobación</th><th class="l">Unidad</th><th>Teoría / publicado</th><th>Programa</th><th>Diferencia</th><th>Tolerancia</th><th class="l">Estado</th></tr></thead><tbody>`;
  rows.forEach(q => {
    h += `<tr><td class="l" style="white-space:normal;min-width:240px">${esc(q.label)}${q.pub ? ' <span class="pill warn" title="Valor impreso en la fuente">publicado</span>' : ''}</td><td class="l">${esc(q.unit)}</td><td>${bxNum(q.theory)}</td><td>${bxNum(q.program)}</td><td>${bxErr(q)}</td><td>${bxTol(q)}</td><td class="l"><span class="pill ${q.ok ? 'ok' : 'bad'}">${q.ok ? 'OK' : 'NO'}</span></td></tr>`;
    if (q.note) h += `<tr><td class="l" colspan="7" style="white-space:normal;color:var(--muted);font-size:10px;padding-top:0">${esc(q.note)}</td></tr>`;
  });
  return h + '</tbody></table></div>';
}
function bxSource(ex) { const s = ex.fuente || {}; return s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:var(--accent)">${esc(s.t)}</a>` : esc(s.t || ''); }
function bxDetail(ex, r) {
  const gl = {apuntes: 'Resultado publicado', clasico: 'Solución clásica', reglamento: 'Fórmulas del Reglamento'}[ex.grupo];
  let h = `<div class="bx-title"><span class="bx-id">${esc(ex.id)}</span><b>${esc(ex.titulo)}</b> ${bxPill(r)}</div>`;
  h += `<div class="note"><b>${gl}.</b> Fuente: ${bxSource(ex)}</div><p>${esc(ex.enunciado)}</p>`;
  if (ex.perfil) h += `<div class="note">${esc(ex.perfil)}</div>`;
  if (!r.ok) return h + `<div class="msg bad">${esc(r.error || 'No se pudo calcular el modelo del ejercicio')}</div>`;
  const np = r.rows.filter(q => q.ok).length;
  h += `<div class="hdr">Comparación · ${np} de ${r.rows.length} comprobaciones dentro de tolerancia</div>` + bxTable(r.rows);
  h += `<div class="row" style="justify-content:flex-start;margin:12px 0"><button class="tb on" data-bx-load="${esc(ex.id)}">Cargar en el lienzo y calcular</button><button class="tb" data-bx-xls="${esc(ex.id)}">Excel de este ejercicio</button></div>`;
  h += `<details><summary style="cursor:pointer;color:var(--muted);font-size:11px;margin-bottom:8px">Datos del ejercicio y fórmulas (${r.params.length} valores)</summary><div class="tw"><table class="t"><thead><tr><th class="l">Dato</th><th>Valor</th><th class="l">Unidad</th><th class="l">Fórmula</th><th class="l">Descripción</th></tr></thead><tbody>` +
    r.params.map(p => `<tr><td class="l">${esc(p.name)}</td><td>${bxNum(p.value)}</td><td class="l">${esc(p.unit)}</td><td class="l">${p.expr ? '= ' + esc(p.expr) : ''}</td><td class="l" style="white-space:normal">${esc(p.desc)}</td></tr>`).join('') + `</tbody></table></div></details>`;
  h += `<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--muted);font-size:11px">Expresiones de la «teoría» de cada fila</summary><div class="note" style="margin-top:6px;font-family:var(--mono);white-space:pre-wrap">` + r.rows.map(q => esc(q.label) + '  →  ' + esc(q.expr)).join('\n') + `</div></details>`;
  return h;
}
function renderBench() {
  if (!BX_RES) bxRunAll();
  const all = [...BX_RES.values()], rows = all.reduce((n, r) => n + r.rows.length, 0), okRows = all.reduce((n, r) => n + r.rows.filter(q => q.ok).length, 0), okEx = all.filter(r => r.ok && r.pass).length;
  const pubRows = all.reduce((n, r) => n + r.rows.filter(q => q.pub).length, 0);
  $('#bxSum').innerHTML = `<span class="pill ${okEx === all.length ? 'ok' : 'bad'}">${okEx} de ${all.length} ejercicios verifican</span> <span style="color:var(--muted);font-size:10px">${okRows} de ${rows} comprobaciones · ${pubRows} contra números publicados</span>`;
  let l = '';
  BX_GROUPS.forEach(([g, t, s]) => {
    const items = bxOrder().filter(e => e.grupo === g); if (!items.length) return;
    l += `<div class="bx-gh" title="${esc(s)}">${esc(t)}</div>`;
    items.forEach(e => { const r = BX_RES.get(e.id); l += `<div class="bx-it${e.id === UI.benchSel ? ' on' : ''}" data-bx="${esc(e.id)}"><span class="bx-id">${esc(e.id)}</span><span class="bx-t">${esc(e.titulo)}</span>${bxPill(r)}</div>`; });
  });
  $('#bxList').innerHTML = l;
  const ex = BENCH.find(e => e.id === UI.benchSel) || bxOrder()[0]; UI.benchSel = ex.id;
  $('#bxDet').innerHTML = bxDetail(ex, BX_RES.get(ex.id));
}
function openBench() { bxRunAll(); if (!UI.benchSel) UI.benchSel = UI.bench || bxOrder()[0].id; renderBench(); $('#benchDlg').hidden = false; }
function closeBench() { $('#benchDlg').hidden = true; }
async function bxLoad(id) {
  const ex = BENCH.find(e => e.id === id); if (!ex) return;
  if (state.nodes.length && !UI.bench && !(await confirmDlg('Cargar el ejercicio ' + id, 'Se reemplaza el modelo actual por el del ejercicio. Si lo necesitás, guardalo antes con el botón Guardar. ¿Continuar?'))) return;
  const b = benchBuild(ex);
  loadModelObj(clone(b.st), ex.id + ' · ' + ex.titulo); UI.bench = id; UI.showLoads = 'D'; UI.nextRTab = 'ver';
  closeBench(); runCalc(); toast('Ejercicio ' + id + ' cargado: resultados en la pestaña Verificación');
}
/* pestaña «Verificación»: compara el modelo que está en el lienzo (con sus resultados) contra la teoría del ejercicio */
function renderVerTab() {
  const ex = UI.bench && BENCH.find(e => e.id === UI.bench);
  if (!ex) return `<div class="empty">Esta pestaña compara los resultados del programa con los de un ejercicio de libro.<br>Abrí la lista de ejercicios y presioná «Cargar en el lienzo y calcular».<br><br><button class="tb on" data-bx-open>Ejercicios de verificación…</button></div>`;
  const R = UI.results;
  if (!R) return `<div class="empty">Ejercicio ${esc(ex.id)} cargado. Presioná <b>▶ Calcular</b> para ver la comparación.</div>`;
  let rows, err = null;
  try { rows = benchCompare(ex, benchParams(ex).vals, state, R); } catch (e) { err = e.message; }
  if (err) return `<div class="msg bad">El modelo del lienzo ya no corresponde al ejercicio ${esc(ex.id)} (${esc(err)}). Volvé a cargarlo desde la lista.</div><div style="margin-top:8px"><button class="tb on" data-bx-open>Ejercicios de verificación…</button></div>`;
  const ok = rows.every(q => q.ok), np = rows.filter(q => q.ok).length;
  let h = (resultsFresh() ? '' : `<div class="msg warn" style="margin-bottom:8px">El modelo cambió desde el último cálculo: presioná ▶ Calcular para actualizar la comparación.</div>`);
  h += `<div class="bx-title"><span class="bx-id">${esc(ex.id)}</span><b>${esc(ex.titulo)}</b> <span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'el programa coincide con la teoría' : 'hay diferencias'}</span> <span style="color:var(--muted);font-size:10px">${np} de ${rows.length} comprobaciones</span></div>`;
  h += `<div class="note" style="margin-bottom:8px"><b>Fuente:</b> ${bxSource(ex)}<br>${esc(ex.enunciado)}</div>` + bxTable(rows) + `<div style="margin-top:8px"><button class="tb" data-bx-open>Lista de ejercicios…</button></div>`;
  return h;
}
/* exportación a Excel (valores; el informe con fórmulas vivas se entrega aparte) */
function bxExport(only) {
  if (!BX_RES) bxRunAll();
  const list = bxOrder().filter(e => !only || e.id === only), res = [['ID', 'Grupo', 'Ejercicio', 'Fuente', 'Enlace', 'Comprobaciones', 'Dentro de tolerancia', 'Estado']], det = [['ID', 'Comprobación', 'Unidad', 'Expresión de la teoría', 'Teoría / publicado', 'Programa', 'Diferencia', 'Error %', 'Tolerancia', 'Estado', 'Publicado en la fuente', 'Nota']];
  list.forEach(e => { const r = BX_RES.get(e.id); res.push([e.id, e.grupo, e.titulo, (e.fuente || {}).t || '', (e.fuente || {}).url || '', r.rows.length, r.rows.filter(q => q.ok).length, r.ok && r.pass ? 'verifica' : 'difiere']);
    r.rows.forEach(q => det.push([e.id, q.label, q.unit, q.expr, q.theory, q.program, q.diff, q.err == null ? '' : q.err * 100, bxTol(q), q.ok ? 'OK' : 'NO', q.pub ? 'sí' : '', q.note])); });
  const name = 'Verificacion_Atlas' + (only ? '_' + only : '');
  if (typeof XLSX === 'undefined') { const csv = det.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n'); download(name + '.csv', new Blob(['﻿' + csv], {type: 'text/csv'})); toast('Sin la librería Excel: se exportó CSV'); return; }
  const wb = XLSX.utils.book_new();
  [['Resumen', res], ['Detalle', det]].forEach(([n, a]) => { const ws = XLSX.utils.aoa_to_sheet(a); ws['!cols'] = a[0].map((_, k) => ({wch: Math.min(60, Math.max(10, ...a.slice(0, 60).map(r => String(r[k] == null ? '' : r[k]).length)))})); XLSX.utils.book_append_sheet(wb, ws, n); });
  XLSX.writeFile(wb, name + '.xlsx'); toast('Excel de verificación exportado');
}
$('#benchBtn').onclick = openBench;
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-bx-open]')) { openBench(); return; }
  const it = t.closest('#bxList [data-bx]'); if (it) { UI.benchSel = it.dataset.bx; renderBench(); $('#bxDet').scrollTop = 0; return; }
  const ld = t.closest('[data-bx-load]'); if (ld) { bxLoad(ld.dataset.bxLoad); return; }
  const xl = t.closest('[data-bx-xls]'); if (xl) { bxExport(xl.dataset.bxXls); return; }
  if (t.id === 'bxClose' || t.id === 'benchDlg') closeBench();
  if (t.id === 'bxXls') bxExport(null);
  if (t.id === 'bxRerun') { bxRunAll(); renderBench(); toast('Ejercicios recalculados con el motor actual'); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#benchDlg').hidden && $('#dlg').hidden) closeBench(); });
