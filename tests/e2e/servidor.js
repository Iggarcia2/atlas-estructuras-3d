// tests/e2e/servidor.js
'use strict';
/* Servidor estático mínimo, solo para probar el sitio por http (como lo sirve GitHub Pages).
   Escucha únicamente en 127.0.0.1, sirve solo archivos dentro de `raiz` y rechaza rutas que salgan de ella. */
const http = require('http'), fs = require('fs'), path = require('path');
const TIPOS = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'};

function iniciar(raiz) {
  raiz = path.resolve(raiz);
  return new Promise((resolver, rechazar) => {
    const srv = http.createServer((req, res) => {
      let rel;
      try { rel = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
      catch (e) { res.writeHead(400, {'content-type': 'text/plain; charset=utf-8'}); res.end('URL inválida'); return; }
      if (rel.endsWith('/')) rel += 'index.html';
      const archivo = path.resolve(raiz, '.' + rel);
      if (archivo !== raiz && !archivo.startsWith(raiz + path.sep)) { res.writeHead(403, {'content-type': 'text/plain; charset=utf-8'}); res.end('Prohibido'); return; }
      fs.readFile(archivo, (err, buf) => {
        if (err) { res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}); res.end('No encontrado'); return; }
        res.writeHead(200, {'content-type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'cache-control': 'no-store'});
        res.end(buf);
      });
    });
    srv.on('error', rechazar);
    srv.listen(0, '127.0.0.1', () => resolver({
      url: 'http://127.0.0.1:' + srv.address().port + '/',
      cerrar: () => new Promise(r => srv.close(r)),
    }));
  });
}
module.exports = {iniciar};
