// js/ui/base.js
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   PANELES · RESULTADOS · ARCHIVOS
   ════════════════════════════════════════════════════════════════════════════ */
UI.tab = 'props'; UI.rtab = 'sum'; UI.barSort = 'id';
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2300); }
function setStatus() {
  const s = $('#status'), R = UI.results;
  if (UI.err) { s.className = 'status bad'; s.textContent = 'Error de cálculo'; }
  else if (!R) { s.className = 'status'; s.textContent = 'Sin calcular'; }
  else if (UI.stale) { s.className = 'status warn'; s.textContent = 'Modificado · recalcular'; }
  else { const bad = R.nFail + R.nDeflFail; s.className = 'status ' + (bad ? 'bad' : 'ok'); s.textContent = bad ? `${R.nFail} barra(s) no verifican` + (R.nDeflFail ? ` · ${R.nDeflFail} flecha(s)` : '') : `Verifica · r máx ${fmt(R.maxR ? R.maxR.r : 0, 2)}`; }
}
function confirmDlg(title, text) {
  return new Promise(res => {
    $('#dlgT').textContent = title; $('#dlgP').textContent = text; const d = $('#dlg'); d.hidden = false;
    const done = v => { d.hidden = true; $('#dlgYes').onclick = null; $('#dlgNo').onclick = null; res(v); };
    $('#dlgYes').onclick = () => done(true); $('#dlgNo').onclick = () => done(false);
  });
}
function showTab(t) { UI.tab = t; $$('.side .tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); $$('.side .pane').forEach(p => p.hidden = p.id !== 'pane-' + t); renderSide(); }
function showRTab(t) { UI.rtab = t; $$('.res .tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.rtab === t)); $$('.res .rpane').forEach(p => p.hidden = p.id !== 'r-' + t); renderResults(); }
function renderAll() { renderSide(); renderResults(); updTbSec(); scheduleDraw(); }
function updTbSec() { const s = $('#tbSec'); if (s) s.innerHTML = secOptions(UI.drawSec); }
$('#tbSec').onchange = e => { UI.drawSec = e.target.value; toast('Perfil de dibujo: ' + UI.drawSec); if (UI.tab === 'model') renderModel(); };
function renderSide() { ({props: renderProps, model: renderModel, loads: renderLoads, vis: renderVis})[UI.tab](); }

