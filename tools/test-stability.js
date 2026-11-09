const P = require('../bytelab-pixel-siege/assets/js/physics.js');

// Ground top at y = 640 (world 1280x720)
const G = 640;

function buildTower() {
  const w = new P.World({ gravityY: 1500 });
  w.add(new P.Body({ type: 'box', x: 640, y: 700, w: 3000, h: 120, 'static': true, friction: 0.9 }));
  const bodies = [];
  for (const px of [800, 960]) {
    bodies.push(w.add(new P.Body({ type: 'box', x: px, y: G - 60, w: 24, h: 120, density: 0.0055 })));
    bodies.push(w.add(new P.Body({ type: 'box', x: px, y: G - 180, w: 24, h: 120, density: 0.0055 })));
  }
  bodies.push(w.add(new P.Body({ type: 'box', x: 880, y: G - 251, w: 200, h: 22, density: 0.0055 })));
  bodies.push(w.add(new P.Body({ type: 'box', x: 880, y: G - 282, w: 40, h: 40, density: 0.0055 })));
  return { w, bodies };
}

const { w, bodies } = buildTower();
const start = bodies.map(b => ({ x: b.x, y: b.y, a: b.angle }));
for (let i = 0; i < 120 * 6; i++) w.update(1 / 120);

let maxDrift = 0;
bodies.forEach((b, i) => {
  const d = Math.hypot(b.x - start[i].x, b.y - start[i].y);
  maxDrift = Math.max(maxDrift, d);
  console.log(i, 'pos', b.x.toFixed(1), b.y.toFixed(1), 'ang', (b.angle * 180 / Math.PI).toFixed(1) + '°', 'drift', d.toFixed(2), b.awake ? 'AWAKE' : 'sleep');
});
console.log('max drift:', maxDrift.toFixed(3));

// --- impact test: a heavy bird at speed hits the left pillar
const g2 = buildTower();
const bird = g2.w.add(new P.Body({ type: 'circle', x: 300, y: 500, r: 17, density: 0.02, kind: 'bird', restitution: 0.15 }));
bird.vx = 1250; bird.vy = -60;
const bstart = g2.bodies.map(b => ({ x: b.x, y: b.y }));
let maxImpact = 0;
for (let i = 0; i < 120 * 4; i++) {
  g2.w.update(1 / 120);
  g2.w.eachContact(c => {
    maxImpact = Math.max(maxImpact, c.a.impact || 0, c.b.impact || 0);
  });
}
console.log('\nbird stopped at', bird.x.toFixed(0), bird.y.toFixed(0), 'v', bird.speed().toFixed(0));
console.log('max impact power recorded:', maxImpact.toFixed(0));
g2.bodies.forEach((b, i) => {
  if (!b.isStatic) console.log('body', i, b.kind, 'drift', Math.hypot(b.x - bstart[i].x, b.y - bstart[i].y).toFixed(1), 'ang', (b.angle * 180 / Math.PI).toFixed(0) + '°', 'impact', (b.impact || 0).toFixed(0));
});

