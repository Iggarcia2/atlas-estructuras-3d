# informe/build_xlsx.py
import json, re, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.utils import get_column_letter

import os
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, 'bench.json'), encoding='utf8'))
OUT = os.path.join(HERE, 'Verificacion_Atlas_Estructuras_3D_v2.xlsx')
F = 'Arial'
f_norm = Font(name=F, size=10); f_bold = Font(name=F, size=10, bold=True)
f_blue = Font(name=F, size=10, color='0000FF'); f_title = Font(name=F, size=14, bold=True)
f_sub = Font(name=F, size=10, color='555555'); f_link = Font(name=F, size=10, color='0563C1', underline='single')
f_hdr = Font(name=F, size=10, bold=True, color='FFFFFF'); f_sec = Font(name=F, size=11, bold=True, color='1F4E5F')
fill_hdr = PatternFill('solid', fgColor='1F4E5F'); fill_sec = PatternFill('solid', fgColor='DCEBEF'); fill_inp = PatternFill('solid', fgColor='FFFFE0')
fill_ok = PatternFill('solid', fgColor='C6EFCE'); fill_bad = PatternFill('solid', fgColor='FFC7CE'); fill_pub = PatternFill('solid', fgColor='FFF2CC')
thin = Side(style='thin', color='BBBBBB'); box = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap = Alignment(wrap_text=True, vertical='top'); wrapc = Alignment(wrap_text=True, vertical='center', horizontal='center')
GRP = {'apuntes': 'Resultado publicado', 'clasico': 'Solución clásica', 'reglamento': 'Fórmulas del Reglamento'}
ORDER = ['apuntes', 'clasico', 'reglamento']
D.sort(key=lambda e: (ORDER.index(e['grupo']), e['id']))

def nf(v):
    a = abs(v)
    if a == 0: return '0.000000'
    if a >= 1e7: return '0.0000E+00'
    if a >= 1000: return '#,##0.000'
    if a >= 1: return '0.00000'
    if a >= 1e-2: return '0.000000'
    return '0.000000E+00'
def sheet_name(e): return 'Ej ' + e['id']
def q(name): return "'" + name + "'"

def translate(expr, cells):
    """Reemplaza los nombres de datos por referencias de celda y valida que no quede ningún nombre suelto."""
    def rep(m):
        t = m.group(0)
        if m.end() < len(expr) and expr[m.end()] == '(': return t          # función (SQRT, IF, PI…)
        if t in cells: return cells[t]
        raise ValueError('nombre desconocido «%s» en %s' % (t, expr))
    return re.sub(r'[A-Za-z_][A-Za-z0-9_]*', rep, expr)

