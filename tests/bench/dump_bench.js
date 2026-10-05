// tests/bench/dump_bench.js
const fs=require('fs');
const X=require('../lib/cargar').crear(['nucleo', 'bench-ejercicios', 'bench-motor'],'{BENCH,runBench}');
const FN={N:'esfuerzo axil N (tracción +)',Vy:'corte Vy (en el plano del alma)',Vz:'corte Vz',T:'torsor T',Mz:'momento flector Mz (eje fuerte)',My:'momento flector My (eje débil)',vy:'flecha vy (plano del alma)',vz:'flecha vz',ux:'alargamiento ux'};
const CAPN={Fe:'tensión elástica crítica Fe',Fcr:'tensión crítica Fcr',Q:'factor de pandeo local Q',Qs:'factor Qs (elementos no rigidizados)',Qa:'factor Qa (elementos rigidizados)',phiPc:'φc·Pn compresión',phiPt:'φt·Pn tracción',phiMs:'φb·Mn flexión eje fuerte',phiMw:'φb·Mn flexión eje débil',phiVs:'φv·Vn corte eje fuerte',phiVw:'φv·Vn corte eje débil',lam:'esbeltez KL/r gobernante',Lp:'longitud Lp',Lr:'longitud Lr'};
function refText(ref,st){
  const cn=()=>st.combos[ref.c||0].n;
  switch(ref.k){
    case 'disp': return `Desplazamiento ${ref.d} del nudo ${ref.n} · combinación «${cn()}»`;
    case 'reac': return `Reacción ${ref.d} en el nudo ${ref.n} · combinación «${cn()}»`;
    case 'reacsum': return `Suma de reacciones ${ref.d} en los nudos ${ref.ns.join(', ')} · combinación «${cn()}»`;
    case 'mem': return `Barra ${ref.m}, en x = ${ref.x}·L, ${FN[ref.f]} · combinación «${cn()}»`;
    case 'cap': return `Barra ${ref.m}: ${CAPN[ref.f]||ref.f} (verificación de perfiles)`;
    case 'util': return ref.f==='Cb'?`Barra ${ref.m}: coeficiente Cb de la combinación que gobierna`:ref.f==='phiMsUsed'?`Barra ${ref.m}: resistencia de diseño φb·Mn usada en la verificación (N·mm)`:`Barra ${ref.m}: relación de uso r${ref.f?(' ('+ref.f+')'):''} máxima entre combinaciones de resistencia`;
    case 'sec': return `Barra ${ref.m}: propiedad de la sección «${ref.f}» calculada por el programa`;
    case 'celem': return `Barra ${ref.m}: elemento n.º ${ref.i+1} de la sección en compresión (${ref.f==='lam'?'esbeltez b/t':'límite de esbeltez λr'})`;
    case 'finfo': return `Barra ${ref.m}: elemento n.º ${ref.i+1} de la sección en flexión (${{lam:'esbeltez',lp:'límite λp',lr:'límite λr'}[ref.f]})`;
    case 'weight': return 'Peso total de los perfiles del modelo';
  } return '';
}
const out=BENCH_ORDER=[];
for(const ex of X.BENCH){
  const r=X.runBench(ex);
  out.push({id:ex.id,grupo:ex.grupo,titulo:ex.titulo,fuente:ex.fuente,enunciado:ex.enunciado,perfil:ex.perfil||'',tol:ex.tol,
    params:r.params.map(p=>({name:p.name,expr:p.expr,value:p.value,unit:p.unit,desc:p.desc})),
    rows:r.rows.map((q,i)=>({label:q.label,unit:q.unit,expr:q.expr,abs:q.abs,theory:q.theory,program:q.program,tol:q.tol,atol:q.atol,ok:q.ok,note:q.note,pub:q.pub,ref:refText(ex.checks[i].ref,r.st)})),
    pass:r.pass});
}
if(!process.argv[2]) throw new Error('Uso: node tests/bench/dump_bench.js <salida.json>');
fs.writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log('ejercicios',out.length,'filas',out.reduce((n,e)=>n+e.rows.length,0));
