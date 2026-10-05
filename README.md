# Atlas Estructuras 3D

Análisis y verificación de pórticos 3D en el navegador: solver propio (primer y segundo orden), dibujo 3D en SVG, verificación de perfiles según CIRSOC 301-2005 / AISC LRFD-99, módulo de ejercicios de verificación y exportación a Excel. Es un sitio estático: no hay servidor ni base de datos, todo corre en el navegador.

**Versión 2.1.0.** Misma funcionalidad que la versión 2 (archivo único); cambió solo la organización del código.

## Cómo usarlo

- **Desde el disco:** abrir `index.html` con doble clic (la carpeta tiene que estar completa: `css/`, `js/` y `libs/` junto a `index.html`).
- **En GitHub Pages:** `https://<usuario>.github.io/<repositorio>/`

Si falta un archivo o falla el arranque, aparece un aviso rojo arriba de la pantalla (lo muestra `js/guarda.js`). No uses resultados mientras esté ese aviso.

## Estructura

| Carpeta | Contenido |
|---|---|
| `index.html` | Marcado de la página y **orden de carga** de los scripts (única fuente de verdad del orden). |
| `css/estilos.css` | Estilos. |
| `js/guarda.js` | Aviso de carga fallida. Se carga primero. |
| `js/nucleo/` | Lógica de cálculo sin DOM: elemento viga-columna, perfiles, álgebra, combinaciones, solver, verificación. |
| `js/datos/` | Modelo de ejemplo. |
| `js/vista/` | Estado, historial, operaciones sobre el modelo, proyección, dibujo, cargas, ratón y teclado. |
| `js/ui/` | Paneles, resultados, archivos, barra de herramientas. |
| `js/bench/` | Motor y ejercicios de verificación, y su pantalla. |
| `js/arranque.js` | Arranque; se carga último. |
| `libs/` | Librerías locales (no se usan CDN): SheetJS 0.18.5 para Excel e IBM Plex (fuentes), con sus licencias. |
| `versiones/` | HTML únicos de las versiones 1 y 2. No se modifican (el v2 conserva un defecto de escape corregido en 2.1.0: usar el sitio nuevo). |
| `tests/` | Pruebas (ver abajo). |
| `informe/` | Generador del Excel de verificación y su último resultado. |

Los scripts son clásicos (no módulos ES): comparten el ámbito global, como en la versión 2, y por eso la app también abre por `file://`. Cada archivo empieza con su ruta y `'use strict'`. Para agregar un módulo: crear el archivo y sumar su `<script src>` en `index.html` en el lugar que corresponda; las pruebas toman el orden desde ahí.

## Pruebas

Requisitos: Node 18 o más nuevo. Las pruebas de pantalla necesitan además `npm install` (Playwright) y Chromium; el informe necesita Python 3 con `openpyxl`.

```
node tests/correr_todo.js          # unitarias + 45 ejercicios + 33 mutaciones (unos 20 s)
npm install && npx playwright install chromium
node tests/correr_todo.js --e2e    # suma las pruebas de pantalla, desde el disco y por http
npm run informe                    # regenera informe/Verificacion_Atlas_Estructuras_3D_v2.xlsx
```

`tests/unit/test_core.js` y `test_misc.js` solo imprimen valores (comparación con PyNite, mecanismos, rendimiento): se leen a mano. `tests/pynite/` contiene el contraste con PyNite (`pip install PyNiteFEA` para regenerar `pyn_out.json`).

## Publicar en GitHub Pages

1. Crear un repositorio vacío en GitHub (público) y subir **el contenido de esta carpeta**, de modo que `index.html` quede en la raíz del repositorio. La carpeta tiene 94 archivos y el cargador web de GitHub admite hasta 100 por vez, así que conviene usar git o GitHub Desktop (*File → Add local repository → Publish repository*).

   ```
   git init -b main
   git add .
   git commit -m "Atlas Estructuras 3D 2.1.0"
   git remote add origin https://github.com/<usuario>/<repositorio>.git
   git push -u origin main
   git tag v2.1.0 && git push origin v2.1.0
   ```
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, carpeta `/ (root)` → Save**.
3. Esperar uno o dos minutos; la dirección aparece en la misma pantalla. `.nojekyll` evita que GitHub procese los archivos.

## Reglas del proyecto

- `index.html` es el archivo principal y su nombre no cambia. Cada versión nueva lleva una etiqueta de git (`v2.1.0`, `v2.2.0`…); `versiones/` guarda solo los HTML únicos anteriores.
- Una sola fuente de verdad: el orden de carga está en `index.html`, el ejemplo en `js/datos/ejemplo.js`.
- Todo texto de usuario que se vuelca en HTML pasa por `esc()` (lo prueba `tests/e2e/ui_f_seguridad_xss.js`); los archivos abiertos se normalizan con `normModel()`.
- Registro de sesiones: `estado.json` (tareas y versión vigente) y `progreso.md`.

## Límites conocidos

- Coeficientes cargados de memoria, sin cotejar con el texto del reglamento: factores de combinación de LRFD-99 A4, constantes de pandeo local (Q, kc, λ), tope Cb ≤ 2,3 y constantes de viento del CIRSOC 102. Verificarlos antes de usar la app en un trabajo real.
- Cf, G y V del viento y el coeficiente sísmico C los ingresa el usuario.
- Sin cargas nocionales para el método de rigidez directa, sin excentricidades en las barras, sin acople torsión–axil; el alabeo (Cw) interviene solo en la resistencia.
- Tracción: solo fluencia de la sección bruta (sin sección neta ni rotura). Alma esbelta en flexocompresión y cajones de almas esbeltas: aproximado.
- Un mecanismo en una parte sin cargas no se avisa.
- Segundo orden con deformación por corte: verificado contra derivación propia y carga de Engesser, no contra otro programa.
