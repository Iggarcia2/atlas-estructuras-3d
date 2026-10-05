// tests/e2e/ui_f_seguridad_xss.js
'use strict';
/* Seguridad (norma «toda entrada se escapa antes de renderizarse»): carga modelos con HTML/JS hostil en todos los textos que el usuario
   controla (nombre del modelo, descripciones de nudos y barras, cargas, perfiles propios, combinaciones, perfil inexistente), recorre todas las
   pestañas y paneles, y comprueba que no se ejecutó nada ni se inyectaron elementos. */
const { chromium, URL_APP } = require('./_comun');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('dialog', d => { errs.push('DIALOG: ' + d.message()); d.dismiss(); });
  await page.goto(URL_APP); await page.waitForTimeout(1000);

  const recorrer = async () => {
    for (const sel of [{ n: [1], m: [] }, { n: [], m: [1] }, { n: [1, 2], m: [1] }, { n: [], m: [] }]) {
      await page.evaluate(s => { UI.sel.nodes = new Set(s.n); UI.sel.members = new Set(s.m); }, sel);
      for (const t of ['props', 'model', 'loads', 'vis']) { await page.evaluate(t => { showTab(t); renderAll(); }, t); await page.waitForTimeout(40); }
    }
    for (const t of ['sum', 'nodes', 'bars', 'reac', 'defl', 'bom', 'ver']) { await page.evaluate(t => { showRTab(t); renderResults(); }, t); await page.waitForTimeout(40); }
    await page.evaluate(() => { UI.lbl = { nodes: true, members: true, secs: true }; scheduleDraw(); }); await page.waitForTimeout(150);
  };
  const resultado = async nombre => {
    const xss = await page.evaluate(() => window.__xss);
    const inyectados = await page.evaluate(() => document.querySelectorAll('img[src="x"], svg[onload]').length);
    const bien = xss === undefined && inyectados === 0;
    if (!bien) process.exitCode = 1;
    console.log((bien ? 'OK   ' : 'FAIL ') + nombre + (bien ? '' : '  ejecutado=' + xss + ' inyectados=' + inyectados));
  };

  // 1) modelo válido con texto hostil en todos los campos de texto
  await page.evaluate(() => {
    const P = n => `"><img src=x onerror="window.__xss=(window.__xss||'')+'${n},'"><svg onload="window.__xss=(window.__xss||'')+'s${n},'">`;
    loadModelObj({ name: P('nombre'), ver: 2,
      nodes: [{ id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1], tag: P('nudo1') }, { id: 2, x: 4000, y: 0, z: 0, sup: [0, 1, 1, 0, 0, 0], tag: P('nudo2'), P: { D: [0, 0, -5] } }],
      members: [{ id: 1, i: 1, j: 2, sec: 'IPE 200', tag: P('barra'), loads: [{ k: 'U', c: 'D', dir: 'grav', w1: 2, w2: 2, tag: P('cargaTag'), desc: P('cargaDesc') }] }],
      customSections: { [P('perfil')]: { type: 'RHS', h: 100, b: 100, t: 5 } },
      combos: [{ n: P('combo'), f: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], type: 'ULS' }, { n: 'S: D+L', f: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], type: 'SLS', lim: 300 }],
      settings: { E: 200000, G: 77200, Fy: 235, selfWeight: true } }, 'x');
    renderAll();
  });
  await page.click('#calcBtn'); await page.waitForTimeout(600);
  await recorrer();
  await resultado('modelo con texto hostil en nombre, nudos, barras, cargas, perfiles propios y combinaciones');

  // 2) perfil inexistente con nombre hostil: el mensaje de error del cálculo
  await page.evaluate(() => {
    const P = `"><img src=x onerror="window.__xss=(window.__xss||'')+'perfilInexistente,'">`;
    loadModelObj({ name: 'err', ver: 2, nodes: [{ id: 1, x: 0, y: 0, z: 0, sup: [1, 1, 1, 1, 1, 1] }, { id: 2, x: 4000, y: 0, z: 0, sup: [0, 0, 0, 0, 0, 0] }],
      members: [{ id: 1, i: 1, j: 2, sec: P }] }, 'x'); renderAll();
  });
  await page.click('#calcBtn'); await page.waitForTimeout(500);
  await recorrer();
  await resultado('perfil inexistente con nombre hostil (mensaje de error del cálculo)');

  console.log('errs', errs); if (errs.length) process.exitCode = 1;
  await browser.close();
})();
