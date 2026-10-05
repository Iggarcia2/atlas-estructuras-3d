// tests/lib/cargar.js
'use strict';
/* Carga los módulos de js/ dentro de un contexto de Node (sin navegador) para probar la lógica de cálculo.
   Única fuente de verdad del orden de carga: los <script src="js/..."> de index.html. No hay listas de archivos duplicadas. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const RAIZ = path.resolve(__dirname, '..', '..');
const GLOBALES = ['console', 'Math', 'Float64Array', 'Uint8Array', 'Map', 'Set', 'Object', 'Array', 'Number', 'JSON', 'String', 'Error', 'Date',
  'isFinite', 'isNaN', 'parseFloat', 'parseInt'];
// Grupos de módulos con una palabra clave. Cualquier otra entrada tiene que ser una ruta exacta de index.html (p. ej. 'js/nucleo/solver.js').
const GRUPOS = {
  'nucleo': r => r.startsWith('js/nucleo/'),
  'bench-motor': r => r === 'js/bench/motor.js',
  'bench-ejercicios': r => /^js\/bench\/ejercicios_/.test(r),
};

function ordenDeCarga() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const rutas = [...html.matchAll(/<script\s+src="(js\/[^"]+)"/g)].map(m => m[1]);
  if (!rutas.length) throw new Error('index.html no declara ningún <script src="js/...">');
  return rutas;
}

/** Rutas (en el orden de index.html) de los módulos elegidos. Lanza si algo no existe o no se cargaría. */
function rutas(seleccion) {
  if (!Array.isArray(seleccion) || !seleccion.length) throw new Error('rutas(): hay que indicar qué módulos cargar');
  const orden = ordenDeCarga(), elegidas = new Set();
  for (const s of seleccion) {
    if (GRUPOS[s]) {
      const g = orden.filter(GRUPOS[s]);
      if (!g.length) throw new Error('El grupo «' + s + '» no tiene módulos en index.html');
      g.forEach(r => elegidas.add(r));
    } else if (orden.includes(s)) elegidas.add(s);
    else throw new Error('El módulo «' + s + '» no está en el orden de carga de index.html');
  }
  return orden.filter(r => elegidas.has(r));
}

/** {ruta: texto} de cada módulo. */
function leer(lista) {
  const out = {};
  for (const r of lista) out[r] = fs.readFileSync(path.join(RAIZ, r), 'utf8');
  return out;
}

/** Ejecuta los textos en orden (un script por archivo, como el navegador) y devuelve el valor de `expr`. */
function ejecutar(lista, textos, expr) {
  const ctx = {};
  GLOBALES.forEach(n => { ctx[n] = global[n]; });
  vm.createContext(ctx);
  for (const r of lista) new vm.Script(textos[r], {filename: r}).runInContext(ctx);
  return vm.runInContext('(' + expr + ')', ctx);
}

/** Atajo: carga la selección y devuelve el objeto descrito por `expr` (p. ej. '{analyzeModel, checkAll}'). */
function crear(seleccion, expr) {
  const lista = rutas(seleccion);
  return ejecutar(lista, leer(lista), expr);
}

module.exports = {RAIZ, rutas, leer, ejecutar, crear};
