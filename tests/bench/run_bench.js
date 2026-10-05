// tests/bench/run_bench.js
const X=require('../lib/cargar').crear(['nucleo', 'bench-ejercicios', 'bench-motor'],'{BENCH,runBench,runBenchAll}'); const only=process.argv[2]; const verbose=process.argv.includes('-v');
let np=0,nf=0,nr=0;
for(const ex of X.BENCH){
  if(only && only!=='-v' && !ex.id.startsWith(only)) continue;
  let r; try{ r=X.runBench(ex);}catch(e){ console.log(ex.id,'EXCEPCIÓN',e.message); console.log(e.stack.split('\n').slice(0,4).join('\n')); nf++; continue;}
  if(!r.ok){ console.log(ex.id,'ERROR MODELO',r.error); nf++; continue; }
  const bad=r.rows.filter(q=>!q.ok); nr+=r.rows.length;
  console.log((r.pass?'OK  ':'FAIL')+' '+ex.id+' '+ex.titulo+'  ('+(r.rows.length-bad.length)+'/'+r.rows.length+')');
  if(r.pass) np++; else nf++;
  for(const q of (verbose?r.rows:bad)) console.log('     '+(q.ok?'·':'✗')+' '+q.label+' ['+q.unit+'] teoría='+q.theory.toPrecision(7)+' prog='+q.program.toPrecision(7)+' err='+(q.err==null?'-':(q.err*100).toFixed(4)+'%')+' tol='+q.tol);
}
console.log('\nejercicios OK',np,'FAIL',nf,'comprobaciones',nr);
process.exitCode=nf?1:0;
