// tests/e2e/guarda_de_carga.js
'use strict';
/* Comprueba js/guarda.js: con la carga normal no debe aparecer ningún aviso; si falta un archivo o falla el arranque,
   debe aparecer un aviso visible que nombre la causa. Necesita ATLAS_URL por http (correr.js lo define). */
const {chromium} = require('./_comun');
const URL_APP = process.env.ATLAS_URL;
if (!URL_APP || !/^https?:/.test(URL_APP)) { console.error('guarda_de_carga.js necesita ATLAS_URL por http (usá correr.js)'); process.exit(2); }

async function caso(nombre, preparar, verificar) {
  const browser = await chromium.launch({args: ['--no-sandbox']});
  try {
    const page = await (await browser.newContext({viewport: {width: 1500, height: 900}})).newPage();
    await preparar(page);
    await page.goto(URL_APP);
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => {
      const a = document.querySelector('[role=alert]');
      return {aviso: a ? a.textContent : null, listo: window.__ATLAS_LISTO__ === true};
    });
    const motivo = verificar(info);
    console.log((motivo === true ? 'OK   ' : 'FAIL ') + nombre + (motivo === true ? '' : '  → ' + motivo + ' ' + JSON.stringify(info)));
    if (motivo !== true) process.exitCode = 1;
  } finally { await browser.close(); }
}

(async () => {
  await caso('carga normal: sin aviso y aplicación lista', async () => {}, i => i.aviso === null && i.listo ? true : 'debía cargar bien');
  await caso('falta js/nucleo/solver.js: aviso que nombra el archivo',
    async p => { await p.route('**/js/nucleo/solver.js', r => r.fulfill({status: 404, body: 'x'})); },
    i => i.aviso && i.aviso.includes('js/nucleo/solver.js') ? true : 'debía avisar del archivo faltante');   // el arranque puede llegar al final (loadExample captura el error), pero el aviso tiene que quedar
  await caso('falla el arranque: aviso con el error',
    async p => { await p.route('**/js/arranque.js', r => r.fulfill({status: 200, contentType: 'text/javascript', body: "throw new Error('fallo de prueba');"})); },
    i => !i.listo && i.aviso && i.aviso.includes('fallo de prueba') ? true : 'debía mostrar el error de arranque');
  await caso('falta libs/xlsx.full.min.js: aviso que nombra la librería',
    async p => { await p.route('**/libs/xlsx.full.min.js', r => r.fulfill({status: 404, body: 'x'})); },
    i => i.aviso && i.aviso.includes('libs/xlsx.full.min.js') ? true : 'debía avisar de la librería faltante');
})().catch(e => { console.error(e); process.exit(1); });
