/*!
 * BYTELAB Pixel Siege — game rules (no DOM)
 */
(function (root, factory) {
  'use strict';
  var api = factory(root.BYTELAB_Physics, root.BYTELAB_Levels);
  root.BYTELAB_Sim = api;
  if (typeof module === 'object' && module.exports) { module.exports = api; }
}(typeof window !== 'undefined' ? window : globalThis, function (Physics, Levels) {
  'use strict';

  var GROUND = Levels.GROUND;
  var SLING = Levels.SLING;
  var MAX_PULL = 118;
  var LAUNCH_K = 10.6;
  var GRAVITY = 1500;

  var MATERIALS = {
    panel: { fill: '#141B34', stroke: '#67E8F9', hp: 2.0, toughness: 1700, density: 0.0055, score: 100, debris: '#67E8F9' },
    wall: { fill: '#F8FAFC', stroke: '#0B1020', hp: 2.4, toughness: 2400, density: 0.0072, score: 150, debris: '#F8FAFC' },
    glass: { fill: '#22D3EE', stroke: '#0B1020', hp: 1, toughness: 900, density: 0.0032, score: 80, debris: '#22D3EE' },
    deep: { fill: '#0891B2', stroke: '#67E8F9', hp: 1.6, toughness: 1500, density: 0.0046, score: 90, debris: '#0891B2' }
  };

  var BIRDS = {
    byte: { r: 20, density: 0.024, fill: '#22D3EE', accent: '#F8FAFC' },
    bolt: { r: 18, density: 0.02, fill: '#67E8F9', accent: '#0B1020' },
    spark: { r: 22, density: 0.03, fill: '#F59E0B', accent: '#0B1020' }
  };

  var BUG = { r: 20, hp: 1, toughness: 700, density: 0.0042, score: 400 };
  var SCORE_BLOCK = 'block';
  var BONUS_BIRD = 800;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dist2(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  }

  function Game(levelIndex, options) {
    options = options || {};
    this.seed = options.seed || 20260101;
    this.rng = mulberry32(this.seed);
    this.events = [];
    this.muted = !!options.muted;
    this.setLevel(levelIndex || 0);
  }

  Game.prototype.setLevel = function (index) {
    this.levelIndex = Math.max(0, Math.min(Levels.levels.length - 1, index | 0));
    this.level = Levels.levels[this.levelIndex];
    this.world = new Physics.World({
      gravityY: GRAVITY,
      bounds: { minX: -400, maxX: 1800, minY: -1200, maxY: 980 }
    });
    this.world.add(new Physics.Body({
      type: 'box', x: 640, y: GROUND + 300, w: 4200, h: 600,
      'static': true, friction: 0.92, restitution: 0, kind: 'ground'
    }));

    this.blocks = [];
    this.bugs = [];
    this.blockBodies = [];
    this.bugBodies = [];
    this.bird = null;
    this.queue = this.level.birds.slice();
    this.score = 0;
    this.shots = 0;
    this.stars = 0;
    this.phase = 'ready';
    this.settleTimer = 0;
    this.shotTimer = 0;
    this.idleTimer = 0;
    this.aim = { active: false, x: SLING.x, y: SLING.y, power: 0, angle: 0 };
    this.abilityUsed = false;
    this.totalBugs = this.level.bugs.length;
    this.totalBlocks = this.level.blocks.length;
    this.bugsLeft = this.totalBugs;
    this.blocksLeft = this.totalBlocks;
    this.events.length = 0;
    this.time = 0;

    var i;
    for (i = 0; i < this.level.blocks.length; i++) {
      var spec = this.level.blocks[i];
      var mat = MATERIALS[spec.m] || MATERIALS.panel;
      var body = new Physics.Body({
        type: 'box', x: spec.x, y: spec.y, w: spec.w, h: spec.h,
        density: mat.density, friction: 0.78, restitution: 0.02,
        kind: 'block', material: spec.m || 'panel',
        hp: mat.hp, toughness: mat.toughness
      });
      body.def = spec;
      body.mat = mat;
      body.maxHp = mat.hp;
      this.world.add(body);
      this.blocks.push(body);
      this.blockBodies.push(body);
    }

    for (i = 0; i < this.level.bugs.length; i++) {
      var bs = this.level.bugs[i];
      var bugBody = new Physics.Body({
        type: 'circle', x: bs.x, y: bs.y, r: bs.r || BUG.r,
        density: BUG.density, friction: 0.7, restitution: 0.05,
        kind: 'bug', hp: BUG.hp, toughness: BUG.toughness
      });
      bugBody.maxHp = BUG.hp;
      this.world.add(bugBody);
      this.bugs.push(bugBody);
      this.bugBodies.push(bugBody);
    }

    this.loadBird();
    return this;
  };

  Game.prototype.loadBird = function () {
    if (!this.queue.length) { this.birdType = null; return; }
    this.birdType = this.queue[0];
    this.abilityUsed = false;
    this.aim.active = false;
    this.aim.x = SLING.x;
    this.aim.y = SLING.y;
    this.aim.power = 0;
  };

  Game.prototype.birdsRemaining = function () {
    return this.queue.length;
  };

  Game.prototype.aimStart = function (wx, wy) {
    if (this.phase !== 'ready' || !this.birdType) { return false; }
    var b = BIRDS[this.birdType];
    var reach = b.r + 46;
    if (dist2(wx, wy, SLING.x, SLING.y) > reach * reach) {
      // allow grabbing anywhere close to the sling band
      if (dist2(wx, wy, SLING.x, SLING.y) > 150 * 150) { return false; }
    }
    this.aim.active = true;
    this.aimMove(wx, wy);
    return true;
  };

  Game.prototype.aimMove = function (wx, wy) {
    if (!this.aim.active) { return; }
    var dx = wx - SLING.x;
    var dy = wy - SLING.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAX_PULL) { dx = dx / len * MAX_PULL; dy = dy / len * MAX_PULL; len = MAX_PULL; }
    this.aim.x = SLING.x + dx;
    this.aim.y = SLING.y + dy;
    this.aim.power = len / MAX_PULL;
    this.aim.angle = Math.atan2(-dy, -dx);
  };

  Game.prototype.aimCancel = function () {
    this.aim.active = false;
    this.aim.x = SLING.x;
    this.aim.y = SLING.y;
    this.aim.power = 0;
  };

  Game.prototype.launchVelocity = function () {
    var dx = SLING.x - this.aim.x;
    var dy = SLING.y - this.aim.y;
    return { x: dx * LAUNCH_K, y: dy * LAUNCH_K };
  };

  Game.prototype.aimEnd = function () {
    if (!this.aim.active) { return false; }
    if (this.aim.power < 0.09 || this.phase !== 'ready' || !this.birdType) {
      this.aimCancel();
      return false;
    }
    var v = this.launchVelocity();
    var type = this.birdType;
    var spec = BIRDS[type];
    var body = new Physics.Body({
      type: 'circle', x: this.aim.x, y: this.aim.y, r: spec.r,
      density: spec.density, friction: 0.6, restitution: 0.24,
      kind: 'bird', material: type,
      hp: 999, toughness: 1e9
    });
    body.vx = v.x;
    body.vy = v.y;
    body.birdType = type;
    this.world.add(body);
    this.bird = body;
    this.queue.shift();
    this.shots += 1;
    this.aim.active = false;
    this.phase = 'flying';
    this.shotTimer = 0;
    this.idleTimer = 0;
    this.events.push({ type: 'launch', x: this.aim.x, y: this.aim.y, bird: type, power: this.aim.power });
    return true;
  };

  Game.prototype.useAbility = function () {
    if (this.phase !== 'flying' || !this.bird || this.abilityUsed) { return false; }
    var type = this.bird.birdType;
    if (type === 'bolt') {
      this.abilityUsed = true;
      var sp = this.bird.speed();
      if (sp > 40) {
        var k = Math.min(2.0, 2300 / Math.max(sp, 1));
        this.bird.vx *= k;
        this.bird.vy *= k;
      }
      this.events.push({ type: 'dash', x: this.bird.x, y: this.bird.y });
      return true;
    }
    if (type === 'spark') {
      this.abilityUsed = true;
      this.explode(this.bird.x, this.bird.y, 190, 2600);
      return true;
    }
    return false;
  };

  Game.prototype.explode = function (x, y, radius, power) {
    this.events.push({ type: 'boom', x: x, y: y, r: radius });
    this.world.wakeNear(x, y, radius * 2.2);
    var bodies = this.world.bodies.slice();
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || !b.alive) { continue; }
      var dx = b.x - x, dy = b.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > radius || d < 0.001) { continue; }
      var falloff = 1 - d / radius;
      var nx = dx / d, ny = dy / d;
      var imp = power * falloff;
      b.wake();
      b.vx += nx * imp * b.invMass;
      b.vy += ny * imp * b.invMass - imp * 0.35 * b.invMass;
      b.av += (this.rng() - 0.5) * 6 * falloff;
      if (b.kind === 'block' || b.kind === 'bug') {
        b.hp -= falloff * 2.4;
        if (b.hp <= 0) { this.destroy(b, true); }
        else { this.events.push({ type: 'crack', x: b.x, y: b.y, power: falloff }); }
      }
    }
  };

  Game.prototype.destroy = function (body, silent) {
    if (!body.alive) { return; }
    this.world.remove(body);
    if (body.kind === 'block') {
      this.blocksLeft = Math.max(0, this.blocksLeft - 1);
      this.score += body.mat ? body.mat.score : 100;
      this.events.push({
        type: 'break', x: body.x, y: body.y, w: body.w, h: body.h,
        color: body.mat ? body.mat.debris : '#67E8F9', power: silent ? 0.6 : 1
      });
      this.events.push({ type: 'shake', power: 0.35 });
    } else if (body.kind === 'bug') {
      this.bugsLeft = Math.max(0, this.bugsLeft - 1);
      this.score += BUG.score;
      this.events.push({ type: 'pop', x: body.x, y: body.y, r: body.r });
      this.events.push({ type: 'shake', power: 0.5 });
    }
  };

  Game.prototype.applyDamage = function () {
    var all = this.blockBodies.concat(this.bugBodies);
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      if (!b.alive) { continue; }
      var imp = b.impact;
      if (!(imp > 0)) { continue; }
      if (imp <= b.toughness * 0.2) { continue; }
      var dmg = imp / b.toughness;
      b.hp -= dmg;
      if (b.hp <= 0) {
        this.destroy(b, false);
      } else {
        this.events.push({ type: 'crack', x: b.x, y: b.y, power: Math.min(1, dmg) });
        this.events.push({ type: 'shake', power: 0.12 });
      }
    }
  };

  Game.prototype.pruneOutOfBounds = function () {
    var bodies = this.world.bodies.slice();
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.isStatic || !b.alive) { continue; }
      if (b.y > 1000 || b.x < -500 || b.x > 1900) {
        if (b.kind === 'bird') {
          this.world.remove(b);
          if (this.bird === b) { this.bird = null; }
        } else if (b.kind === 'block') {
          this.destroy(b, true);
        } else if (b.kind === 'bug') {
          this.destroy(b, true);
        }
      }
    }
  };

  Game.prototype.endShot = function () {
    if (this.bird) {
      this.events.push({ type: 'fade', x: this.bird.x, y: this.bird.y });
      this.world.remove(this.bird);
      this.bird = null;
    }
    this.phase = 'settling';
    this.settleTimer = 0;
  };

  Game.prototype.afterShot = function () {
    if (this.bugsLeft <= 0) {
      this.win();
      return;
    }
    if (!this.queue.length) {
      this.lose();
      return;
    }
    this.loadBird();
    this.phase = 'ready';
  };

  Game.prototype.win = function () {
    if (this.phase === 'won') { return; }
    var bonus = this.queue.length * BONUS_BIRD;
    this.score += bonus;
    this.stars = 1;
    if (this.score >= this.level.stars[1]) { this.stars = 3; }
    else if (this.score >= this.level.stars[0]) { this.stars = 2; }
    this.birdBonus = bonus;
    this.phase = 'won';
    this.events.push({ type: 'win', stars: this.stars, score: this.score });
  };

  Game.prototype.lose = function () {
    if (this.phase === 'lost') { return; }
    this.phase = 'lost';
    this.events.push({ type: 'lose', score: this.score });
  };

  Game.prototype.restart = function () {
    var idx = this.levelIndex;
    this.rng = mulberry32(this.seed);
    this.setLevel(idx);
    this.events.push({ type: 'restart' });
    return this;
  };

  Game.prototype.nextLevel = function () {
    if (this.levelIndex + 1 >= Levels.levels.length) { return false; }
    this.setLevel(this.levelIndex + 1);
    return true;
  };

  Game.prototype.busy = function () {
    return this.world.maxSpeed() > 26;
  };

  Game.prototype.update = function (dt) {
    if (!(dt > 0)) { return; }
    this.time += dt;
    this.world.update(dt);
    this.applyDamage();
    this.pruneOutOfBounds();

    if (this.phase === 'flying') {
      this.shotTimer += dt;
      var sp = this.bird ? this.bird.speed() : 0;
      if (!this.bird) {
        this.endShot();
      } else if (this.shotTimer > 6.5) {
        this.endShot();
      } else if (sp < 26) {
        this.idleTimer += dt;
        if (this.idleTimer > 0.7) { this.endShot(); }
      } else {
        this.idleTimer = 0;
      }
    } else if (this.phase === 'settling') {
      this.settleTimer += dt;
      if ((this.settleTimer > 0.3 && !this.busy()) || this.settleTimer > 2.8) {
        this.afterShot();
      }
    }
  };

  Game.prototype.drainEvents = function () {
    var out = this.events;
    this.events = [];
    return out;
  };

  Game.prototype.progress = function () {
    var total = this.totalBlocks + this.totalBugs;
    if (!total) { return 0; }
    return (this.totalBlocks - this.blocksLeft + this.totalBugs - this.bugsLeft) / total;
  };

  return {
    Game: Game,
    MATERIALS: MATERIALS,
    BIRDS: BIRDS,
    BUG: BUG,
    BONUS_BIRD: BONUS_BIRD,
    MAX_PULL: MAX_PULL,
    LAUNCH_K: LAUNCH_K,
    GRAVITY: GRAVITY,
    create: function (i, opts) { return new Game(i, opts); }
  };
}));


