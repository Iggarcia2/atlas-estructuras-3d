// js/vista/historial.js
'use strict';
/* Historial deshacer/rehacer. */
/* ── historial ── */
const snapJSON = () => JSON.stringify({name: state.name, ver: 2, nodes: state.nodes, members: state.members, customSections: state.customSections, combos: state.combos, settings: state.settings}, (k, v) => k[0] === '_' ? undefined : v);
function restoreJSON(s) {
  const o = normModel(JSON.parse(s)); state.name = o.name; state.ver = 2; state.nodes = o.nodes; state.members = o.members; state.customSections = o.customSections;
  state.combos = o.combos; state.settings = o.settings;
  UI.nextN = state.nodes.reduce((m, n) => Math.max(m, n.id), 0) + 1; UI.nextM = state.members.reduce((m, n) => Math.max(m, n.id), 0) + 1;
}
function pushUndo() { hist.u.push(snapJSON()); if (hist.u.length > 120) hist.u.shift(); hist.r = []; updUndo(); }
function undo() { if (!hist.u.length) return; hist.r.push(snapJSON()); restoreJSON(hist.u.pop()); afterEdit(true); }
function redo() { if (!hist.r.length) return; hist.u.push(snapJSON()); restoreJSON(hist.r.pop()); afterEdit(true); }
function updUndo() { $('#undoBtn').disabled = !hist.u.length; $('#redoBtn').disabled = !hist.r.length; }
function markStale() { UI.ver++; if (UI.results) UI.stale = true; setStatus(); }
function afterEdit(clean) {
  UI.ver++; const ids = new Set(state.nodes.map(n => n.id)), mids = new Set(state.members.map(m => m.id));
  UI.sel.nodes.forEach(i => { if (!ids.has(i)) UI.sel.nodes.delete(i); }); UI.sel.members.forEach(i => { if (!mids.has(i)) UI.sel.members.delete(i); });
  if (UI.chain && !ids.has(UI.chain)) UI.chain = null;
  if (UI.results) UI.stale = true; updUndo(); setStatus(); renderAll();
}
let _nmVer = -1, _nm = null;
function nodeMap() { if (_nmVer !== UI.ver) { _nm = new Map(state.nodes.map(n => [n.id, n])); _nmVer = UI.ver; } return _nm; }
const nodeById = id => nodeMap().get(id);
const memberById = id => state.members.find(m => m.id === id);

