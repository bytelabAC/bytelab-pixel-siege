const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(__dirname, '..', 'bytelab-pixel-siege', 'assets', 'js');
const ctx = { console, Math, Date, JSON };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['physics.js', 'levels.js', 'sim.js']) {
  vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), ctx, { filename: f });
}
const Sim = ctx.BYTELAB_Sim, Levels = ctx.BYTELAB_Levels;
const SLING = Levels.SLING;

function clone(game) {
  // replay from scratch: we re-run deterministically, so a "clone" is a fresh
  // game plus the list of shots taken so far
  return game;
}

function shootAt(g, ang, pw, ability) {
  const a = ang * Math.PI / 180, pull = Sim.MAX_PULL * pw;
  const x = SLING.x - Math.cos(a) * pull;
  const y = SLING.y + Math.sin(a) * pull;
  if (!g.aimStart(x, y)) return false;
  g.aimMove(x, y);
  if (!g.aimEnd()) return false;
  let t = 0, used = false;
  while (g.phase === 'flying' && t < 7) {
    g.update(1 / 120); t += 1 / 120;
    if (ability && !used && t > 0.35) { g.useAbility(); used = true; }
  }
  let guard = 0;
  while ((g.phase === 'settling') && guard < 400) { g.update(1 / 120); guard++; }
  return true;
}

let totalWins = 0;
for (let i = 0; i < Levels.count; i++) {
  const lv = Levels.get(i);
  let bestRun = null;
  // greedy: at each step try a small grid of shots on a copy (deterministic replay)
  let shots = [];
  let game = Sim.create(i, { seed: 11 });
  let guard = 0;
  while (game.phase !== 'won' && game.phase !== 'lost' && guard < 8) {
    guard++;
    let best = null;
    for (let ang = 12; ang <= 62; ang += 6) {
      for (let pw = 0.75; pw <= 1.001; pw += 0.12) {
        const trial = Sim.create(i, { seed: 11 });
        shots.forEach(s => shootAt(trial, s.ang, s.pw, s.ability));
        if (trial.phase === 'won' || trial.phase === 'lost') break;
        const before = trial.score;
        shootAt(trial, ang, pw, true);
        const gain = trial.score - before;
        const alive = trial.bugsLeft;
        const key = gain * 10 + (lv.bugCount - alive) * 1000;
        if (!best || key > best.key) best = { ang, pw: +pw.toFixed(2), key, trial, gain, alive };
      }
    }
    if (!best) break;
    shots.push({ ang: best.ang, pw: best.pw, ability: true });
    game = best.trial;
  }
  const ok = game.phase === 'won';
  if (ok) totalWins++;
  console.log(`L${String(i + 1).padStart(2)} ${ok ? 'WON ' : 'LOST'} shots=${game.shots} score=${game.score} stars=${game.stars} bugsLeft=${game.bugsLeft} birdsLeft=${game.birdsRemaining()} phase=${game.phase} of max=${lv.maxScore} thresh=${JSON.stringify(lv.stars)}`);
}
console.log(`\ncleared ${totalWins}/${Levels.count} levels with greedy AI`);
