/* Render real game frames through the actual renderer, dump primitives to JSON. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Recorder } = require('./canvas-shim');

const base = path.join(__dirname, '..', 'bytelab-pixel-siege', 'assets', 'js');
const ctx = { console, Math, Date, JSON, requestAnimationFrame: () => 0 };
ctx.window = ctx;
ctx.devicePixelRatio = 1;
vm.createContext(ctx);
for (const f of ['physics.js', 'levels.js', 'sim.js', 'render.js']) {
  vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f });
}
const Sim = ctx.BYTELAB_Sim, Render = ctx.BYTELAB_Render, Levels = ctx.BYTELAB_Levels;

function makeCanvas(w, h) {
  const rec = new Recorder(w, h);
  const canvas = {
    width: w, height: h, clientWidth: w, clientHeight: h,
    getBoundingClientRect: () => ({ width: w, height: h, left: 0, top: 0 }),
    getContext: () => rec
  };
  return { canvas, rec };
}

const W = 1280, H = 720;

function shoot(g, ang, pw, abilityDelay) {
  const a = ang * Math.PI / 180, pull = Sim.MAX_PULL * pw;
  const x = Levels.SLING.x - Math.cos(a) * pull;
  const y = Levels.SLING.y + Math.sin(a) * pull;
  g.aimStart(x, y); g.aimMove(x, y); g.aimEnd();
  let t = 0, used = false;
  while (g.phase === 'flying' && t < 7) {
    g.update(1 / 120); t += 1 / 120;
    if (abilityDelay != null && !used && t > abilityDelay) { g.useAbility(); used = true; }
  }
  let guard = 0;
  while (g.phase === 'settling' && guard < 300) { g.update(1 / 120); guard++; }
}

function capture(name, g, frames, opts = {}) {
  const { canvas, rec } = makeCanvas(W, H);
  const renderer = new Render.Renderer(canvas, { reducedMotion: true });
  const out = [];
  let t = 0;
  for (const f of frames) {
    const step = Math.max(0, f - t);
    t = f;
    // advance the sim then draw (so particles/anim match the frame time)
    if (opts.simStep) {
      const n = Math.round(step / (1 / 120));
      for (let i = 0; i < n; i++) g.update(1 / 120);
    }
    rec.ops.length = 0;
    renderer.handleEvents(g.drainEvents());
    renderer.draw(g, 1 / 60);
    out.push({ name: name + '_' + f.toFixed(2), ops: JSON.parse(JSON.stringify(rec.ops)) });
  }
  return out;
}

const all = [];

// 1. opening state of level 1
{
  const g = Sim.create(0, { seed: 42 });
  const { canvas, rec } = makeCanvas(W, H);
  const renderer = new Render.Renderer(canvas, { reducedMotion: true });
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l1_idle', ops: JSON.parse(JSON.stringify(rec.ops)) });

  // 2. aiming
  const a = 32 * Math.PI / 180, pull = Sim.MAX_PULL * 0.95;
  const x = Levels.SLING.x - Math.cos(a) * pull;
  const y = Levels.SLING.y + Math.sin(a) * pull;
  g.aimStart(x, y); g.aimMove(x, y);
  rec.ops.length = 0;
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l1_aim', ops: JSON.parse(JSON.stringify(rec.ops)) });

  // 3. mid flight + impact
  g.aimEnd();
  for (let i = 0; i < 55; i++) g.update(1 / 120);
  rec.ops.length = 0;
  renderer.handleEvents(g.drainEvents());
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l1_flight', ops: JSON.parse(JSON.stringify(rec.ops)) });

  for (let i = 0; i < 40; i++) g.update(1 / 120);
  rec.ops.length = 0;
  renderer.handleEvents(g.drainEvents());
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l1_impact', ops: JSON.parse(JSON.stringify(rec.ops)) });

  for (let i = 0; i < 120; i++) g.update(1 / 120);
  rec.ops.length = 0;
  renderer.handleEvents(g.drainEvents());
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l1_after', ops: JSON.parse(JSON.stringify(rec.ops)) });
}

// 4. a dense level (10 · flask) idle
{
  const g = Sim.create(9, { seed: 9 });
  const { canvas, rec } = makeCanvas(W, H);
  const renderer = new Render.Renderer(canvas, { reducedMotion: true });
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l10_idle', ops: JSON.parse(JSON.stringify(rec.ops)) });
}

// 5. big level mid-collapse (12)
{
  const g = Sim.create(11, { seed: 9 });
  const { canvas, rec } = makeCanvas(W, H);
  const renderer = new Render.Renderer(canvas, { reducedMotion: true });
  shoot(g, 30, 0.95, 0.4);
  renderer.handleEvents(g.drainEvents());
  renderer.draw(g, 1 / 60);
  all.push({ name: 'l12_settled', ops: JSON.parse(JSON.stringify(rec.ops)) });
}

fs.writeFileSync(path.join(__dirname, 'frames.json'), JSON.stringify(all));
console.log('frames:', all.map(f => f.name + '(' + f.ops.length + ')').join(' '));