wb = Workbook(); ws0 = wb.active; ws0.title = 'Resumen'
# ───────────────────────── hojas por ejercicio ─────────────────────────
ranges = {}
for e in D:
    ws = wb.create_sheet(sheet_name(e))
    widths = [5, 54, 11, 17, 17, 14, 11, 9, 9, 9, 13, 58, 46, 46]
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    ws['A1'] = e['id'] + ' · ' + e['titulo']; ws['A1'].font = f_title
    ws['A2'] = GRP[e['grupo']] + '.  Fuente: ' + e['fuente']['t']; ws['A2'].font = f_sub
    r = 3
    if e['fuente'].get('url'):
        ws.cell(r, 1, e['fuente']['url']).hyperlink = e['fuente']['url']; ws.cell(r, 1).font = f_link; r += 1
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=12); c = ws.cell(r, 1, 'Enunciado. ' + e['enunciado']); c.font = f_norm; c.alignment = wrap
    ws.row_dimensions[r].height = max(30, 13.5 * (len(e['enunciado']) // 165 + 1)); r += 1
    if e['perfil']:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=12); c = ws.cell(r, 1, 'Perfil. ' + e['perfil']); c.font = f_norm; c.alignment = wrap
        ws.row_dimensions[r].height = max(28, 13.5 * (len(e['perfil']) // 165 + 1)); r += 1
    r += 1
    # ---- Datos
    ws.cell(r, 1, 'DATOS DEL EJERCICIO'); 
    for c in range(1, 15): ws.cell(r, c).fill = fill_sec; ws.cell(r, c).font = f_sec
    r += 1
    hdr = {1: '#', 2: 'Dato', 3: 'Unidad', 4: 'Valor', 11: 'Símbolo', 12: 'Fórmula (texto)'}
    for i, h in hdr.items():
        c = ws.cell(r, i, h); c.font = f_hdr; c.fill = fill_hdr; c.alignment = wrapc; c.border = box
    r += 1; cells = {}; first_data = r
    # asignar filas primero (las fórmulas pueden referenciar datos definidos antes)
    for k, p in enumerate(e['params']):
        row = first_data + k; cells[p['name']] = '$D$%d' % row
    for k, p in enumerate(e['params']):
        row = first_data + k
        ws.cell(row, 1, k + 1).font = f_norm
        c = ws.cell(row, 2, p['desc'] or p['name']); c.font = f_norm; c.alignment = wrap
        ws.cell(row, 3, p['unit']).font = f_norm
        if p['expr'] is None:
            c = ws.cell(row, 4, p['value']); c.font = f_blue; c.fill = fill_inp
        else:
            # la fórmula sólo puede usar datos anteriores
            c = ws.cell(row, 4, '=' + translate(p['expr'], {n: cells[n] for n in list(cells)[:k]})); c.font = f_norm
        ws.cell(row, 4).number_format = nf(p['value']) if p['value'] not in (None,) else 'General'
        ws.cell(row, 11, p['name']).font = f_norm
        c = ws.cell(row, 12, 'valor = ' + p['expr'] if p['expr'] else 'dato ingresado'); c.font = f_sub
        for cc in (1, 2, 3, 4, 11, 12): ws.cell(row, cc).border = box
    r = first_data + len(e['params']) + 1
    # ---- Comparación
    ws.cell(r, 1, 'COMPARACIÓN: TEORÍA / DATO PUBLICADO  vs  PROGRAMA (Atlas Estructuras 3D)')
    for c in range(1, 15): ws.cell(r, c).fill = fill_sec; ws.cell(r, c).font = f_sec
    r += 1
    hdr = ['#', 'Comprobación', 'Unidad', 'Teoría / publicado', 'Programa', 'Diferencia (prog. − teoría)', 'Error relativo', 'Tol. relativa', 'Tol. absoluta', 'Estado', 'Origen', 'Expresión de la teoría (texto)', 'Dónde se lee en el programa', 'Nota']
    for i, h in enumerate(hdr, 1):
        c = ws.cell(r, i, h); c.font = f_hdr; c.fill = fill_hdr; c.alignment = wrapc; c.border = box
    ws.row_dimensions[r].height = 30; r += 1; c0 = r
    for k, q_ in enumerate(e['rows']):
        row = c0 + k
        ws.cell(row, 1, k + 1).font = f_norm
        c = ws.cell(row, 2, q_['label']); c.font = f_norm; c.alignment = wrap
        ws.cell(row, 3, q_['unit']).font = f_norm
        th = translate(q_['expr'], cells)
        ws.cell(row, 4, '=ABS(%s)' % th if q_['abs'] else '=' + th).font = f_norm
        c = ws.cell(row, 5, abs(q_['program']) if q_['abs'] else q_['program']); c.font = f_blue; c.fill = fill_inp
        mag = max(abs(q_['theory']), abs(q_['program']))
        ws.cell(row, 4).number_format = nf(mag); ws.cell(row, 5).number_format = nf(mag)
        ws.cell(row, 6, '=E%d-D%d' % (row, row)).font = f_norm; ws.cell(row, 6).number_format = '0.0000E+00'
        c = ws.cell(row, 7, '=IF(ABS(D%d)>0.000000000001,F%d/D%d,"—")' % (row, row, row)); c.font = f_norm; c.number_format = '0.0000%'
        c = ws.cell(row, 8, q_['tol']); c.font = f_blue; c.fill = fill_inp; c.number_format = '0.0000%'
        c = ws.cell(row, 9, q_['atol']); c.font = f_blue; c.fill = fill_inp; c.number_format = '0.0E+00'
        c = ws.cell(row, 10, '=IF(ABS(F%d)<=MAX(H%d*ABS(D%d),I%d),"OK","NO")' % (row, row, row, row)); c.font = f_bold; c.alignment = Alignment(horizontal='center')
        c = ws.cell(row, 11, 'Publicado' if q_['pub'] else 'Fórmula'); c.font = f_norm
        if q_['pub']: c.fill = fill_pub
        c = ws.cell(row, 12, q_['expr']); c.font = f_sub; c.alignment = wrap
        c = ws.cell(row, 13, q_['ref']); c.font = f_sub; c.alignment = wrap
        note = q_['note'] + (' ' if q_['note'] and q_['abs'] else '') + ('Se comparan valores absolutos (la convención de signo es independiente del resultado).' if q_['abs'] else '')
        c = ws.cell(row, 14, note.strip()); c.font = f_sub; c.alignment = wrap
        for cc in range(1, 15): ws.cell(row, cc).border = box
        ws.row_dimensions[row].height = 28 if (len(q_['label']) > 55 or len(q_['ref']) > 60) else 16
    c1 = c0 + len(e['rows']) - 1
    ws.conditional_formatting.add('J%d:J%d' % (c0, c1), CellIsRule(operator='equal', formula=['"OK"'], fill=fill_ok))
    ws.conditional_formatting.add('J%d:J%d' % (c0, c1), CellIsRule(operator='equal', formula=['"NO"'], fill=fill_bad))
    rr = c1 + 2
    ws.cell(rr, 2, 'Comprobaciones dentro de tolerancia').font = f_bold
    ws.cell(rr, 4, '=COUNTIF(J%d:J%d,"OK")' % (c0, c1)).font = f_bold
    ws.cell(rr, 5, '=ROWS(J%d:J%d)' % (c0, c1)).font = f_bold
    ws.cell(rr, 6, '=IF(D%d=E%d,"VERIFICA","DIFIERE")' % (rr, rr)).font = f_bold
    ws.cell(rr + 1, 2, 'Azul = dato ingresado o valor que entregó el programa (pegado); negro = fórmula de Excel. El valor «Programa» es el resultado del motor de cálculo de la app para el mismo modelo.').font = f_sub
    ws.sheet_view.showGridLines = False
    ranges[e['id']] = (sheet_name(e), c0, c1, rr)

# ───────────────────────── Resumen ─────────────────────────
ws = ws0
for i, w in enumerate([8, 24, 62, 70, 15, 15, 14], 1): ws.column_dimensions[get_column_letter(i)].width = w
ws['A1'] = 'Verificación de Atlas Estructuras 3D contra problemas resueltos'; ws['A1'].font = f_title
ws['A2'] = 'Informe generado el %s. Cada hoja «Ej …» recrea un ejercicio, compara la solución de libro (o la fórmula cerrada) con el resultado del programa y muestra las fórmulas.' % datetime.date.today().strftime('%d/%m/%Y'); ws['A2'].font = f_sub
ws['A4'] = 'Resultado global'; ws['A4'].font = f_sec
first = 8; last = first + len(D) - 1
ws['A5'] = 'Ejercicios que verifican  (verifican | total)'; ws['A5'].font = f_bold; ws['E5'] = '=COUNTIF(G%d:G%d,"VERIFICA")' % (first, last); ws['F5'] = '=ROWS(G%d:G%d)' % (first, last)
ws['A6'] = 'Comprobaciones dentro de tolerancia  (dentro | total)'; ws['A6'].font = f_bold; ws['E6'] = '=SUM(F%d:F%d)' % (first, last); ws['F6'] = '=SUM(E%d:E%d)' % (first, last)
for c in ('E5', 'F5', 'E6', 'F6'): ws[c].font = f_bold
hdr = ['ID', 'Tipo', 'Ejercicio', 'Fuente', 'Comprobaciones', 'Dentro de tolerancia', 'Estado']
for i, h in enumerate(hdr, 1):
    c = ws.cell(first - 1, i, h); c.font = f_hdr; c.fill = fill_hdr; c.alignment = wrapc; c.border = box
for k, e in enumerate(D):
    row = first + k; sn, c0, c1, rr = ranges[e['id']]
    ws.cell(row, 1, e['id']).hyperlink = "#'%s'!A1" % sn; ws.cell(row, 1).font = f_link
    ws.cell(row, 2, GRP[e['grupo']]).font = f_norm
    c = ws.cell(row, 3, e['titulo']); c.font = f_norm; c.alignment = wrap
    c = ws.cell(row, 4, e['fuente']['t']); c.font = f_sub; c.alignment = wrap
    ws.cell(row, 5, "=%s!E%d" % (q(sn), rr)).font = f_norm
    ws.cell(row, 6, "=%s!D%d" % (q(sn), rr)).font = f_norm
    c = ws.cell(row, 7, '=IF(F%d=E%d,"VERIFICA","DIFIERE")' % (row, row)); c.font = f_bold; c.alignment = Alignment(horizontal='center', vertical='center')
    for cc in range(1, 8): ws.cell(row, cc).border = box
    ws.row_dimensions[row].height = 28
    for cc in (1, 2, 5, 6): ws.cell(row, cc).alignment = Alignment(vertical='center', horizontal='center' if cc > 2 else 'left')
ws.conditional_formatting.add('G%d:G%d' % (first, last), CellIsRule(operator='equal', formula=['"VERIFICA"'], fill=fill_ok))
ws.conditional_formatting.add('G%d:G%d' % (first, last), CellIsRule(operator='equal', formula=['"DIFIERE"'], fill=fill_bad))
ws.freeze_panes = ws.cell(first, 1)
ws.sheet_view.showGridLines = False

# ───────────────────────── Notas ─────────────────────────
wn = wb.create_sheet('Notas'); wn.column_dimensions['A'].width = 34; wn.column_dimensions['B'].width = 120
wn.sheet_view.showGridLines = False
row = 1
def put(a, b=None, bold=False, sec=False, url=None):
    global row
    ca = wn.cell(row, 1, a); ca.font = f_sec if sec else (f_bold if bold else f_norm); ca.alignment = wrap
    if sec:
        for c in (1, 2): wn.cell(row, c).fill = fill_sec
    if b is not None:
        cb = wn.cell(row, 2, b); cb.font = f_link if url else f_norm; cb.alignment = wrap
        if url: cb.hyperlink = url
        wn.row_dimensions[row].height = max(15, 13.2 * max(len(str(b)) // 118 + 1, len(str(a)) // 30 + 1))
    row += 1
wn.cell(row, 1, 'Notas, alcance y límites de la verificación').font = f_title; row += 2
put('Cómo leer este informe', None, sec=True)
put('Qué se compara', 'Cada ejercicio se arma en el programa (nudos, barras, cargas y combinaciones), se calcula con el mismo motor de la app y se compara el resultado con (a) un número impreso en un libro o apunte, o (b) una fórmula cerrada que se escribe en la hoja con sintaxis de Excel. La columna «Programa» pega el valor que dio la app; la columna «Teoría» es una fórmula viva que se recalcula si cambiás los datos.')
put('Tolerancias', 'Se fijaron según el origen de la teoría: 0,01 % para fórmulas exactas (el único error es el redondeo numérico), 0,1 a 0,5 % cuando el libro redondea sus cifras, y 1,5 a 2 % donde la fuente es una aproximación (por ejemplo el momento plástico con el Zx de tabla). Están en las columnas «Tol.» y se pueden cambiar.')
put('Colores', 'Azul sobre fondo amarillo: dato ingresado o valor entregado por el programa. Negro: fórmula de Excel. «Publicado» marca las filas cuyo número está impreso en la fuente; «Fórmula» las que se obtienen de una expresión cerrada.')
put('Dónde reproducirlo', 'En la app, botón «Ejercicios» (barra superior): lista los %d ejercicios con su estado' % len(D) + ', permite cargar cada uno en el lienzo, calcularlo y ver la comparación en la pestaña «Verificación», y volver a correr todo.')
row += 1
put('Fuentes con resultado publicado', None, sec=True)
SRC = [('Prof. R. Austin, Univ. de Maryland — ENCE 353, «Direct Stiffness Method»', 'https://user.eng.umd.edu/~austin/ence353.d/lecture-material2025/direct-stiffness-method.pdf', 'Tres cerchas planas (A01–A03). Los desplazamientos y axiles publicados coinciden con el programa hasta el redondeo de la fuente.'),
       ('Univ. de Memphis — CIVL 7117, capítulo 5b (emparrillado)', 'https://www.ce.memphis.edu/7117/notes/presentations/chapter_05b.pdf', 'Emparrillado en L con flexión y torsión (A04). La fuente redondea (torsor 1,50 kN·m; la solución exacta es 1,646). Se agregaron filas con la solución exacta deducida por compatibilidad y verificada con PyNite.'),
       ('INTI-CIRSOC — Ejemplos de aplicación del Reglamento CIRSOC 301-EL', 'https://www.inti.gob.ar/assets/uploads/files/cirsoc/EJEMPLOS%202/EJEMPLOS%202.2/1_%20ejemplos_301.pdf', 'Ejemplos 4 (barra traccionada IPB 120, φtPn = 719 kN), 5 (viga IPE 500 de 16 m, Mu = 332,8 kN·m, Vu = 41,6 kN) y 6 (viga PNI 300, Mu = 275 kN·m, φbMp = 161,16 kN·m): A05–A07.'),
       ('Michigan State Univ. — CE 405 «Design of Steel Structures», cap. 3', 'https://www.egr.msu.edu/~harichan/classes/ce405/chap3.pdf', 'Ejemplos 3.2 (W14×74, φcPn = 408 kip) y 3.4 (W14×132, φcPn ≈ 1 300 kip), con el método AISC-LRFD 1999 (φc = 0,85, parámetro λc) en que se basa el CIRSOC 301-2005: A08 y A09.')]
for t, u, d in SRC:
    put(t, u, bold=True, url=u); put('', d)
put('Funciones nuevas de la versión 2 (N01–N15)', 'Soluciones cerradas de la teoría de vigas: viga-columna de Timoshenko & Gere («Theory of Elastic Stability»: tan kL, sec u, carga crítica de Engesser con corte), resistencia de materiales de Timoshenko y Roark (cargas puntuales, parciales, triangulares, momentos puntuales, deformación por corte), pendiente-deflexión con resortes de giro (Monforton & Wu), y Ghali & Neville («Structural Analysis») para temperatura y asentamientos. Las fórmulas se escribieron de memoria como resultados estándar y no se transcribieron de una página concreta: que coincidan con el programa a ~1e-8 sólo ocurre si las dos derivaciones (la del elemento exacto y la fórmula cerrada) son correctas. N16 es un contraste con otro programa (PyNite FEA 3.2, análisis P-Δ con las columnas divididas en 16 elementos) sobre un pórtico plano con 800 kN por columna: el desplazamiento horizontal de segundo orden (5,8115 mm, +13 % sobre el primer orden) coincide en 4 decimales y los momentos de base difieren ≈0,002 %; el descenso vertical difiere 0,07 % porque el elemento exacto no incluye el acortamiento por arqueo.')
put('Límite de N15', 'El momento máximo con deformación por corte se dedujo de la misma ecuación diferencial que usa el elemento (M″ + κM = r·w); confirma la implementación numérica pero no es una fuente independiente. Sí es independiente y clásica la carga crítica Pcr = Pe/(1 + Pe/G·As), con la que la fórmula es coherente.')
put('Constantes escritas de memoria', 'En N09, N11 y N12 (marcados «Fórmulas del Reglamento») las constantes del LRFD-99 / CIRSOC 301-2005 se escribieron de memoria: tope Cb ≤ 2,3; λp = 0,38√(E/Fy); λr = 0,95√(kc·E/FL) y FL = Fy − 114 MPa para perfiles soldados; límite 0,64√(kc·E/Fy) y Qs = 1,415 − 0,65·λ·√(Fy/E)/√kc en compresión; kc = 4/√(h/tw). El ejercicio detecta que el programa las aplique como están escritas, pero NO garantiza que coincidan con el texto del Reglamento: hay que cotejarlas con el CIRSOC 301-2005 antes de usar el resultado en un proyecto.')
put('Cómo se leyeron', 'Los PDF se leyeron con un lector automático que devuelve resúmenes. Para no depender de una transcripción, los números usados se recalcularon a mano: 719,1 kN = 0,9·235 MPa·3 400 mm²; Mu = (1,2·2 + 1,6·5)·16²/8 = 332,8 kN·m; Vu = 10,4·(8 − 4) = 41,6 kN; φbMp = 0,9·235·762 cm³ = 161,16 kN·m; φcPn de W14×74 = 0,85·21,8·21,99 = 407,5 kip.')
row += 1
put('Lo que NO se pudo obtener', None, sec=True)
put('Libros completos', 'No se pudo leer el texto de Kassimali, McGuire–Gallagher–Ziemian ni de Hibbeler: los PDF disponibles son demasiado grandes para el lector o no están publicados en forma abierta. No se usaron copias pirata. Los problemas de esos libros no están en este informe.')
put('Apuntes bloqueados', 'Las guías de la UTN Facultad Regional Mendoza (CIRSOC 301) y otros repositorios impiden el acceso automático (robots.txt); no se eludió la restricción. Del documento del INTI sólo se pudo verificar con confianza los ejemplos 4 a 6; el ejemplo 6 completo (PNI 300 con platabanda soldada) no se reproduce: aquí sólo se verifican Mu y φb·Mp del perfil solo. Las propiedades de las secciones armadas de la versión 2 (PS soldada, perfil + platabanda, cajón) se verifican aparte en N10.')
put('Pedido', 'Si me pasás fotos o PDF de problemas resueltos de tus propios libros (con su resultado), los cargo del mismo modo y se agregan a este informe.')
row += 1
put('Resultados que no coinciden exactamente (y por qué)', None, sec=True)
put('A04 – torsor publicado', 'La fuente da 1,50 kN·m y la solución exacta del problema es 1,646 kN·m (el programa y PyNite coinciden con la exacta). Diferencia atribuible al redondeo del apunte.')
put('A07 – momento plástico', 'El programa estima el módulo plástico Zx con la geometría simplificada de la sección y da 768 cm³ para el PNI 300; la tabla indica 762 cm³ (+0,8 %). Es una aproximación del programa, no un error del solver.')
put('A08 y A09 – columnas', 'La diferencia de −0,17 % y −0,25 % respecto de lo impreso viene del redondeo del libro y de usar el radio de giro calculado (√(I/A)) en lugar del tabulado.')
put('Perfiles IPE – Zx', 'Con la geometría simplificada (sin el acuerdo alma-ala) el programa subestima el módulo plástico respecto de la tabla en torno de 4 a 6 % (hoja «Control Zx IPE»). Es del lado seguro (reduce φbMp), pero hace que las barras IPE den en flexión un r algo mayor que el real. Se informa como observación; el catálogo de la app no se modificó.')

row += 1
put('Límites del programa que esta verificación NO cubre', None, sec=True)
put('Análisis', 'Segundo orden opcional por iteración sobre el axil de cada barra con funciones de estabilidad exactas (P-Δ y P-δ). No incluye imperfecciones iniciales ni cargas nocionales (la opción de rigidez reducida DAM no agrega nocionales), ni el acoplamiento axil-torsión, ni el alabeo restringido en el análisis (el Cw sólo interviene en la resistencia). Material elástico lineal; apoyos lineales.')
put('Resistencia', 'Tracción: sólo fluencia de la sección bruta (sin rotura de la sección neta). Flexocompresión con alma esbelta y cajones de almas esbeltas: aproximados. Sin uniones, anclajes, excentricidades, fatiga ni fuego. J y Cw de los perfiles laminados son aproximados (J ≈ 1,3·Σbt³/3).')
put('Generadores de viento y sismo', 'Los coeficientes de tabla (Cf, G, V, coeficiente sísmico C, pesos) los carga el usuario; el programa aplica las fórmulas de presión y reparto. Los generadores se probaron en la app (qz recalculado aparte, ΣF = C·W), pero no están en estos ejercicios; las combinaciones se verifican en N14 con los factores cargados en el propio ejercicio.')
put('Alcance de la prueba', 'Un problema de libro sólo prueba los casos que cubre: estas %d pruebas dan confianza razonable en el solver (desplazamientos, reacciones, esfuerzos, torsión, ejes locales, combinaciones, cargas de barra, resortes, asentamientos, uniones semirrígidas, deformación por corte y segundo orden) y en la implementación de las fórmulas de resistencia, pero no reemplazan la revisión del proyecto por un profesional.' % len(D))
row += 1
put('Prueba de sensibilidad (¿detectan los ejercicios un error?)', None, sec=True)
MR = json.load(open(os.path.join(HERE, 'mut_results.json'), encoding='utf8'))
put('Método', 'Se alteró a propósito el código del programa, de a una modificación por vez, y se volvieron a correr los %d ejercicios. Las %d alteraciones fueron detectadas por al menos un ejercicio:' % (len(D), MR['total']) if MR['detected'] == MR['total'] else 'Se alteró a propósito el código del programa, de a una modificación por vez, y se volvieron a correr los %d ejercicios. Fueron detectadas %d de %d alteraciones.' % (len(D), MR['detected'], MR['total']))
for m in MR['rows']: put(m['name'], ('Detectado por: ' + ', '.join(m['exercises'][:14]) + (' …' if len(m['exercises']) > 14 else '')) if m['detected'] else 'NO detectado por ningún ejercicio')

# ───────────────────────── Control Zx IPE ─────────────────────────
wz = wb.create_sheet('Control Zx IPE'); wz.sheet_view.showGridLines = False
for i, w in enumerate([12, 10, 10, 10, 10, 18, 20, 16], 1): wz.column_dimensions[get_column_letter(i)].width = w
wz['A1'] = 'Módulo plástico Zx de los IPE: programa vs tabla'; wz['A1'].font = f_title
wz['A2'] = 'Zx programa = b·tf·(h − tf) + tw·(h − 2tf)²/4 (geometría simplificada del programa; el tope 1,5·Sx no interviene en estos perfiles). Zx tabla = Wpl,y de las tablas de perfiles IPE.'; wz['A2'].font = f_sub
for i, h in enumerate(['Perfil', 'h (mm)', 'b (mm)', 'tw (mm)', 'tf (mm)', 'Wpl,y tabla (cm³)', 'Zx programa (cm³)', 'Programa / tabla − 1'], 1):
    c = wz.cell(4, i, h); c.font = f_hdr; c.fill = fill_hdr; c.alignment = wrapc; c.border = box
wz.row_dimensions[4].height = 30
IPE = [('IPE 100', 100, 55, 4.1, 5.7, 39.4), ('IPE 200', 200, 100, 5.6, 8.5, 220.6), ('IPE 240', 240, 120, 6.2, 9.8, 366.6), ('IPE 300', 300, 150, 7.1, 10.7, 628.4), ('IPE 400', 400, 180, 8.6, 13.5, 1307)]
for k, (n, h, b, tw, tf, w) in enumerate(IPE):
    r = 5 + k
    wz.cell(r, 1, n).font = f_norm
    for j, v in enumerate([h, b, tw, tf, w], 2): c = wz.cell(r, j, v); c.font = f_blue; c.fill = fill_inp
    wz.cell(r, 7, '=(C%d*E%d*(B%d-E%d)+D%d*(B%d-2*E%d)^2/4)/1000' % (r, r, r, r, r, r, r)).font = f_norm
    wz.cell(r, 7).number_format = '0.0'
    c = wz.cell(r, 8, '=G%d/F%d-1' % (r, r)); c.font = f_bold; c.number_format = '0.0%'
    for cc in range(1, 9): wz.cell(r, cc).border = box
wz.cell(11, 1, 'Los valores de h, b, tw, tf y Wpl,y son de tabla (Wpl,y: catálogos de IPE EN 10365). La diferencia negativa indica que el programa es conservador en flexión.').font = f_sub

# ordenar hojas: Resumen, Notas, Control, ejercicios
order = ['Resumen', 'Notas', 'Control Zx IPE'] + [sheet_name(e) for e in D]
wb._sheets = [wb[n] for n in order]
from openpyxl.worksheet.properties import PageSetupProperties
for w_ in wb.worksheets:
    w_.sheet_properties.tabColor = None
    w_.page_setup.orientation = 'landscape'; w_.page_setup.paperSize = 9; w_.page_setup.fitToWidth = 1; w_.page_setup.fitToHeight = 0
    w_.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
wb['Resumen'].sheet_properties.tabColor = '1F4E5F'
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('guardado', OUT, len(wb.worksheets), 'hojas')
