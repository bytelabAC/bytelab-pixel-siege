const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(__dirname, '..', 'bytelab-pixel-siege', 'assets', 'js');
function load() {
  const ctx = { console, Math, Date, JSON };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['physics.js', 'levels.js', 'sim.js']) {
    vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}
const ctx = load();
const Sim = ctx.BYTELAB_Sim, Levels = ctx.BYTELAB_Levels, Phys = ctx.BYTELAB_Physics;

// ---- 1. geometry sanity: no initial overlaps, nothing floating below ground
let bad = 0;
for (let i = 0; i < Levels.count; i++) {
  const g = Sim.create(i, { seed: 3 });
  const dyn = g.world.bodies.filter(b => !b.isStatic);
  const issues = [];
  for (let a = 0; a < dyn.length; a++) {
    for (let b = a + 1; b < dyn.length; b++) {
      const m = Phys.collide(dyn[a], dyn[b]);
      if (m) {
        const pen = Math.max(...m.points.map(p => p.pen));
        if (pen > 0.6) issues.push(`overlap ${dyn[a].kind}@${dyn[a].x.toFixed(0)},${dyn[a].y.toFixed(0)} / ${dyn[b].kind}@${dyn[b].x.toFixed(0)},${dyn[b].y.toFixed(0)} pen=${pen.toFixed(1)}`);
      }
    }
    const box = dyn[a].aabb();
    if (box.maxY > Levels.GROUND + 0.8) issues.push(`below ground ${dyn[a].kind}@${dyn[a].x.toFixed(0)} maxY=${box.maxY.toFixed(1)}`);
    if (box.minX < 0 || box.maxX > 1280) issues.push(`outside world ${dyn[a].kind}@${dyn[a].x.toFixed(0)} x=[${box.minX.toFixed(0)},${box.maxX.toFixed(0)}]`);
  }
  if (issues.length) { bad++; console.log(`L${i + 1} ISSUES:`); issues.forEach(s => console.log('   ', s)); }
}
console.log(bad === 0 ? 'geometry: OK (no overlaps)' : `geometry: ${bad} levels with issues`);

// ---- 2. stability: 6 s idle
console.log('\nidle 6s:');
let worst = 0;
for (let i = 0; i < Levels.count; i++) {
  const g = Sim.create(i, { seed: 7 });
  const snap = g.blocks.concat(g.bugs).map(b => ({ b, x: b.x, y: b.y }));
  for (let s = 0; s < 120 * 6; s++) g.update(1 / 120);
  let drift = 0;
  snap.forEach(s => { if (s.b.alive) drift = Math.max(drift, Math.hypot(s.b.x - s.x, s.b.y - s.y)); });
  worst = Math.max(worst, drift);
  const ok = drift < 4 && g.bugsLeft === g.totalBugs && g.blocksLeft === g.totalBlocks;
  console.log(`  L${String(i + 1).padStart(2)} drift=${drift.toFixed(1).padStart(6)} bugs=${g.bugsLeft}/${g.totalBugs} blocks=${g.blocksLeft}/${g.totalBlocks} ${ok ? 'OK' : '<-- CHECK'}`);
}
console.log('worst drift:', worst.toFixed(1));

// ---- 3. playability: can a good shot win each level?
console.log('\nbest single shot per level (angle 15..60, power 0.7..1.0):');
for (let i = 0; i < Levels.count; i++) {
  let best = null;
  for (let ang = 15; ang <= 60; ang += 5) {
    for (let pw = 0.7; pw <= 1.001; pw += 0.1) {
      const g = Sim.create(i, { seed: 5 });
      const a = ang * Math.PI / 180, pull = Sim.MAX_PULL * pw;
      g.aimStart(Levels.SLING.x - Math.cos(a) * pull, Levels.SLING.y + Math.sin(a) * pull);
      g.aimMove(Levels.SLING.x - Math.cos(a) * pull, Levels.SLING.y + Math.sin(a) * pull);
      g.aimEnd();
      for (let s = 0; s < 120 * 5; s++) g.update(1 / 120);
      const r = { ang, pw: +pw.toFixed(1), score: g.score, bugs: g.bugsLeft, blocks: g.blocksLeft };
      if (!best || r.score > best.score) best = r;
    }
  }
  const lv = Levels.get(i);
  console.log(`  L${String(i + 1).padStart(2)} bugs=${lv.bugCount} blocks=${lv.blockCount} -> best score ${best.score} (bugs left ${best.bugs}, blocks left ${best.blocks}) angle ${best.ang} power ${best.pw}`);
}
