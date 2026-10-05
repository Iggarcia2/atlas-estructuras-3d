# Progreso

## 2026-10-05 · versión 2.1.0 (reorganización, sin cambios funcionales)

**Qué se hizo.** El HTML único de la versión 2 (~400 KB) se separó en un sitio estático: `index.html` con el marcado y el orden de carga, `css/estilos.css`, 33 archivos en `js/` por responsabilidad (núcleo sin DOM, vista, paneles, ejercicios) y `libs/` con SheetJS y las fuentes IBM Plex descargadas de npm (antes se pedían a cdnjs y Google Fonts). Se agregó `js/guarda.js`, que muestra un aviso si falta un archivo o falla el arranque. Las pruebas, el contraste con PyNite y el generador del Excel se movieron a `tests/` e `informe/`; las pruebas leen el orden de carga desde `index.html`.

**Qué se decidió y por qué.** Scripts clásicos y no módulos ES: conservan el ámbito global de la versión 2 (cero riesgo para el solver y las 352 comprobaciones) y la app sigue abriendo con doble clic por `file://`, que los módulos ES no permiten. `'use strict'` se repite en cada archivo porque antes valía para todo el script por estar en el primero. El arranque (`setMode… loadExample`) pasó a `js/arranque.js`, que se carga último. No se genera un HTML único (decisión del usuario). Las versiones nuevas se marcan con etiquetas de git; `versiones/` queda para los HTML únicos 1 y 2.

**Cómo se comprobó.** El código de los 33 archivos, unidos en el orden original, tiene el mismo árbol sintáctico que el script del HTML v2 (solo difiere la marca `__ATLAS_LISTO__`). En Chromium, el sitio nuevo y el v2 dan el mismo DOM, estado, resultados y dibujo SVG antes de calcular, después de calcular y con el diálogo de ejercicios abierto. 45 ejercicios / 352 comprobaciones, 33/33 mutaciones, unitarias, pruebas de pantalla por `file://` y por http, y el aviso de carga con archivo faltante.

**Corrección de seguridad (único cambio de código respecto de v2).** El nombre de una combinación se insertaba sin escapar en el selector de la pestaña «Vista» (`js/ui/panel_vista.js`): un modelo con HTML en ese nombre ejecutaba código al abrirse. Ahora pasa por `esc()`. Lo detectó una prueba de inyección nueva (`tests/e2e/ui_f_seguridad_xss.js`, que cubre nombre del modelo, nudos, barras, cargas, perfiles propios, combinaciones y perfil inexistente); sin la corrección falla, con ella pasa. Los HTML de `versiones/` conservan el defecto: no se modifican.

**Qué sigue.** Subir a GitHub y activar Pages; cotejar las constantes de memoria con el reglamento; definir la licencia.
