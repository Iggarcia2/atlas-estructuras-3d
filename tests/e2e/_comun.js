// tests/e2e/_comun.js
'use strict';
/* Piezas comunes de las pruebas de pantalla (Playwright + Chromium).
   · Playwright: se busca el paquete `playwright` (npm install) o la ruta de la variable PLAYWRIGHT_PATH.
   · URL de la app: variable ATLAS_URL; si no está, abre index.html por file:// (doble clic desde el disco).
   · Las capturas van a tests/e2e/salida/ (no se sube a git). */
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..', '..');
const SALIDA = path.join(__dirname, 'salida');
fs.mkdirSync(SALIDA, {recursive: true});

let pw;
try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); }
catch (e) { throw new Error('No se encuentra Playwright. Ejecutá «npm install» en la carpeta del proyecto, o definí PLAYWRIGHT_PATH. (' + e.message + ')'); }

module.exports = {
  chromium: pw.chromium,
  RAIZ,
  URL_APP: process.env.ATLAS_URL || ('file://' + path.join(RAIZ, 'index.html')),
  salida: nombre => path.join(SALIDA, nombre),
};
