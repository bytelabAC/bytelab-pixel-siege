/*!
 * BYTELAB Pixel Siege — physics core
 * Rigid bodies (OBB / circle), SAT collision, sequential impulses.
 * No DOM, no globals besides BYTELAB_Physics.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  root.BYTELAB_Physics = api;
  if (typeof module === 'object' && module.exports) { module.exports = api; }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var SLOP = 0.6;
  var BAUMGARTE = 0.12;
  var POS_PERCENT = 0.3;
  var ITERATIONS = 12;
  var POS_ITERATIONS = 2;
  var SLEEP_LINEAR = 11;     // px/s
  var SLEEP_ANGULAR = 0.22;  // rad/s
  var SLEEP_TIME = 0.4;      // s
  var MAX_SPEED = 4200;
  // Speculative contact margin: contacts are created slightly before bodies
  // actually touch, so a resting stack never free-falls for a few steps and
  // then slams (which used to inject spin and sideways creep).
  var MARGIN = 1.5;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function Body(opts) {
    opts = opts || {};
    this.type = opts.type === 'circle' ? 'circle' : 'box';
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.w = opts.w || 0;
    this.h = opts.h || 0;
    this.r = opts.r || 0;
    this.angle = opts.angle || 0;
    this.vx = 0;
    this.vy = 0;
    this.av = 0;
    this.isStatic = !!opts['static'];
    this.density = opts.density == null ? 0.0055 : opts.density;
    this.restitution = opts.restitution == null ? 0.04 : opts.restitution;
    this.friction = opts.friction == null ? 0.7 : opts.friction;
    this.kind = opts.kind || 'block';
    this.material = opts.material || 'panel';
    this.toughness = opts.toughness == null ? 1e9 : opts.toughness;
    this.hp = opts.hp == null ? 1 : opts.hp;
    this.maxHp = this.hp;
    this.alive = true;
    this.awake = true;
    this.sleepTimer = 0;
    this.impact = 0;
    this.lastImpact = 0;
    this.userData = opts.userData || {};
    this.id = opts.id == null ? 0 : opts.id;
    this.recompute();
    if (this.isStatic) {
      this.mass = 0; this.invMass = 0; this.invI = 0; this.I = 0;
    }
  }

  Body.prototype.recompute = function () {
    var area = this.type === 'circle' ? Math.PI * this.r * this.r : this.w * this.h;
    this.mass = Math.max(0.05, area * this.density);
    this.invMass = this.isStatic ? 0 : 1 / this.mass;
    this.I = this.type === 'circle'
      ? 0.5 * this.mass * this.r * this.r
      : this.mass * (this.w * this.w + this.h * this.h) / 12;
    this.invI = this.isStatic ? 0 : 1 / this.I;
  };

  Body.prototype.wake = function () {
    this.awake = true;
    this.sleepTimer = 0;
  };

  Body.prototype.sleep = function () {
    this.awake = false;
    this.vx = 0; this.vy = 0; this.av = 0;
  };

  Body.prototype.speed = function () {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  };

  Body.prototype.aabb = function () {
    if (this.type === 'circle') {
      return { minX: this.x - this.r, minY: this.y - this.r, maxX: this.x + this.r, maxY: this.y + this.r };
    }
    var c = Math.abs(Math.cos(this.angle)), s = Math.abs(Math.sin(this.angle));
    var ex = (this.w * c + this.h * s) * 0.5;
    var ey = (this.w * s + this.h * c) * 0.5;
    return { minX: this.x - ex, minY: this.y - ey, maxX: this.x + ex, maxY: this.y + ey };
  };

  Body.prototype.corners = function () {
    var c = Math.cos(this.angle), s = Math.sin(this.angle);
    var hw = this.w * 0.5, hh = this.h * 0.5;
    var pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    var out = [];
    for (var i = 0; i < 4; i++) {
      var px = pts[i][0], py = pts[i][1];
      out.push({ x: this.x + px * c - py * s, y: this.y + px * s + py * c });
    }
    return out;
  };

  Body.prototype.applyImpulse = function (jx, jy, px, py) {
    if (this.isStatic || !this.awake) { return; }
    this.vx += jx * this.invMass;
    this.vy += jy * this.invMass;
    this.av += ((px - this.x) * jy - (py - this.y) * jx) * this.invI;
  };

  // ---------------------------------------------------------------- geometry

  function projectBox(b, ax, ay) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    var r = Math.abs(ax * c + ay * s) * b.w * 0.5 + Math.abs(ax * -s + ay * c) * b.h * 0.5;
    var pc = ax * b.x + ay * b.y;
    return [pc - r, pc + r];
  }

  function pointInBox(px, py, b, margin) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    var dx = px - b.x, dy = py - b.y;
    var lx = dx * c + dy * s;
    var ly = -dx * s + dy * c;
    return Math.abs(lx) <= b.w * 0.5 + margin && Math.abs(ly) <= b.h * 0.5 + margin;
  }

  function supportPoint(b, dx, dy) {
    var pts = b.corners();
    var best = pts[0], bestD = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = (pts[i].x - b.x) * dx + (pts[i].y - b.y) * dy;
      if (d > bestD) { bestD = d; best = pts[i]; }
    }
    return best;
  }

  function manifold(a, b, nx, ny, points) {
    return { a: a, b: b, nx: nx, ny: ny, points: points };
  }

  function collideCircleCircle(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var rsum = a.r + b.r;
    if (d >= rsum + MARGIN) { return null; }
    var nx, ny;
    if (d < 1e-6) { nx = 1; ny = 0; d = 0.0001; } else { nx = dx / d; ny = dy / d; }
    var pen = Math.max(0, rsum - d);
    var px = a.x + nx * (a.r - pen * 0.5);
    var py = a.y + ny * (a.r - pen * 0.5);
    return manifold(a, b, nx, ny, [{ x: px, y: py, pen: pen }]);
  }

  // normal points from circle `c` to box `bx`
  function collideCircleBox(c, bx) {
    var cs = Math.cos(bx.angle), sn = Math.sin(bx.angle);
    var dx = c.x - bx.x, dy = c.y - bx.y;
    var lx = dx * cs + dy * sn;
    var ly = -dx * sn + dy * cs;
    var hw = bx.w * 0.5, hh = bx.h * 0.5;
    var qx = clamp(lx, -hw, hw);
    var qy = clamp(ly, -hh, hh);
    var inside = (qx === lx && qy === ly);
    var lnx, lny, pen, conx, cony;

    if (inside) {
      var dxr = hw - Math.abs(lx);
      var dyr = hh - Math.abs(ly);
      if (dxr < dyr) {
        lnx = lx < 0 ? -1 : 1; lny = 0;
        pen = dxr + c.r;
        conx = lx < 0 ? -hw : hw; cony = ly;
      } else {
        lnx = 0; lny = ly < 0 ? -1 : 1;
        pen = dyr + c.r;
        conx = lx; cony = ly < 0 ? -hh : hh;
      }
    } else {
      var ex = lx - qx, ey = ly - qy;
      var d = Math.sqrt(ex * ex + ey * ey);
      if (d > c.r + MARGIN) { return null; }
      if (d < 1e-6) { lnx = 0; lny = -1; d = 0.0001; } else { lnx = ex / d; lny = ey / d; }
      pen = Math.max(0, c.r - d);
      conx = qx; cony = qy;
    }

    var wnx = lnx * cs - lny * sn;
    var wny = lnx * sn + lny * cs;
    var px = bx.x + conx * cs - cony * sn;
    var py = bx.y + conx * sn + cony * cs;
    // (wnx, wny) points from the box surface towards the circle, and the
    // manifold normal must run from a (the circle) to b (the box).
    return manifold(c, bx, -wnx, -wny, [{ x: px, y: py, pen: pen }]);
  }

  function collideBoxBox(a, b) {
    var axes = [
      { x: Math.cos(a.angle), y: Math.sin(a.angle) },
      { x: -Math.sin(a.angle), y: Math.cos(a.angle) },
      { x: Math.cos(b.angle), y: Math.sin(b.angle) },
      { x: -Math.sin(b.angle), y: Math.cos(b.angle) }
    ];
    var bestOverlap = Infinity, bestAxis = null;
    for (var i = 0; i < axes.length; i++) {
      var ax = axes[i].x, ay = axes[i].y;
      var pa = projectBox(a, ax, ay);
      var pb = projectBox(b, ax, ay);
      var overlap = Math.min(pa[1], pb[1]) - Math.max(pa[0], pb[0]);
      if (overlap <= -MARGIN) { return null; }
      if (overlap < bestOverlap) { bestOverlap = overlap; bestAxis = { x: ax, y: ay }; }
    }
    var nx = bestAxis.x, ny = bestAxis.y;
    if ((b.x - a.x) * nx + (b.y - a.y) * ny < 0) { nx = -nx; ny = -ny; }
    var depth = Math.max(0, bestOverlap);

    var pts = [];
    var ca = a.corners(), cb = b.corners(), i2;
    for (i2 = 0; i2 < 4; i2++) {
      if (pointInBox(ca[i2].x, ca[i2].y, b, 0.25)) {
        pts.push({ x: ca[i2].x, y: ca[i2].y, pen: depth });
      }
    }
    for (i2 = 0; i2 < 4; i2++) {
      if (pointInBox(cb[i2].x, cb[i2].y, a, 0.25)) {
        pts.push({ x: cb[i2].x, y: cb[i2].y, pen: depth });
      }
    }
    if (!pts.length) {
      var sa = supportPoint(a, nx, ny);
      var sb = supportPoint(b, -nx, -ny);
      pts.push({ x: (sa.x + sb.x) * 0.5, y: (sa.y + sb.y) * 0.5, pen: depth });
    }
    return manifold(a, b, nx, ny, pts);
  }

  function collide(a, b) {
    if (a.type === 'circle' && b.type === 'circle') { return collideCircleCircle(a, b); }
    if (a.type === 'circle' && b.type === 'box') { return collideCircleBox(a, b); }
    if (a.type === 'box' && b.type === 'circle') {
      var m = collideCircleBox(b, a);
      if (!m) { return null; }
      return manifold(a, b, -m.nx, -m.ny, m.points);
    }
    return collideBoxBox(a, b);
  }

  // ------------------------------------------------------------------ world

  function World(opts) {
    opts = opts || {};
    this.gravity = { x: 0, y: opts.gravityY == null ? 1500 : opts.gravityY };
    this.bodies = [];
    this.contacts = [];
    this.staticBodies = [];
    this.bounds = opts.bounds || { minX: -400, maxX: 1700, minY: -1200, maxY: 1200 };
    this.time = 0;
    this.onImpact = null;
    this.cache = {};
    this._nextId = 1;
  }

  World.prototype.add = function (body) {
    body.id = this._nextId++;
    this.bodies.push(body);
    if (body.isStatic) { this.staticBodies.push(body); }
    return body;
  };

  World.prototype.remove = function (body) {
    var i = this.bodies.indexOf(body);
    if (i !== -1) { this.bodies.splice(i, 1); }
    if (body.isStatic) {
      var j = this.staticBodies.indexOf(body);
      if (j !== -1) { this.staticBodies.splice(j, 1); }
    }
    body.alive = false;
  };

  World.prototype.clear = function () {
    this.bodies.length = 0;
    this.staticBodies.length = 0;
    this.contacts.length = 0;
    this.cache = {};
    this.time = 0;
  };

  World.prototype.wakeNear = function (x, y, radius) {
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.isStatic || b.awake) { continue; }
      var dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy < radius * radius) { b.wake(); }
    }
  };

  World.prototype.buildContacts = function () {
    var out = [];
    var bodies = this.bodies;
    for (var i = 0; i < bodies.length; i++) {
      var a = bodies[i];
      if (!a.alive) { continue; }
      var ba = a.aabb();
      for (var j = i + 1; j < bodies.length; j++) {
        var b = bodies[j];
        if (!b.alive) { continue; }
        if (a.isStatic && b.isStatic) { continue; }
        if (!a.awake && !b.awake) { continue; }
        var bb = b.aabb();
        if (ba.maxX < bb.minX || ba.minX > bb.maxX || ba.maxY < bb.minY || ba.minY > bb.maxY) { continue; }
        var m = collide(a, b);
        if (!m) { continue; }
        // wake sleepers that get touched by something moving
        if (!a.awake && (b.speed() > 25 || Math.abs(b.av) > 0.4)) { a.wake(); }
        if (!b.awake && (a.speed() > 25 || Math.abs(a.av) > 0.4)) { b.wake(); }

        var key = a.id < b.id ? (a.id + ':' + b.id) : (b.id + ':' + a.id);
        var old = this.cache[key];
        m.key = key;
        for (var k = 0; k < m.points.length; k++) {
          var np = m.points[k];
          np.accN = 0;
          np.accT = 0;
          if (old && old.a === a && old.b === b && old.points) {
            // carry the impulse over from the previous step (warm starting)
            var best = null, bestD = 36;
            for (var q = 0; q < old.points.length; q++) {
              var op = old.points[q];
              if (op.used) { continue; }
              var dxp = op.x - np.x, dyp = op.y - np.y;
              var d2 = dxp * dxp + dyp * dyp;
              if (d2 < bestD) { bestD = d2; best = op; }
            }
            if (best) {
              best.used = true;
              np.accN = best.accN;
              np.accT = best.accT;
            }
          }
        }
        out.push(m);
      }
    }
    return out;
  };

  World.prototype.storeContacts = function () {
    var nc = {};
    for (var i = 0; i < this.contacts.length; i++) {
      var c = this.contacts[i];
      var pts = [];
      for (var k = 0; k < c.points.length; k++) {
        var p = c.points[k];
        pts.push({ x: p.x, y: p.y, accN: p.accN, accT: p.accT });
      }
      nc[c.key] = { a: c.a, b: c.b, points: pts };
    }
    this.cache = nc;
  };

  World.prototype.solveContacts = function (dt) {
    var contacts = this.contacts, ci, pi, c, a, b, p;
    // warm start — replay last step's impulses so stacks converge immediately
    for (ci = 0; ci < contacts.length; ci++) {
      c = contacts[ci];
      a = c.a; b = c.b;
      var wtx = -c.ny, wty = c.nx;
      for (pi = 0; pi < c.points.length; pi++) {
        p = c.points[pi];
        if (!p.accN && !p.accT) { continue; }
        var jx = c.nx * p.accN + wtx * p.accT;
        var jy = c.ny * p.accN + wty * p.accT;
        var wrax = p.x - a.x, wray = p.y - a.y;
        var wrbx = p.x - b.x, wrby = p.y - b.y;
        a.vx -= jx * a.invMass; a.vy -= jy * a.invMass;
        a.av -= (wrax * jy - wray * jx) * a.invI;
        b.vx += jx * b.invMass; b.vy += jy * b.invMass;
        b.av += (wrbx * jy - wrby * jx) * b.invI;
      }
    }
    for (var it = 0; it < ITERATIONS; it++) {
      // pass 1 — normal impulses for every contact point
      for (ci = 0; ci < contacts.length; ci++) {
        c = contacts[ci];
        a = c.a; b = c.b;
        var nx = c.nx, ny = c.ny;
        for (pi = 0; pi < c.points.length; pi++) {
          p = c.points[pi];
          var rax = p.x - a.x, ray = p.y - a.y;
          var rbx = p.x - b.x, rby = p.y - b.y;
          var rvx = (b.vx - b.av * rby) - (a.vx - a.av * ray);
          var rvy = (b.vy + b.av * rbx) - (a.vy + a.av * rax);

          var rna = rax * ny - ray * nx;
          var rnb = rbx * ny - rby * nx;
          var invSum = a.invMass + b.invMass + rna * rna * a.invI + rnb * rnb * b.invI;
          if (invSum <= 0) { continue; }

          var vn = rvx * nx + rvy * ny;
          var e = Math.max(a.restitution, b.restitution);
          if (Math.abs(vn) < 60) { e *= 0.2; }

          var bias = BAUMGARTE * Math.max(0, p.pen - SLOP) / dt;
          var lambda = (-(1 + e) * vn + bias) / invSum;

          var oldN = p.accN;
          p.accN = Math.max(0, oldN + lambda);
          var jn = p.accN - oldN;
          if (jn !== 0) {
            a.vx -= nx * jn * a.invMass; a.vy -= ny * jn * a.invMass; a.av -= rna * jn * a.invI;
            b.vx += nx * jn * b.invMass; b.vy += ny * jn * b.invMass; b.av += rnb * jn * b.invI;
          }

          if (vn < -20 && p.accN > 0) {
            var effMass = 1 / invSum;
            var power = -vn * Math.sqrt(effMass);
            if (power > a.impact) { a.impact = power; }
            if (power > b.impact) { b.impact = power; }
          }
        }
      }

      // pass 2 — friction, using the post-normal-impulse velocities so the
      // spin created by one contact point does not leak into the next.
      for (ci = 0; ci < contacts.length; ci++) {
        c = contacts[ci];
        a = c.a; b = c.b;
        var nx2 = c.nx, ny2 = c.ny;
        var tx = -ny2, ty = nx2;
        for (pi = 0; pi < c.points.length; pi++) {
          p = c.points[pi];
          if (p.accN <= 0) { continue; }
          var rax2 = p.x - a.x, ray2 = p.y - a.y;
          var rbx2 = p.x - b.x, rby2 = p.y - b.y;
          var rvx2 = (b.vx - b.av * rby2) - (a.vx - a.av * ray2);
          var rvy2 = (b.vy + b.av * rbx2) - (a.vy + a.av * rax2);
          var vt = rvx2 * tx + rvy2 * ty;
          if (Math.abs(vt) < 1e-4) { continue; }
          var rta = rax2 * ty - ray2 * tx;
          var rtb = rbx2 * ty - rby2 * tx;
          var invSumT = a.invMass + b.invMass + rta * rta * a.invI + rtb * rtb * b.invI;
          if (invSumT <= 0) { continue; }
          var mu = Math.sqrt(a.friction * b.friction);
          var maxF = mu * p.accN;
          var oldT = p.accT;
          p.accT = clamp(oldT + (-vt / invSumT), -maxF, maxF);
          var jt = p.accT - oldT;
          if (jt !== 0) {
            a.vx -= tx * jt * a.invMass; a.vy -= ty * jt * a.invMass; a.av -= rta * jt * a.invI;
            b.vx += tx * jt * b.invMass; b.vy += ty * jt * b.invMass; b.av += rtb * jt * b.invI;
          }
        }
      }
    }
  };

  World.prototype.correctPositions = function () {
    for (var it = 0; it < POS_ITERATIONS; it++) {
      for (var ci = 0; ci < this.contacts.length; ci++) {
        var c = this.contacts[ci];
        var a = c.a, b = c.b;
        var sum = a.invMass + b.invMass;
        if (sum <= 0) { continue; }
        var share = c.points.length > 1 ? (1 / c.points.length) * 1.4 : 1;
        for (var pi = 0; pi < c.points.length; pi++) {
          var pen = c.points[pi].pen;
          if (pen <= SLOP) { continue; }
          var corr = (pen - SLOP) * POS_PERCENT * share / sum;
          if (!a.isStatic) { a.x -= c.nx * corr * a.invMass; a.y -= c.ny * corr * a.invMass; }
          if (!b.isStatic) { b.x += c.nx * corr * b.invMass; b.y += c.ny * corr * b.invMass; }
        }
      }
    }
  };

  World.prototype.update = function (dt) {
    if (!(dt > 0)) { return; }
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    var bodies = this.bodies, i;

    for (i = 0; i < bodies.length; i++) {
      bodies[i].impact = 0;
    }

    for (i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (!b.alive || b.isStatic || !b.awake) { continue; }
      b.vy += this.gravity.y * dt;
      b.vx += this.gravity.x * dt;
      var sp = b.speed();
      if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
    }

    this.contacts = this.buildContacts();
    this.solveContacts(dt);
    this.storeContacts();

    for (i = 0; i < bodies.length; i++) {
      var body = bodies[i];
      if (!body.alive || body.isStatic || !body.awake) { continue; }
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.av * dt;
      if (body.y > this.bounds.maxY) {
        body.x = clamp(body.x, this.bounds.minX, this.bounds.maxX);
      }
    }

    this.correctPositions();

    for (i = 0; i < bodies.length; i++) {
      var s = bodies[i];
      if (!s.alive || s.isStatic || !s.awake) { continue; }
      if (s.speed() < SLEEP_LINEAR && Math.abs(s.av) < SLEEP_ANGULAR) {
        s.sleepTimer += dt;
        if (s.sleepTimer > SLEEP_TIME) { s.sleep(); }
      } else {
        s.sleepTimer = 0;
        if (s.speed() < 0.02 && Math.abs(s.av) < 0.001) { s.vx = 0; s.vy = 0; s.av = 0; }
      }
      s.lastImpact = s.impact;
    }
  };

  World.prototype.eachContact = function (fn) {
    for (var i = 0; i < this.contacts.length; i++) { fn(this.contacts[i]); }
  };

  World.prototype.anyAwake = function (threshold) {
    threshold = threshold || 0;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.isStatic) { continue; }
      if (b.awake && (b.speed() > threshold || Math.abs(b.av) > 0.3)) { return true; }
    }
    return false;
  };

  World.prototype.maxSpeed = function () {
    var m = 0;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.isStatic) { continue; }
      var s = b.speed();
      if (s > m) { m = s; }
    }
    return m;
  };

  return {
    Body: Body,
    World: World,
    collide: collide,
    version: '1.0.0'
  };
}));








