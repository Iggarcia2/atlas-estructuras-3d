// js/ui/propiedades.js
'use strict';
/* Pestaña «Propiedades»: nudos, barras, uniones de extremo. */
/* ── PROPIEDADES ── */
function jointBlock(ms) {
  const m = ms[0]; let h = `<div class="hdr">Uniones de extremo</div>`;
  for (const e of ['I', 'J']) {
    const kinds = new Set(ms.map(x => jointKind(x, e))), mixed = kinds.size > 1, kind = jointKind(m, e), sp = m['spr' + e] || {};
    h += `<div class="jt"><div class="flab">Extremo ${e.toLowerCase()} (nudo ${m[e.toLowerCase()]})</div><div class="field"><select data-jt="${e}">${mixed ? '<option value="" selected>— varias —</option>' : ''}${JT_KINDS.map(([k, t]) => `<option value="${k}"${!mixed && kind === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
    if (!mixed && kind === 'semi') h += `<div class="r2">${fld('kθ eje fuerte (kN·m/rad)', 'jt.' + e + '.s', sp.s == null ? '' : fmt(sp.s, 0), 'o', 'placeholder="rígido"')}${fld('kθ eje débil (kN·m/rad)', 'jt.' + e + '.w', sp.w == null ? '' : fmt(sp.w, 0), 'o', 'placeholder="rígido"')}</div><div class="note">Referencia de la barra: 4EI/L = ${fmt(kthRef(m), 0)} kN·m/rad. kθ = 0 libera el giro; un valor muy grande equivale a unión rígida. Campo vacío = rígido en ese eje.</div>`;
    h += chk('Torsión liberada (giro alrededor del eje de la barra)', 'jt.' + e + '.t', ms.every(x => x['trel' + e])) + `</div>`;
  }
  return h;
}
function renderProps() {
  const pane = $('#pane-props'); if (UI.tab !== 'props') return;
  const ns = [...UI.sel.nodes].map(nodeById).filter(Boolean), ms = [...UI.sel.members].map(memberById).filter(Boolean), R = resultsFresh() ? UI.results : null;
  if (!ns.length && !ms.length) {
    pane.innerHTML = `<div class="empty">Sin selección.<br>Elegí <b>↖ Seleccionar</b> y hacé clic en un nudo o una barra,<br>o dibujá con <b>● Nudo</b> / <b>╱ Barra</b>.</div>
    <div class="note">${state.nodes.length} nudos · ${state.members.length} barras<br>Atajos: <b>S N B O P</b> modos · <b>1-4</b> vistas · <b>T</b> cambia el plano · <b>F</b> ajustar · <b>Enter</b> calcula · <b>Ctrl+Z/Y</b> deshacer/rehacer · rueda: zoom · clic derecho: rotar · rueda apretada: mover.</div>`; return;
  }
  let h = '';
  if (ns.length) {
    const n = ns[0], one = ns.length === 1;
    h += `<div class="phead"><div class="t">Nudo${one ? '' : 's'}</div><div class="n">${one ? 'N' + n.id : ns.length + ' seleccionados'}</div></div>`;
    if (one) h += `<div class="r3">${fld('X (mm)', 'n.x', fmt(n.x, 1))}${fld('Y (mm)', 'n.y', fmt(n.y, 1))}${fld('Z (mm)', 'n.z', fmt(n.z, 1))}</div>${fld('Descripción', 'n.tag', n.tag || '', 's')}`;
    h += `<div class="hdr">Vínculos</div><div class="chips"><button class="chip" data-sup="free">Libre</button><button class="chip" data-sup="pin">Articulado</button><button class="chip" data-sup="roll">Rodillo Z</button><button class="chip" data-sup="fix">Empotrado</button></div>`;
    h += `<div class="dofs">${['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'].map((d, k) => `<label class="dof">${d}<input type="checkbox" data-b="n.sup.${k}" data-t="c" ${n.sup[k] ? 'checked' : ''}></label>`).join('')}</div>`;
    const spr = n.spr || [], sd = n.sd || [], dn = ['Ux', 'Uy', 'Uz', 'Rx', 'Ry', 'Rz'];
    h += det('spr', 'Apoyos elásticos y asentamientos',
      `<div class="flab">Resorte: kN/m (traslación) · kN·m/rad (giro). 0 = sin resorte. Un GDL con apoyo rígido ignora el resorte.</div><div class="r3">${dn.map((d, k) => fld(d, 'n.spr.' + k, fmt(spr[k] || 0, 1))).join('')}</div>` +
      `<div class="flab">Asentamiento impuesto: mm (traslación) · mrad (giro). Solo actúa sobre GDL con apoyo o resorte; se combina con el factor del caso A.</div><div class="r3">${dn.map((d, k) => fld(d, 'n.sd.' + k, fmt(sd[k] || 0, 2))).join('')}</div>`,
      spr.some(v => v > 0) || sd.some(v => v));
    const cs = UI.nodeCase;
    h += `<div class="hdr">Cargas nodales</div><div class="chips">${NODE_CASES.map(([c, t]) => `<button class="chip${cs === c ? ' on' : ''}" data-nc="${c}">${t}${ns.some(x => nodeHasLoad(x, c)) ? ' •' : ''}</button>`).join('')}</div>`;
    if (cs === 'H') h += `<div class="r2">${fld('Fx (kN) · caso Hx', 'n.P.H.0', fmt(((n.P || {}).H || [])[0] || 0, 3))}${fld('Fy (kN) · caso Hy', 'n.P.H.1', fmt(((n.P || {}).H || [])[1] || 0, 3))}</div>`;
    else { const P = (n.P || {})[cs] || [0, 0, 0], Mo = (n.Mo || {})[cs] || [0, 0, 0]; h += `<div class="r3">${[0, 1, 2].map(k => fld('F' + 'xyz'[k] + ' (kN)', 'n.P.' + cs + '.' + k, fmt(P[k] || 0, 3))).join('')}</div><div class="r3">${[0, 1, 2].map(k => fld('M' + 'xyz'[k] + ' (kN·m)', 'n.Mo.' + cs + '.' + k, fmt(Mo[k] || 0, 3))).join('')}</div>`; }
    if (one) h += `<button class="btn" id="btnPlaneNode">⇣ Llevar el plano de trabajo a este nudo</button>`;
    if (one && R) {
      const c = curCombo(), i = R.idx.get(n.id), u = nodeDisp(R, i, c.f), re = nodeReac(R, i, c.f);
      h += `<div class="hdr">Resultados · ${esc(c.n)}</div><div class="kv"><span>Ux, Uy, Uz (mm)</span><span>${fmt(u[0], 2)} · ${fmt(u[1], 2)} · ${fmt(u[2], 2)}</span>` + (R.fixed.slice(6 * i, 6 * i + 6).some(v => v) ? `<span>Reacción Fx,Fy,Fz (kN)</span><span>${fmt(re[0], 2)} · ${fmt(re[1], 2)} · ${fmt(re[2], 2)}</span><span>Reacción Mx,My,Mz (kN·m)</span><span>${fmt(re[3], 2)} · ${fmt(re[4], 2)} · ${fmt(re[5], 2)}</span>` : '') + `</div>`;
    }
    h += `<button class="btn danger" id="btnDelSel">Eliminar ${ns.length > 1 ? 'selección' : 'nudo'}</button>`;
  }
  if (ms.length) {
    const m = ms[0], one = ms.length === 1, same = k => ms.every(x => x[k] === m[k]), a = nodeById(m.i), b = nodeById(m.j);
    h += `<div class="phead" style="margin-top:${ns.length ? 14 : 0}px"><div class="t">Barra${one ? '' : 's'}</div><div class="n">${one ? 'B' + m.id + (m.tag ? ' · ' + esc(m.tag) : '') : ms.length + ' seleccionadas'}</div></div>`;
    if (one && a && b) h += `<div class="kv"><span>Nudos</span><span>N${m.i} → N${m.j}</span><span>Longitud</span><span>${fmt(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), 1)} mm</span></div>`;
    h += `<div class="field"><label>Perfil</label><select data-b="m.sec" data-t="s">${secOptions(m.sec, !same('sec'))}</select></div>`;
    if (same('sec')) h += det('secinfo', 'Propiedades y esbeltez local del perfil', secInfoHTML(m.sec), false);
    h += `<div class="r2">${fld('Giro β (°)', 'm.beta', fmt(m.beta || 0, 1))}${fld('Etiqueta', 'm.tag', m.tag || '', 's')}</div>`;
    h += jointBlock(ms);
    const q = m.q || {};
    h += `<div class="hdr">Cargas en la barra</div><div class="flab">Distribuidas uniformes rápidas (kN/m)</div><div class="r2">${fld('D · permanente ↓', 'm.q.D', fmt(q.D || 0, 3))}${fld('L · sobrecarga ↓', 'm.q.L', fmt(q.L || 0, 3))}${fld('Hx (+X)', 'm.q.Hx', fmt(q.Hx || 0, 3))}${fld('Hy (+Y)', 'm.q.Hy', fmt(q.Hy || 0, 3))}</div>`;
    if (one) {
      const lds = m.loads || [];
      h += lds.length ? `<div class="flab">Otras cargas (puntuales, parciales, trapezoidales, momentos, temperatura)</div>` + lds.map((ld, i) => `<details class="dt ldc" data-det="ld${m.id}_${i}"${UI.det['ld' + m.id + '_' + i] ? ' open' : ''}><summary>${esc(ldSummary(ld, i))} <button class="chip" data-lddel="${i}" title="Quitar esta carga">✕</button></summary>${ldFields(ld, 'm', i)}</details>`).join('') : `<div class="note">Sin cargas puntuales, parciales ni térmicas. Agregalas abajo.</div>`;
    }
    h += det('ldnew', '＋ Agregar carga (puntual, parcial, trapezoidal, momento, temperatura)', ldBuilderHTML(), false);
    h += `<div class="hdr">Longitudes de pandeo y Cb</div><div class="r2">${fld('K', 'm.K', fmt(m.K || 1, 2))}${fld('KL fuerte (mm)', 'm.kls', m.kls ? fmt(m.kls, 0) : '', 'o', 'placeholder="= K·L"')}${fld('KL débil (mm)', 'm.klw', m.klw ? fmt(m.klw, 0) : '', 'o', 'placeholder="= K·L"')}${fld('Lb volcamiento (mm)', 'm.lb', m.lb ? fmt(m.lb, 0) : '', 'o', 'placeholder="= K·L"')}${fld('Cb fijo', 'm.cb', m.cb ? fmt(m.cb, 2) : '', 'o', 'placeholder="del diagrama"')}</div>`;
    if (one && R && R.rmap.get(m.id) && !R.rmap.get(m.id).rigid) h += verifHTML(R.rmap.get(m.id));
    if (one) h += `<div class="r2"><button class="btn" id="btnSplit">Dividir en N…</button><button class="btn" id="btnFlip">Invertir i ↔ j</button></div>`;
    h += `<button class="btn danger" id="btnDelSel2">Eliminar ${ms.length > 1 ? 'barras' : 'barra'}</button>`;
  }
  pane.innerHTML = h;
}
