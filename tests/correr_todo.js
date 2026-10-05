// tests/correr_todo.js
'use strict';
/* Corre todas las pruebas que tienen criterio automático y resume el resultado.
   Uso: node tests/correr_todo.js [--e2e]      (--e2e suma las pruebas de pantalla: necesita Playwright y Chromium)
   Sale con código 1 si alguna falla. Los tests/unit/test_core.js y test_misc.js son informativos (imprimen valores, sin criterio): se corren a mano. */
const path = require('path'), {spawnSync} = require('child_process');
const RAIZ = path.resolve(__dirname, '..');
const pasos = [
  ['Elemento viga-columna contra soluciones cerradas', ['tests/unit/test_elem.js']],
  ['Funciones del solver (cargas, apoyos, segundo orden…)', ['tests/unit/test_feat.js']],
  ['Verificación de perfiles (Cb, pandeo local, secciones armadas)', ['tests/unit/test_design.js']],
  ['Ejercicios de verificación (45 ejercicios)', ['tests/bench/run_bench.js']],
  ['Pruebas de mutación (¿los ejercicios detectan un error a propósito?)', ['tests/bench/mutate_bench.js']],
];
if (process.argv.includes('--e2e')) pasos.push(['Pruebas de pantalla (Playwright, disco + http)', ['tests/e2e/correr.js', 'ambos']]);

let fallas = 0;
for (const [titulo, args] of pasos) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args.map((a, i) => i === 0 ? path.join(RAIZ, a) : a), {cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  const lineas = (r.stdout + r.stderr).trim().split('\n');
  const mal = r.status !== 0;
  if (mal) fallas++;
  console.log((mal ? '✗ ' : '✓ ') + titulo + '  [' + ((Date.now() - t0) / 1000).toFixed(1) + ' s]');
  console.log('    ' + lineas.slice(mal ? -12 : -1).join('\n    ').slice(0, 1500));
}
console.log(fallas ? '\nFALLAS: ' + fallas + ' paso(s)' : '\nTODO OK');
process.exitCode = fallas ? 1 : 0;
