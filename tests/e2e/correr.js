// tests/e2e/correr.js
'use strict';
/* Corre las pruebas de pantalla (ui_*.js y guarda_de_carga.js) abriendo la app desde el disco (file://), por http, o ambas.
   Uso: node tests/e2e/correr.js [file|http|ambos]      Sale con código 1 si algo falla. */
const fs = require('fs'), path = require('path'), {spawn} = require('child_process');
const {iniciar} = require('./servidor');
const RAIZ = path.resolve(__dirname, '..', '..');
const modo = process.argv[2] || 'ambos';
if (!['file', 'http', 'ambos'].includes(modo)) { console.error('Modo desconocido: ' + modo + ' (file | http | ambos)'); process.exit(2); }

function correr(archivo, url) {
  return new Promise(resolver => {
    const env = Object.assign({}, process.env);
    if (url) env.ATLAS_URL = url; else delete env.ATLAS_URL;
    const p = spawn(process.execPath, [path.join(__dirname, archivo)], {env, cwd: RAIZ});
    let out = ''; p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('close', code => resolver({code, out}));
  });
}

(async () => {
  const pruebas = fs.readdirSync(__dirname).filter(f => /^ui_.*\.js$/.test(f)).sort();
  if (!pruebas.length) throw new Error('No hay pruebas ui_*.js en tests/e2e');
  const srv = await iniciar(RAIZ);
  let fallas = 0;
  try {
    for (const m of (modo === 'ambos' ? ['file', 'http'] : [modo])) {
      const url = m === 'http' ? srv.url + 'index.html' : null;
      console.log('\n══ ' + (m === 'http' ? 'por http (' + url + ')' : 'desde el disco (file://)') + ' ══');
      for (const f of pruebas) {
        const r = await correr(f, url);
        const mal = r.code !== 0;
        if (mal) { fallas++; console.log('✗ ' + f + ' (código ' + r.code + ')\n' + r.out); }
        else console.log('✓ ' + f + '  (' + (r.out.match(/^OK /gm) || []).length + ' comprobaciones OK)');
      }
    }
    if (modo !== 'file') {                                   // la guarda de carga solo se prueba por http (necesita cortar archivos)
      const r = await correr('guarda_de_carga.js', srv.url + 'index.html');
      if (r.code !== 0) { fallas++; console.log('✗ guarda_de_carga.js\n' + r.out); } else console.log('✓ guarda_de_carga.js\n' + r.out.trimEnd());
    }
  } finally { await srv.cerrar(); }
  console.log(fallas ? '\nFALLAS: ' + fallas : '\nTODO OK');
  process.exitCode = fallas ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
