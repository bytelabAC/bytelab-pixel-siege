const fs=require('fs'),path=require('path'),vm=require('vm');
const base=path.join(__dirname,'..','bytelab-pixel-siege','assets','js');
const ctx={console,Math,Date,JSON};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['physics.js','levels.js','sim.js']) vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),ctx,{filename:f});
const Sim=ctx.BYTELAB_Sim;
for (const idx of [13]) {
  const g=Sim.create(idx,{seed:7});
  const snap=g.blocks.concat(g.bugs).map(b=>({b,x:b.x,y:b.y}));
  for(let s=0;s<120*6;s++) g.update(1/120);
  let worst=0, wi=-1;
  snap.forEach((s,i)=>{ if(!s.b.alive) return; const d=Math.hypot(s.b.x-s.x,s.b.y-s.y); if(d>worst){worst=d;wi=i;} });
  console.log('L'+(idx+1), 'drift', worst.toFixed(2), 'body', wi, snap[wi] && snap[wi].b.kind, 'y', snap[wi] && snap[wi].y.toFixed(0));
}
