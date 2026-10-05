// js/ui/barra_herramientas.js
'use strict';
/* Barra de herramientas. */
/* ════════ BARRA DE HERRAMIENTAS ════════ */
$$('#modes .tb').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$$('#planes .tb[data-plane]').forEach(b => b.onclick = () => setPlane(b.dataset.plane));
$('#planeVal').onchange = e => { const v = pnum(e.target.value); if (isFinite(v)) UI.planeVal = v; e.target.value = fmt(UI.planeVal, 0); updPlaneTag(); scheduleDraw(); };
$('#planeFromNode').onclick = () => { const id = [...UI.sel.nodes][0]; const n = id != null ? nodeById(id) : null; if (!n) { toast('Seleccioná un nudo primero'); return; } UI.planeVal = UI.plane === 'XY' ? n.z : UI.plane === 'XZ' ? n.y : n.x; $('#planeVal').value = fmt(UI.planeVal, 0); updPlaneTag(); scheduleDraw(); };
$('#gridStep').onchange = e => { UI.grid = +e.target.value; scheduleDraw(); };
$('#snapBtn').onclick = e => { UI.snap = !UI.snap; e.currentTarget.classList.toggle('on', UI.snap); toast(UI.snap ? 'Snap a grilla activado' : 'Snap a grilla desactivado'); };
$$('#views .tb').forEach(b => b.onclick = () => setViewPreset(b.dataset.view));
$('#calcBtn').onclick = runCalc; $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
$$('.side .tabs .tab').forEach(b => b.onclick = () => showTab(b.dataset.tab));
$$('.res .tabs .tab').forEach(b => b.onclick = () => showRTab(b.dataset.rtab));
$('#zIn').onclick = () => doZoom(1.25); $('#zOut').onclick = () => doZoom(0.8); $('#zFit').onclick = fitView;

